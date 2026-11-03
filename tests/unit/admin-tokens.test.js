import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { adminTokens, adminTheme } from '../../src/lib/adminTheme.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

describe('admin design tokens', () => {
  it('exposes the brand ramp and canvas used by OpenShop-Service', () => {
    expect(adminTokens.color.brand['600']).toBe('#2563eb')
    expect(adminTokens.color.brand['400']).toBe('#60a5fa')
    expect(adminTokens.color.brand['900']).toBe('#1e3a8a')
    expect(adminTokens.color.bg.canvas).toBe('#09090b')
    expect(adminTokens.color.bg.surface).toBe('#18181b')
    expect(adminTokens.meta.theme).toBe('dark')
    expect(adminTokens.meta.fontFamily).toBe('Plus Jakarta Sans')
  })

  it('keeps adminTheme.colors aligned with the JSON', () => {
    expect(adminTheme.colors.primary).toBe(adminTokens.color.brand['600'])
    expect(adminTheme.colors.background).toBe(adminTokens.color.bg.canvas)
    expect(adminTheme.colors.surface).toBe(adminTokens.color.bg.surface)
    expect(adminTheme.colors.text).toBe(adminTokens.color.text.default)
  })

  it('declares matching --os-* custom properties in CSS', () => {
    const css = read('src/styles/admin-tokens.css')
    const pairs = [
      ['--os-color-brand-600', adminTokens.color.brand['600']],
      ['--os-color-bg', adminTokens.color.bg.canvas],
      ['--os-color-bg-surface', adminTokens.color.bg.surface],
      ['--os-color-text', adminTokens.color.text.default],
      ['--os-color-text-brand', adminTokens.color.text.brand],
      ['--os-color-bg-fill-brand', adminTokens.color.bg.fillBrand],
      ['--os-radius-md', adminTokens.radius.md],
      ['--os-font-family', 'Plus Jakarta Sans'],
    ]
    for (const [prop, value] of pairs) {
      expect(css).toContain(`${prop}:`)
      expect(css).toContain(value)
    }
    expect(css).toContain('--admin-accent: var(--os-color-bg-fill-brand)')
  })

  it('documents the JSON path for OpenShop-Service', () => {
    const doc = read('docs/DESIGN-TOKENS.md')
    expect(doc).toContain('src/lib/admin-tokens.json')
    expect(doc).toContain('--os-color-bg')
    expect(doc).toContain('OpenShop-Service')
  })
})
