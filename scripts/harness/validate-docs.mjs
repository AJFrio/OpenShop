#!/usr/bin/env node
/**
 * Validates engineering-harness documentation structure and key cross-links.
 * Remediation: fix missing files or broken links noted in output.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

const REQUIRED_FILES = [
  'AGENTS.md',
  'ARCHITECTURE.md',
  'docs/HARNESS.md',
  'docs/DESIGN.md',
  'docs/FRONTEND.md',
  'docs/PLANS.md',
  'docs/PRODUCT_SENSE.md',
  'docs/QUALITY_SCORE.md',
  'docs/RELIABILITY.md',
  'docs/SECURITY.md',
  'docs/design-docs/index.md',
  'docs/design-docs/core-beliefs.md',
  'docs/exec-plans/tech-debt-tracker.md',
  'docs/generated/kv-data-model.md',
  'docs/product-specs/index.md',
  'docs/references/README.md',
]

const AGENTS_MAX_LINES = 130

function fail(messages) {
  console.error('❌ Docs validation failed:\n')
  for (const m of messages) console.error(`  - ${m}`)
  process.exit(1)
}

function pass(msg) {
  console.log(`✅ ${msg}`)
}

const errors = []

for (const rel of REQUIRED_FILES) {
  const full = path.join(root, rel)
  if (!fs.existsSync(full)) {
    errors.push(`Missing required file: ${rel}`)
  }
}

const agentsPath = path.join(root, 'AGENTS.md')
if (fs.existsSync(agentsPath)) {
  const lines = fs.readFileSync(agentsPath, 'utf8').split('\n')
  if (lines.length > AGENTS_MAX_LINES) {
    errors.push(
      `AGENTS.md has ${lines.length} lines (max ${AGENTS_MAX_LINES}). Move detail into docs/.`
    )
  }

  const linkRe = /\]\((\.\/[^)#]+|docs\/[^)#]+)\)/g
  const content = fs.readFileSync(agentsPath, 'utf8')
  let match
  while ((match = linkRe.exec(content)) !== null) {
    let target = match[1]
    if (target.endsWith('/')) target += 'README.md'
    const resolved = path.normalize(path.join(root, target.replace(/^\.\//, '')))
    if (!fs.existsSync(resolved)) {
      errors.push(`AGENTS.md broken link: ${match[1]} → not found`)
    }
  }
}

const designIndex = path.join(root, 'docs/design-docs/index.md')
if (fs.existsSync(designIndex)) {
  const text = fs.readFileSync(designIndex, 'utf8')
  if (!text.includes('core-beliefs.md')) {
    errors.push('docs/design-docs/index.md must reference core-beliefs.md')
  }
}

const productIndex = path.join(root, 'docs/product-specs/index.md')
if (fs.existsSync(productIndex)) {
  const text = fs.readFileSync(productIndex, 'utf8')
  if (!text.includes('core-ecommerce.md')) {
    errors.push('docs/product-specs/index.md must reference core-ecommerce.md')
  }
}

if (errors.length) fail(errors)

pass(`All ${REQUIRED_FILES.length} required harness docs present`)
pass(`AGENTS.md within ${AGENTS_MAX_LINES} lines`)
pass('Design and product spec indexes OK')
