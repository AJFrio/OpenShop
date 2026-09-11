import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { adminAPI } from '../../api/admin'
import {
  Bot,
  Send,
  Sparkles,
  Wrench,
  AlertCircle,
  ImagePlus,
  X,
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

const EXAMPLE_PROMPTS = [
  'Add a product called "Classic Tee" for $24.99',
  'Design a hoodie with our logo and list it for $45',
  'Create a "Summer Sale" collection',
]

export function AgentChat() {
  const [messages, setMessages] = useState([])
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

  const sendMessage = useCallback(
    async (text) => {
      const content = (text ?? input).trim()
      if (!content || sending) return

      const nextMessages = [...messages, { role: 'user', content }]
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
          { role: 'assistant', content: response.message, actions: response.actions || [] },
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
      sendMessage()
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--admin-text-muted)]" />
            <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">Store Agent</h3>
          </div>
          {configured && models.length > 0 && (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-xs bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-primary)] rounded-md px-2 py-1 text-[var(--admin-text-secondary)] max-w-52"
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
        </div>

        {!configured ? (
          <div className="flex flex-col items-center py-10 text-center">
            <AlertCircle className="w-10 h-10 text-[var(--admin-text-muted)] mb-3" />
            <p className="text-sm text-[var(--admin-text-secondary)] mb-1">
              The store agent needs an OpenRouter API key.
            </p>
            <code className="text-xs text-[var(--admin-text-muted)]">wrangler secret put OPENROUTER_API_KEY</code>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="space-y-3 overflow-y-auto max-h-96 mb-3 pr-1">
              {messages.length === 0 && (
                <div className="flex flex-col items-start gap-2 py-4">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-primary)] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-[var(--admin-text-secondary)]" />
                    </div>
                    <p className="text-sm text-[var(--admin-text-secondary)] pt-1">
                      Hi! I can manage your products, collections, and pages. Ask me to make a change to your store.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pl-9">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <Button
                        key={prompt}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => sendMessage(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-primary)] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-[var(--admin-text-secondary)]" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-[var(--admin-accent)] text-white'
                        : 'bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-primary)] text-[var(--admin-text-primary)]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {Array.isArray(message.actions) && message.actions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.actions.map((action, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1.5 text-xs ${
                              action.ok ? 'text-[var(--admin-success)]' : 'text-[var(--admin-error)]'
                            }`}
                          >
                            <Wrench className="w-3 h-3 shrink-0" />
                            <span>{action.summary || action.tool}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-primary)] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[var(--admin-text-secondary)]" />
                  </div>
                  <div className="rounded-lg px-3 py-2 bg-[var(--admin-bg-elevated)] border border-[var(--admin-border-primary)]">
                    <div className="admin-spinner"></div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-[var(--admin-error)] mb-2">{error}</p>
            )}

            {showDesigner && (
              <div className="mb-3 rounded-md border border-[var(--admin-border-primary)] p-3">
                <p className="mb-3 text-xs text-[var(--admin-text-secondary)]">
                  Fill in what you can. Anything left blank is left to the agent,
                  and an attached image is used as the reference for that field.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DESIGN_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label
                        htmlFor={`design-${field.key}`}
                        className="block text-xs font-medium text-[var(--admin-text-primary)]"
                      >
                        {field.label}
                      </label>
                      <input
                        id={`design-${field.key}`}
                        type="text"
                        value={design[field.key]}
                        placeholder={field.placeholder}
                        onChange={(e) => setDesign({ ...design, [field.key]: e.target.value })}
                        className="mt-1 h-8 w-full rounded-md border border-[var(--admin-border-primary)] bg-[var(--admin-bg-elevated)] px-2 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)]"
                      />
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[var(--admin-text-muted)]">{field.help}</span>
                        {field.image && (
                          references[field.key] ? (
                            <button
                              type="button"
                              onClick={() => clearReference(field.key)}
                              className="inline-flex items-center gap-1 text-[11px] text-[var(--admin-text-secondary)] hover:text-[var(--admin-error)]"
                            >
                              <X className="h-3 w-3" />
                              {references[field.key].name || 'image'}
                            </button>
                          ) : (
                            <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-[var(--admin-text-secondary)] hover:text-[var(--admin-text-primary)]">
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

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDesigner((v) => !v)}
                aria-pressed={showDesigner}
                title="Describe a merch design"
              >
                <ImagePlus className="w-4 h-4" />
              </Button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={showDesigner
                  ? 'Describe what you want to sell, e.g. "list this for $45"'
                  : 'Ask the agent to update your store...'}
                rows={1}
                disabled={sending}
                className="flex-1 resize-none rounded-md border border-[var(--admin-border-primary)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-border-focus)] disabled:opacity-50"
              />
              <Button
                size="sm"
                onClick={() => {
                  const detail = describeDesign()
                  sendMessage(detail ? `${input.trim()}\n\n${detail}`.trim() : undefined)
                }}
                disabled={sending || (!input.trim() && !describeDesign())}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
