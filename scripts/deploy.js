#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync } from 'fs'

function execCommand(command, description) {
  console.log(`\n🔄 ${description}...`)
  try {
    execSync(command, { stdio: 'inherit' })
    console.log(`✅ ${description} completed`)
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message)
    process.exit(1)
  }
}

async function deploy() {
  console.log('🚀 OpenShop Deployment')
  console.log('======================\n')

  // Read project name from wrangler.toml
  let projectName = 'openshop' // default fallback
  try {
    const wranglerConfig = readFileSync('wrangler.toml', 'utf8')
    const nameMatch = wranglerConfig.match(/name = "([^"]+)"/)
    if (nameMatch) {
      projectName = nameMatch[1]
      console.log(`📋 Deploying project: ${projectName}`)
    }
  } catch (error) {
    console.log('⚠️  Could not read project name from wrangler.toml, using default')
  }

  // Build the project
  execCommand('npm run build', 'Building project')

  // Deploy to Cloudflare Pages with correct project name
  execCommand(`wrangler pages deploy dist --project-name=${projectName}`, `Deploying to Cloudflare Pages (${projectName})`)

  console.log('\n🎉 Deployment completed successfully!')
  console.log(`\n💡 Your changes are now live at: https://${projectName}.pages.dev`)
}

deploy().catch(error => {
  console.error('\n❌ Deployment failed:', error.message)
  process.exit(1)
})
