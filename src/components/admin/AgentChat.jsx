import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { adminAPI } from '../../api/admin'
import {
  archiveThread,
  loadAgentSession,
  saveAgentSession,
} from '../../lib/agentThread'
import {
  Bot,
  Send,
  Wrench,
  AlertCircle,
  ImagePlus,
  X,
  Sparkles,
  Plus,
  Palette,
  Megaphone,
  ShoppingBag,
  SquarePen,
} from 'lucide-react'

/**
 * The four things a merch mockup needs, kept as separate fields.
 *
 * One free-text prompt tends to lose whichever of these the model decides to
 * skip. Naming them separately keeps each addressable, and lets an attached
 * image be labelled as the model / garment / artwork rather than arriving as
 * an undifferentiated pile.
 */
const DESIGN_FIELDS = [
  {
    key: 'model',
    label: 'Model',
    placeholder: 'a young woman with short dark hair',
    help: 'Who is wearing it',
    image: true,
  },
  {
    key: 'pose',
    label: 'Pose',
    placeholder: 'standing, hands in pockets',
    help: 'Leave blank to keep the pose from the model image',
    image: false,
  },
  {
    key: 'product',
    label: 'Product',
    placeholder: 'a heather grey hoodie',
    help: 'What you are selling',
    image: true,
  },
  {
    key: 'logo',
    label: 'Logo',
    placeholder: 'the camp crest, centred on the chest',
    help: 'What goes on the merch',
    image: true,
  },
]

const ACTION_CHIPS = [
  {
    label: 'Add product',
    prompt: 'Add a new product. Ask me for the name, price, and any other details you need.',
    icon: Plus,
  },
  {
    label: 'Update theme',
    prompt: 'Help me update the store theme and branding. Ask what I want to change.',
    icon: Palette,
  },
  {
    label: 'Draft promo',
    prompt: 'Draft a promotional collection and matching sale copy. Ask me for the offer details.',
    icon: Megaphone,
  },
  {
    label: 'Review orders',
    prompt: 'Review open orders and tell me what I should fulfill or follow up on.',
    icon: ShoppingBag,
  },
]

/** Read a File into the { mimeType, dataBase64 } shape the API expects. */
function readAsReference(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the image'))
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Could not read the image'))
        return
      }
      resolve({ mimeType: file.type || 'image/png', dataBase64: base64, name: file.name })
    }
    reader.readAsDataURL(file)
  })
}

