#!/usr/bin/env node

import { copyFileSync } from 'fs'
import { execSync } from 'child_process'
import { createInterface } from 'readline'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve))
}

async function preview() {
  const themeInput = await question('Preview theme (trendy, modern, elegant) [trendy]: ')
  const selectedTheme = (themeInput.trim().toLowerCase()) || 'trendy'
  const validThemes = ['trendy', 'modern', 'elegant']
  if (!validThemes.includes(selectedTheme)) {
    console.error('❌ Invalid theme selected!')
    process.exit(1)
  }

  try {
    copyFileSync(`src/themes/${selectedTheme}.css`, 'src/theme.css')
    console.log(`✅ Applied ${selectedTheme} theme for preview\n`)
  } catch (err) {
    console.error('❌ Failed to apply theme:', err.message)
    process.exit(1)
  }

  rl.close()

  console.log('🛍️ Starting dev server with mock data...')
  execSync('npm run dev', {
    stdio: 'inherit',
    env: { ...process.env, VITE_USE_MOCK_DATA: 'true' }
  })
}

preview().catch(err => {
  console.error('Preview failed:', err)
  process.exit(1)
})
