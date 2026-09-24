// Admin agent routes - AI assistant backed by OpenRouter that can manage
// the full admin surface by calling existing admin endpoints in-process.
import { Hono } from 'hono'
import { asyncHandler } from '../../middleware/errorHandler.js'
import { ValidationError } from '../../utils/errors.js'
import { resolveSetting } from '../../services/DeveloperSettingsService.js'
import { getKVNamespace } from '../../utils/kv.js'
import {
  TOOL_DEFINITIONS,
  MAX_TOOL_ITERATIONS,
  buildSystemPrompt,
  executeAgentTool,
  summarizeResult,
} from './agentTools.js'

const router = new Hono()

// Reference to the main Hono app, set during route registration so the agent
// can invoke existing admin endpoints in-process (keeps Stripe sync,
// validation, and product limits consistent with the normal admin flows).
let appRef = null

export function setAgentApp(app) {
  appRef = app
}

export { summarizeResult, TOOL_DEFINITIONS }

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'z-ai/glm-5.3-flash'

/**
 * Invoke an internal endpoint on the main app, forwarding the caller's admin
 * token so global auth middleware still applies.
 */
async function dispatchFrom(c, path, init = {}) {
  if (!appRef) {
    throw new Error('Agent app reference not initialized')
  }

  const headers = new Headers(init.headers || {})
  headers.set('X-Admin-Token', c.req.header('X-Admin-Token') || '')
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await appRef.request(path, { ...init, headers }, c.env, c.executionCtx)
  const text = await res.text()
  let body = null
  try {
    body = JSON.parse(text)
  } catch {}

  return { status: res.status, ok: res.ok, body }
}

async function openRouterBase(env) {
  const override = env?.OPENROUTER_BASE
  if (typeof override === 'string' && override.trim()) {
    return override.trim().replace(/\/$/, '')
  }
  return OPENROUTER_BASE
}

async function callOpenRouter(apiKey, model, messages, env) {
  const res = await fetch(`${await openRouterBase(env)}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOL_DEFINITIONS,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('OpenRouter API error', res.status, errText)
    throw new Error(`OpenRouter API failed (${res.status}): ${errText.slice(0, 500)}`)
  }

  return await res.json()
}

// GET /api/admin/agent/models - list available OpenRouter models
router.get('/models', asyncHandler(async (c) => {
  const apiKey = await resolveSetting(getKVNamespace(c.env), c.env, 'OPENROUTER_API_KEY')
  if (!apiKey) {
    return c.json({ models: [], defaultModel: DEFAULT_MODEL, configured: false })
  }

  const res = await fetch(`${await openRouterBase(c.env)}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!res.ok) {
    console.error('OpenRouter models error', res.status)
    return c.json({ models: [], defaultModel: DEFAULT_MODEL, configured: true })
  }

  const data = await res.json()
  const models = (data?.data || [])
    .map((m) => ({ id: m.id, name: m.name || m.id }))
    .sort((x, y) => x.id.localeCompare(y.id))

  return c.json({
    models,
    defaultModel: (await resolveSetting(getKVNamespace(c.env), c.env, 'OPENROUTER_MODEL')) || DEFAULT_MODEL,
    configured: true,
  })
}))

// POST /api/admin/agent/chat - send a conversation, get the agent's reply
router.post('/chat', asyncHandler(async (c) => {
  const apiKey = await resolveSetting(getKVNamespace(c.env), c.env, 'OPENROUTER_API_KEY')
  if (!apiKey) {
    throw new ValidationError('OpenRouter API key not configured. Add it in Developer Settings.')
  }

  const { messages, model, references } = await c.req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError('messages must be a non-empty array')
  }

  // Reference images are held on the request, not put in the model's context:
  // the tool reads them when it runs. Sending base64 through the chat history
  // would blow the context window and cost a fortune for no benefit.
  if (references && typeof references === 'object') {
    c.set('merchReferences', references)
  }

  const history = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-30)
    .map((m) => ({ role: m.role, content: m.content }))

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    throw new ValidationError('Last message must be from the user')
  }

  const selectedModel = typeof model === 'string' && model.trim() ? model.trim() : ((await resolveSetting(getKVNamespace(c.env), c.env, 'OPENROUTER_MODEL')) || DEFAULT_MODEL)

  const chatMessages = [
    {
      role: 'system',
      content: buildSystemPrompt({
        hasReferences: Boolean(references && Object.keys(references).length > 0),
      }),
    },
    ...history,
  ]
  const actions = []
  const dispatch = (path, init) => dispatchFrom(c, path, init)

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const completion = await callOpenRouter(apiKey, selectedModel, chatMessages, c.env)
    const choice = completion?.choices?.[0]?.message

    if (!choice) {
      throw new Error('OpenRouter returned no message')
    }

    chatMessages.push(choice)

    const toolCalls = Array.isArray(choice.tool_calls) ? choice.tool_calls : []
    if (toolCalls.length === 0) {
      return c.json({ message: choice.content || '', model: selectedModel, actions })
    }

    for (const call of toolCalls) {
      const name = call?.function?.name
      let args = {}
      try {
        args = call?.function?.arguments ? JSON.parse(call.function.arguments) : {}
      } catch {}

      const action = { tool: name, args }
      try {
        const result = await executeAgentTool(c, name, args, dispatch)

        action.ok = result.status < 400
        action.summary = summarizeResult(action, { ...result, ok: action.ok })
        chatMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result.data ?? { status: result.status }).slice(0, 24000),
        })
      } catch (err) {
        action.ok = false
        action.summary = `Failed: ${err.message}`
        chatMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ error: err.message }),
        })
      }
      actions.push(action)
    }
  }

  // Tool loop budget exhausted - ask for a direct answer without tools.
  const completion = await callOpenRouter(apiKey, selectedModel, [
    ...chatMessages,
    { role: 'user', content: 'Stop using tools and give your final answer now.' },
  ], c.env)
  const finalMessage = completion?.choices?.[0]?.message?.content || ''
  return c.json({ message: finalMessage, model: selectedModel, actions })
}))

export default router