function resizeComposer(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 220)}px`
}

function formatActivityTime(ts) {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export function AgentChat() {
  const initial = loadAgentSession()
  const [messages, setMessages] = useState(initial.messages)
  const [recent, setRecent] = useState(initial.recent)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [configured, setConfigured] = useState(true)
  const [showDesigner, setShowDesigner] = useState(false)
  const [design, setDesign] = useState({ model: '', pose: '', product: '', logo: '' })
  const [references, setReferences] = useState({})
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    adminAPI
      .agent.models()
      .then((data) => {
        if (cancelled) return
        setConfigured(data.configured !== false)
        setModels(data.models || [])
        setSelectedModel(data.defaultModel || '')
      })
      .catch(() => {
        if (!cancelled) setConfigured(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  useEffect(() => {
    resizeComposer(inputRef.current)
  }, [input])

  useEffect(() => {
    saveAgentSession({ messages, recent })
  }, [messages, recent])

  const sendMessage = useCallback(
    async (text) => {
      const content = (text ?? input).trim()
      if (!content || sending) return

      const nextMessages = [...messages, { role: 'user', content, at: Date.now() }]
      setMessages(nextMessages)
      setInput('')
      setError(null)
      setSending(true)

      try {
        // Strip the display-only `name` before sending; the API wants just
        // the bytes and type.
        const payloadReferences = Object.fromEntries(
          Object.entries(references).map(([role, ref]) => [
            role,
            { mimeType: ref.mimeType, dataBase64: ref.dataBase64 },
          ]),
        )

        const response = await adminAPI.agent.chat({
          messages: nextMessages.map(({ role, content: c }) => ({ role, content: c })),
          model: selectedModel || undefined,
          references: Object.keys(payloadReferences).length ? payloadReferences : undefined,
        })
        setMessages([
          ...nextMessages,
          {
            role: 'assistant',
            content: response.message,
            actions: response.actions || [],
            at: Date.now(),
          },
        ])
      } catch (err) {
        setError(err.message || 'The agent request failed')
      } finally {
        setSending(false)
      }
    },
    [input, messages, sending, selectedModel, references]
  )

  const attachReference = useCallback(async (role, file) => {
    if (!file) return
    try {
      const ref = await readAsReference(file)
      setReferences((prev) => ({ ...prev, [role]: ref }))
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const clearReference = useCallback((role) => {
    setReferences((prev) => {
      const next = { ...prev }
      delete next[role]
      return next
    })
  }, [])

  /**
   * Turn the filled fields into a sentence the agent can act on.
   *
   * The fields are also sent to the tool, but the agent needs to know what
   * was asked for in order to decide whether to generate an image at all.
   */
  const describeDesign = useCallback(() => {
    const parts = []
    if (design.product.trim()) parts.push(`Product: ${design.product.trim()}`)
    if (design.model.trim()) parts.push(`Model: ${design.model.trim()}`)
    if (design.pose.trim()) parts.push(`Pose: ${design.pose.trim()}`)
    if (design.logo.trim()) parts.push(`Logo: ${design.logo.trim()}`)
    const attached = Object.keys(references)
    if (attached.length) parts.push(`Reference images attached for: ${attached.join(', ')}`)
    return parts.join('. ')
  }, [design, references])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitComposer()
    }
  }

  const submitComposer = () => {
    const detail = describeDesign()
    sendMessage(detail ? `${input.trim()}\n\n${detail}`.trim() : undefined)
  }

  const startNewChat = () => {
    const nextRecent = archiveThread(messages, recent)
    setRecent(nextRecent)
    setMessages([])
    setError(null)
    setInput('')
    saveAgentSession({ messages: [], recent: nextRecent })
    inputRef.current?.focus()
  }

  const canSend = !sending && (!!input.trim() || !!describeDesign())
  const hasTranscript = messages.length > 0 || sending

  return (
    <section className="w-full" aria-label="Store agent" data-testid="store-agent">
      <div className="admin-card overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--os-color-border)] px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--os-radius-md)] bg-[var(--os-color-bg-fill-brand-muted)]">
              <Sparkles className="h-4 w-4 text-[var(--os-color-icon-brand)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-[var(--os-color-text)]">
                Store assistant
              </h2>
              <p className="mt-0.5 text-xs text-[var(--os-color-text-secondary)]">
                Ask the agent to add products, update the theme, or run the store.
              </p>
            </div>
          </div>
          {hasTranscript && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={startNewChat}
              className="shrink-0"
            >
              <SquarePen className="mr-1.5 h-3.5 w-3.5" />
              New chat
            </Button>
          )}
        </div>

        {hasTranscript && (
          <div
            ref={scrollRef}
            className="max-h-[min(28rem,50vh)] space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
            aria-live="polite"
          >
            {messages.map((message, index) => (
              <div
                key={`${message.at || index}-${index}`}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--os-color-bg-surface-secondary)]">
                    <Bot className="h-3.5 w-3.5 text-[var(--os-color-icon)]" />
                  </div>
                )}
                <div
                  className={`max-w-[min(80%,42rem)] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-[var(--os-color-bg-fill-brand)] text-[var(--os-color-text-on-brand)]'
                      : 'bg-[var(--os-color-bg-surface-secondary)] text-[var(--os-color-text)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {Array.isArray(message.actions) && message.actions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.actions.map((action, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-1.5 text-xs ${
                            action.ok ? 'text-[var(--os-color-text-success)]' : 'text-[var(--os-color-text-critical)]'
                          }`}
                        >
                          <Wrench className="h-3 w-3 shrink-0" />
                          <span>{action.summary || action.tool}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--os-color-bg-surface-secondary)]">
                  <Bot className="h-3.5 w-3.5 text-[var(--os-color-icon)]" />
                </div>
                <div className="rounded-2xl bg-[var(--os-color-bg-surface-secondary)] px-3.5 py-2.5">
                  <div className="admin-spinner h-4 w-4"></div>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="px-4 pb-2 text-xs text-[var(--os-color-text-critical)] sm:px-5" role="alert">
            {error}
          </p>
        )}

        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="mb-2.5 flex flex-wrap gap-1.5" data-testid="agent-quick-actions">
            {ACTION_CHIPS.map((chip) => {
              const Icon = chip.icon
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => sendMessage(chip.prompt)}
                  disabled={sending}
                  className="admin-chip"
                >
                  <Icon className="h-3 w-3" />
                  {chip.label}
                </button>
              )
            })}
          </div>

          <div
            className="agent-composer w-full rounded-[var(--os-radius-lg)] border border-[var(--os-color-border)] shadow-[var(--os-shadow-sm)] transition-[border-color,box-shadow] duration-200 focus-within:border-[var(--os-color-border-focus)] focus-within:shadow-[var(--os-shadow-focus)]"
            data-testid="agent-composer"
          >
            {showDesigner && (
              <div className="border-b border-[var(--os-color-border)] px-4 py-3">
                <p className="mb-3 text-xs text-[var(--os-color-text-disabled)]">
                  Fill in what you can. Anything left blank is left to the agent.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DESIGN_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label
                        htmlFor={`design-${field.key}`}
                        className="block text-xs font-medium text-[var(--os-color-text-secondary)]"
                      >
                        {field.label}
                      </label>
                      <input
                        id={`design-${field.key}`}
                        type="text"
                        value={design[field.key]}
                        placeholder={field.placeholder}
                        onChange={(e) => setDesign({ ...design, [field.key]: e.target.value })}
                        className="mt-1 h-8 w-full rounded-lg border-0 bg-[var(--os-color-bg-surface-secondary)] px-2.5 text-sm text-[var(--os-color-text)] placeholder:text-[var(--os-color-text-disabled)] focus:outline-none focus:shadow-[var(--os-shadow-focus)]"
                      />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[var(--os-color-text-disabled)]">{field.help}</span>
                        {field.image && (
                          references[field.key] ? (
                            <button
                              type="button"
                              onClick={() => clearReference(field.key)}
                              className="inline-flex items-center gap-1 text-[11px] text-[var(--os-color-text-secondary)] hover:text-[var(--os-color-text-critical)]"
                            >
                              <X className="h-3 w-3" />
                              {references[field.key].name || 'image'}
                            </button>
                          ) : (
                            <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-[var(--os-color-text-secondary)] hover:text-[var(--os-color-text)]">
                              <ImagePlus className="h-3 w-3" />
                              Add image
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(e) => attachReference(field.key, e.target.files?.[0])}
                              />
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label htmlFor="store-agent-input" className="sr-only">
              Ask the store agent
            </label>
            <textarea
              id="store-agent-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                showDesigner
                  ? 'Describe what you want to sell, e.g. "list this for $45"'
                  : 'Ask the agent to update your store…'
              }
              rows={3}
              disabled={sending}
              className="min-h-[5.5rem] w-full resize-none overflow-hidden border-0 bg-transparent px-4 pt-3.5 pb-1 text-[15px] leading-relaxed text-[var(--os-color-text)] placeholder:text-[var(--os-color-text-disabled)] focus:outline-none disabled:opacity-50"
            />

            <div className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
              <div className="flex min-w-0 items-center gap-1">
                <Button
                  size="icon"
                  variant={showDesigner ? 'secondary' : 'ghost'}
                  onClick={() => setShowDesigner((v) => !v)}
                  aria-pressed={showDesigner}
                  title="Describe a merch design"
                  className="h-8 w-8 shrink-0 rounded-full"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span className="sr-only">Describe a merch design</span>
                </Button>
                {configured && models.length > 0 && (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="max-w-44 truncate rounded-full border-0 bg-transparent px-2 py-1 text-[11px] text-[var(--os-color-text-disabled)] hover:text-[var(--os-color-text-secondary)] focus:outline-none"
                    aria-label="Agent model"
                  >
                    {!models.some((m) => m.id === selectedModel) && selectedModel && (
                      <option value={selectedModel}>{selectedModel}</option>
                    )}
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
                {!configured && (
                  <p className="flex min-w-0 items-center gap-1 truncate px-1 text-[11px] text-[var(--os-color-text-disabled)]">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      Add an OpenRouter key in{' '}
                      <Link
                        to="/admin/developer-settings"
                        className="underline hover:text-[var(--os-color-text-secondary)]"
                      >
                        Developer Settings
                      </Link>
                    </span>
                  </p>
                )}
              </div>
              <Button
                size="icon"
                onClick={submitComposer}
                disabled={!canSend}
                className="h-9 w-9 shrink-0 rounded-full"
                aria-label="Send message"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-4" data-testid="agent-recent-activity">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--os-color-text-disabled)]">
            Recent activity
          </h3>
          <ul className="divide-y divide-[var(--os-color-border)] overflow-hidden rounded-[var(--os-radius-lg)] border border-[var(--os-color-border)] bg-[var(--os-color-bg-surface)]">
            {recent.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setInput(item.preview)
                    inputRef.current?.focus()
                  }}
                  className="flex w-full items-start justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--os-color-bg-surface-hover)]"
                >
                  <span className="min-w-0 truncate text-sm text-[var(--os-color-text)]">{item.preview}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--os-color-text-disabled)]">
                    {formatActivityTime(item.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
