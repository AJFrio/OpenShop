/** Persist the admin home agent transcript and recent prompts. */

export const AGENT_SESSION_KEY = 'openshop.admin.agent.session'
const MAX_MESSAGES = 50
const MAX_RECENT = 8
const MAX_CONTENT = 4000

function defaultSession() {
  return { messages: [], recent: [] }
}

function getDefaultStorage() {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    /* private mode / non-browser */
  }
  return null
}

function sanitizeMessage(message) {
  if (!message || (message.role !== 'user' && message.role !== 'assistant')) return null
  const actions = Array.isArray(message.actions)
    ? message.actions.map((action) => ({
        ok: Boolean(action?.ok),
        summary: String(action?.summary || action?.tool || ''),
        tool: action?.tool ? String(action.tool) : undefined,
      }))
    : undefined
  return {
    role: message.role,
    content: String(message.content || '').slice(0, MAX_CONTENT),
    actions,
    at: Number(message.at) || Date.now(),
  }
}

function sanitizeRecent(entry) {
  if (!entry) return null
  const preview = String(entry.preview || '').trim()
  if (!preview) return null
  return {
    id: String(entry.id || entry.at || Date.now()),
    preview: preview.slice(0, 120),
    updatedAt: Number(entry.updatedAt) || Date.now(),
    messageCount: Number(entry.messageCount) || 0,
  }
}

export function loadAgentSession(storage = getDefaultStorage()) {
  if (!storage?.getItem) return defaultSession()
  try {
    const raw = storage.getItem(AGENT_SESSION_KEY)
    if (!raw) return defaultSession()
    const data = JSON.parse(raw)
    return {
      messages: Array.isArray(data.messages)
        ? data.messages.map(sanitizeMessage).filter(Boolean)
        : [],
      recent: Array.isArray(data.recent)
        ? data.recent.map(sanitizeRecent).filter(Boolean).slice(0, MAX_RECENT)
        : [],
    }
  } catch {
    return defaultSession()
  }
}

export function saveAgentSession({ messages = [], recent = [] }, storage = getDefaultStorage()) {
  if (!storage?.setItem) return
  const payload = {
    messages: messages.map(sanitizeMessage).filter(Boolean).slice(-MAX_MESSAGES),
    recent: recent.map(sanitizeRecent).filter(Boolean).slice(0, MAX_RECENT),
    updatedAt: Date.now(),
  }
  try {
    storage.setItem(AGENT_SESSION_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function archiveThread(messages = [], recent = []) {
  const firstUser = messages.find((message) => message.role === 'user' && message.content)
  if (!firstUser) return recent
  const entry = {
    id: String(firstUser.at || Date.now()),
    preview: String(firstUser.content).replace(/\s+/g, ' ').trim().slice(0, 120),
    updatedAt: Date.now(),
    messageCount: messages.length,
  }
  return [entry, ...recent.filter((item) => item.preview !== entry.preview)].slice(0, MAX_RECENT)
}
