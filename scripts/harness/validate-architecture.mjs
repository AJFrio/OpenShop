#!/usr/bin/env node
/**
 * Enforces OpenShop import layers. See docs/DESIGN.md and ARCHITECTURE.md.
 * Remediation: move shared code to lib/utils or call through services from routes.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')
const srcRoot = path.join(root, 'src')

const LAYERS = {
  foundation: new Set(['config', 'lib', 'utils']),
  services: new Set(['services']),
  http: new Set(['routes', 'middleware']),
  worker: new Set(['worker']),
  clientApi: new Set(['api']),
  ui: new Set(['pages', 'components', 'contexts']),
}

function layerForFile(absPath) {
  const rel = path.relative(srcRoot, absPath).replace(/\\/g, '/')
  if (rel === 'worker.js' || rel.startsWith('worker.')) return 'worker'
  const top = rel.split('/')[0]
  for (const [layer, dirs] of Object.entries(LAYERS)) {
    if (dirs.has(top)) return layer
  }
  if (rel === 'App.jsx' || rel === 'main.jsx') return 'ui'
  return 'unknown'
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null
  const dir = path.dirname(fromFile)
  let target = path.resolve(dir, spec)
  const exts = ['', '.js', '.jsx', '/index.js', '/index.jsx']
  for (const ext of exts) {
    const candidate = target + ext
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
  return null
}

const FORBIDDEN = {
  foundation: ['services', 'routes', 'middleware', 'api', 'pages', 'components', 'contexts', 'worker.js'],
  services: ['routes', 'middleware', 'api', 'pages', 'components', 'contexts'],
  clientApi: ['services', 'routes', 'middleware', 'pages', 'components'],
  http: ['pages', 'components', 'contexts', 'api'],
  worker: ['pages', 'components', 'contexts', 'api'],
  ui: ['services', 'routes', 'middleware'],
}

function topDirFromResolved(resolved) {
  const rel = path.relative(srcRoot, resolved).replace(/\\/g, '/')
  if (rel === 'worker.js') return 'worker'
  return rel.split('/')[0]
}

function collectSourceFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) collectSourceFiles(full, acc)
    else if (/\.(js|jsx)$/.test(name)) acc.push(full)
  }
  return acc
}

const importRe = /^\s*import\s+.+?\s+from\s+['"]([^'"]+)['"]/gm

const violations = []
const files = collectSourceFiles(srcRoot)

for (const file of files) {
  const fromLayer = layerForFile(file)
  if (fromLayer === 'unknown') continue
  const forbiddenTops = FORBIDDEN[fromLayer]
  if (!forbiddenTops) continue

  const content = fs.readFileSync(file, 'utf8')
  let m
  importRe.lastIndex = 0
  while ((m = importRe.exec(content)) !== null) {
    const spec = m[1]
    const resolved = resolveImport(file, spec)
    if (!resolved) continue
    const top = topDirFromResolved(resolved)
    const relFrom = path.relative(root, file).replace(/\\/g, '/')
    const relTo = path.relative(root, resolved).replace(/\\/g, '/')

    if (forbiddenTops.includes(top) || forbiddenTops.some((f) => relTo.endsWith(f))) {
      violations.push(
        `${relFrom} (${fromLayer}) must not import ${relTo} (${top}). See docs/DESIGN.md.`
      )
    }
  }
}

if (violations.length) {
  console.error('❌ Architecture validation failed:\n')
  for (const v of violations) console.error(`  - ${v}`)
  process.exit(1)
}

console.log(`✅ Architecture layers OK (${files.length} files checked)`)
