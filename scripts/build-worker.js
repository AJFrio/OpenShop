#!/usr/bin/env node

import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))

async function buildWorker() {
  console.log('🔨 Building worker bundle...')

  try {
    // Ensure dist directory exists
    const distDir = join(rootDir, 'dist')
    mkdirSync(distDir, { recursive: true })

    await build({
      entryPoints: [join(rootDir, 'src/worker.js')],
      bundle: true,
      platform: 'neutral',
      format: 'esm',
      target: 'es2022',
      outfile: join(distDir, 'worker.bundle.js'),
      minify: true,
      sourcemap: false,
      external: [
        // Cloudflare runtime APIs are provided by the runtime
        '@cloudflare/workers-types'
      ]
    })

    // Add build banner comment
    const bundlePath = join(distDir, 'worker.bundle.js')
    let content = readFileSync(bundlePath, 'utf8')
    
    const banner = `// Worker Bundle - Built ${new Date().toISOString()}\n// Version: ${packageJson.version}\n`
    content = banner + content
    
    writeFileSync(bundlePath, content, 'utf8')

    console.log('✅ Worker bundle created: dist/worker.bundle.js')
  } catch (error) {
    console.error('❌ Worker build failed:', error)
    process.exit(1)
  }
}

buildWorker()

