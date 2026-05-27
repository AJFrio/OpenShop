#!/usr/bin/env node
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '../..')

function run(label, cmd, args) {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', shell: true })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('Validate documentation', 'node', ['scripts/harness/validate-docs.mjs'])
run('Validate architecture imports', 'node', ['scripts/harness/validate-architecture.mjs'])
run('Harness structural tests', 'npm', ['test', '--', '--run', 'tests/harness'])

console.log('\n✅ Engineering harness validation passed')
