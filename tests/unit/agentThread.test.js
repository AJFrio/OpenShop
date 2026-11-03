import { describe, it, expect } from 'vitest'
import {
  AGENT_SESSION_KEY,
  archiveThread,
  loadAgentSession,
  saveAgentSession,
} from '../../src/lib/agentThread.js'

function memoryStorage(initial = {}) {
  const store = { ...initial }
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value)
    },
    store,
  }
}

describe('agentThread session', () => {
  it('returns empty session when storage is empty', () => {
    expect(loadAgentSession(memoryStorage())).toEqual({ messages: [], recent: [] })
  })

  it('round-trips messages and recent prompts', () => {
    const storage = memoryStorage()
    saveAgentSession(
      {
        messages: [
          { role: 'user', content: 'Add a product', at: 1 },
          { role: 'assistant', content: 'Done', actions: [{ ok: true, summary: 'Created' }], at: 2 },
        ],
        recent: [{ id: '1', preview: 'Rename the store', updatedAt: 3, messageCount: 2 }],
      },
      storage,
    )
    expect(storage.store[AGENT_SESSION_KEY]).toBeTruthy()
    const loaded = loadAgentSession(storage)
    expect(loaded.messages).toHaveLength(2)
    expect(loaded.messages[0].content).toBe('Add a product')
    expect(loaded.messages[1].actions[0].summary).toBe('Created')
    expect(loaded.recent[0].preview).toBe('Rename the store')
  })

  it('archives the first user prompt onto recent activity', () => {
    const recent = archiveThread(
      [
        { role: 'user', content: '  Draft a summer sale collection  ' },
        { role: 'assistant', content: 'Created Summer Sale' },
      ],
      [],
    )
    expect(recent).toHaveLength(1)
    expect(recent[0].preview).toBe('Draft a summer sale collection')
    expect(recent[0].messageCount).toBe(2)
  })

  it('ignores malformed JSON', () => {
    const storage = memoryStorage({ [AGENT_SESSION_KEY]: '{not-json' })
    expect(loadAgentSession(storage)).toEqual({ messages: [], recent: [] })
  })
})
