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
} from 'lucide-react'

const EXAMPLE_PROMPTS = [
  'Add a product called "Classic Tee" for $24.99',
  'Create a "Summer Sale" collection',
  'Build a landing page at /sale with a hero and featured products',
]

export function AgentChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState('')
  const [configured, setConfigured] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    adminAPI
      .models()
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
        const response = await adminAPI.agent.chat({
          messages: nextMessages.map(({ role, content: c }) => ({ role, content: c })),
          model: selectedModel || undefined,
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
    [input, messages, sending, selectedModel]
  )

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

            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the agent to update your store..."
                rows={1}
                disabled={sending}
                className="flex-1 resize-none rounded-md border border-[var(--admin-border-primary)] bg-transparent px-3 py-2 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-border-focus)] disabled:opacity-50"
              />
              <Button size="sm" onClick={() => sendMessage()} disabled={sending || !input.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
