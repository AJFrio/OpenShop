#!/usr/bin/env node
// Seeds the LOCAL wrangler KV namespace (+ local R2 simulation) with fixture data
// so the storefront and admin UI work end-to-end with zero cloud connectivity.
//
// Idempotent: every run overwrites the same keys. Safe to re-run at any time.
// Usage: node scripts/dev/seed-local.mjs
import fs from 'fs'
import os from 'os'
import path from 'path'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import {
  repoRoot,
  LOCAL_ADMIN_PASSWORD,
  LOCAL_ADMIN_TOKEN,
} from './build-local-config.mjs'
import { buildSeedFixtures } from './seed-fixtures.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KV_BINDING = 'YOUR_STORE_KV'
const R2_BUCKET = 'local-images'
const ADMIN_TOKEN_TTL_SECONDS = 86400 // mirrors src/config/constants.js ADMIN_TOKEN_TTL

// Replicates src/utils/crypto.js hashToken exactly (SHA-256 hex).
async function hashToken(token) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

function generateSeedSvg(index) {
  const palette = [
    ['#2563eb', '#dbeafe'],
    ['#0f766e', '#ccfbf1'],
    ['#b45309', '#fef3c7'],
  ]
  const [fg, bg] = palette[index % palette.length]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <rect width="800" height="800" fill="${bg}"/>
  <circle cx="400" cy="340" r="160" fill="${fg}"/>
  <text x="400" y="600" font-family="sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="${fg}">OpenShop Seed ${index}</text>
</svg>
`
}

function runOrExit(label, cmd, args) {
  console.log(`▶ ${label}`)
  const result = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'inherit', shell: false })
  if (result.status !== 0) {
    console.error(`❌ ${label} failed (exit ${result.status})`)
    process.exit(result.status ?? 1)
  }
}

function tryRun(label, cmd, args) {
  const result = spawnSync(cmd, args, { cwd: repoRoot, stdio: 'pipe', encoding: 'utf8', shell: false })
  if (result.status !== 0) {
    console.warn(`⚠️  ${label} failed (continuing): ${(result.stderr || result.stdout || '').trim().split('\n')[0]}`)
    return false
  }
  console.log(`✅ ${label}`)
  return true
}

async function main() {
  // The seeder needs wrangler.toml to resolve the KV binding; regenerate if absent.
  if (!fs.existsSync(path.join(repoRoot, 'wrangler.toml'))) {
    runOrExit('Generate local config', process.execPath, [path.join(__dirname, 'build-local-config.mjs')])
  }

  const fixtures = buildSeedFixtures()

  // Admin token entry: key = admin_token:<sha256(token)>, value = timestamp,
  // TTL per src/routes/admin/auth.js login expectations.
  const hashedToken = await hashToken(LOCAL_ADMIN_TOKEN)
  fixtures.push({
    key: `admin_token:${hashedToken}`,
    value: Date.now().toString(),
    expiration_ttl: ADMIN_TOKEN_TTL_SECONDS,
  })

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openshop-seed-'))
  try {
    const bulkFile = path.join(tmpDir, 'kv-bulk.json')
    fs.writeFileSync(bulkFile, JSON.stringify(fixtures, null, 2))

    runOrExit(`Seeding ${fixtures.length} KV entries into local namespace`, 'npx', [
      'wrangler', 'kv', 'bulk', 'put', bulkFile, `--binding=${KV_BINDING}`, '--local',
    ])

    // Best-effort: upload seed SVGs to the local R2 simulation so images resolve.
    for (let index = 1; index <= 3; index++) {
      const key = `media/seed-${index}.svg`
      const svgFile = path.join(tmpDir, `seed-${index}.svg`)
      fs.writeFileSync(svgFile, generateSeedSvg(index))
      tryRun(
        `R2 put ${key}`,
        'npx',
        ['wrangler', 'r2', 'object', 'put', `${R2_BUCKET}/${key}`, `--file=${svgFile}`,
          '--content-type=image/svg+xml', '--local'],
      ) || console.warn('   (media upload is best-effort; storefront falls back to gradients)')
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }

  console.log('\n✅ Local dev data seeded (idempotent).')
  console.log(`   Admin password: ${LOCAL_ADMIN_PASSWORD}`)
  console.log(`   Admin token:    ${LOCAL_ADMIN_TOKEN}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
}
