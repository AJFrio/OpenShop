import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

describe('engineering harness docs', () => {
  it('has AGENTS.md map at repo root', () => {
    expect(fs.existsSync(path.join(root, 'AGENTS.md'))).toBe(true)
  })

  it('has exec-plans directories', () => {
    expect(fs.existsSync(path.join(root, 'docs/exec-plans/active'))).toBe(true)
    expect(fs.existsSync(path.join(root, 'docs/exec-plans/completed'))).toBe(true)
  })

  it('indexes design docs', () => {
    const index = fs.readFileSync(
      path.join(root, 'docs/design-docs/index.md'),
      'utf8'
    )
    expect(index).toContain('core-beliefs.md')
  })
})
