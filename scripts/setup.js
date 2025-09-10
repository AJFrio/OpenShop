#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, copyFileSync, rmSync } from 'fs'
import { createInterface } from 'readline'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve)
  })
}

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

async function setup() {
  console.log('🚀 OpenShop Setup Wizard')
  console.log('========================\n')

  // Collect project configuration
  console.log('📋 Project Configuration:\n')
  
  const projectName = await question('Project Name (e.g., my-store): ')
  if (!projectName || !projectName.trim()) {
    console.error('❌ Project name is required!')
    process.exit(1)
  }
  
  // Sanitize project name (lowercase, replace spaces/special chars with hyphens)
  const sanitizedProjectName = projectName.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  console.log(`✅ Using sanitized project name: ${sanitizedProjectName}\n`)

  const themeInput = await question('Starter Theme (trendy, modern, elegant) [trendy]: ')
  const selectedTheme = (themeInput.trim().toLowerCase()) || 'trendy'
  console.log(`✅ Selected ${selectedTheme} theme\n`)

  // Collect required credentials
  console.log('🔑 Required Credentials:\n')
  
  const cloudflareApiToken = await question('Cloudflare API Token: ')
  const cloudflareAccountId = await question('Cloudflare Account ID: ')
  const stripeSecretKey = await question('Stripe Secret Key: ')
  const stripePublishableKey = await question('Stripe Publishable Key: ')
  const adminPassword = await question('Admin Password (default: admin123): ') || 'admin123'
  
  rl.close()

  const validThemes = ['trendy', 'modern', 'elegant']
  if (!validThemes.includes(selectedTheme)) {
    console.error('❌ Invalid theme selected!')
    process.exit(1)
  }
  try {
    copyFileSync(`src/themes/${selectedTheme}.css`, 'src/theme.css')
    rmSync('src/themes', { recursive: true, force: true })
    console.log(`✅ Applied ${selectedTheme} theme`)
  } catch (err) {
    console.error('❌ Failed to apply theme:', err.message)
    process.exit(1)
  }

  // Install Wrangler CLI if not present
  try {
    execSync('wrangler --version', { stdio: 'ignore' })
  } catch {
    console.log('\n📦 Installing Wrangler CLI...')
    execCommand('npm install -g wrangler', 'Installing Wrangler CLI')
  }

  // Set up Cloudflare authentication
  console.log('\n🔐 Setting up Cloudflare authentication...')
  process.env.CLOUDFLARE_API_TOKEN = cloudflareApiToken
  process.env.CLOUDFLARE_ACCOUNT_ID = cloudflareAccountId
  console.log('✅ Using API Token authentication (skipping OAuth login)')
  
  // Verify Wrangler can access account
  try {
    execSync('wrangler whoami', { stdio: 'ignore' })
    console.log('✅ Cloudflare authentication verified')
  } catch (error) {
    console.log('⚠️  Authentication check failed, but continuing with API token...')
  }

  // Create KV namespace with project name
  console.log('\n🗃️ Creating KV namespace...')
  const kvNamespaceName = `${sanitizedProjectName.toUpperCase()}_KV`
  const kvResult = execSync(`wrangler kv namespace create "${kvNamespaceName}"`, { encoding: 'utf8' })
  console.log('KV Creation Output:', kvResult) // Debug output
  
  // Try multiple regex patterns for different Wrangler output formats
  let kvIdMatch = kvResult.match(/id = "([^"]+)"/) || 
                  kvResult.match(/ID:\s*([a-f0-9-]+)/) ||
                  kvResult.match(/"id":\s*"([^"]+)"/) ||
                  kvResult.match(/([a-f0-9]{32})/)
  
  if (!kvIdMatch) {
    console.error('❌ Failed to extract KV namespace ID from output:', kvResult)
    process.exit(1)
  }
  
  const kvId = kvIdMatch[1]
  console.log(`✅ KV namespace "${kvNamespaceName}" created with ID: ${kvId}`)

  // Update wrangler.toml with project name and add KV namespace
  let wranglerConfig = readFileSync('wrangler.toml', 'utf8')
  wranglerConfig = wranglerConfig.replace('name = "openshop"', `name = "${sanitizedProjectName}"`)
  
  // Add KV namespace configuration
  const kvConfig = `
# KV namespace binding
[[kv_namespaces]]
binding = "${kvNamespaceName}"
id = "${kvId}"
`
  
  // Insert KV config before the last comment line
  wranglerConfig = wranglerConfig.replace(
    '# KV namespace and secrets will be added during setup',
    `${kvConfig}`
  )
  
  writeFileSync('wrangler.toml', wranglerConfig)
  console.log('✅ Updated wrangler.toml with project name and KV namespace')

  // Build and deploy Worker
  console.log('\n🔧 Building and deploying Cloudflare Worker...')
  execCommand('npm run build', 'Building project')
  execCommand(`wrangler deploy`, `Deploying Worker "${sanitizedProjectName}"`)

  // Get the Worker URL with custom name
  const workerUrl = `https://${sanitizedProjectName}.workers.dev`
  
  // Update wrangler.toml with site URL
  wranglerConfig = readFileSync('wrangler.toml', 'utf8')
  wranglerConfig = wranglerConfig.replace('SITE_URL = ""', `SITE_URL = "${workerUrl}"`)
  writeFileSync('wrangler.toml', wranglerConfig)
  console.log('✅ Updated wrangler.toml with worker URL')

  // Set secrets
  console.log('\n🔒 Setting up secrets...')
  process.env.STRIPE_SECRET_KEY = stripeSecretKey
  process.env.VITE_STRIPE_PUBLISHABLE_KEY = stripePublishableKey
  
  execCommand(`echo "${stripeSecretKey}" | wrangler secret put STRIPE_SECRET_KEY`, 'Setting Stripe secret key')
  execCommand(`echo "${stripePublishableKey}" | wrangler secret put VITE_STRIPE_PUBLISHABLE_KEY`, 'Setting Stripe publishable key')
  execCommand(`echo "${adminPassword}" | wrangler secret put ADMIN_PASSWORD`, 'Setting admin password')

  // Create .env file for local development
  const envContent = `# Local development environment
CLOUDFLARE_API_TOKEN=${cloudflareApiToken}
CLOUDFLARE_ACCOUNT_ID=${cloudflareAccountId}
STRIPE_SECRET_KEY=${stripeSecretKey}
VITE_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey}
ADMIN_PASSWORD=${adminPassword}
SITE_URL=${workerUrl}
`
  writeFileSync('.env', envContent)
  console.log('✅ Created .env file for local development')

  console.log('\n🎉 Setup completed successfully!')
  console.log(`\n📱 Your "${projectName}" store is now live at: ${workerUrl}`)
  console.log(`🔧 Admin dashboard: ${workerUrl}/admin`)
  console.log(`🗃️ KV Namespace: ${kvNamespaceName}`)
  console.log(`⚡ Worker: ${sanitizedProjectName}`)
  console.log('\n📝 Next steps:')
  console.log('1. Visit your admin dashboard to add products and collections')
  console.log(`2. Login with password: ${adminPassword}`)
  console.log('3. Configure your Stripe account with webhooks (optional)')
  console.log('4. Customize your storefront design')
  console.log('\n💡 Use "npm run dev" for local development')
  console.log('💡 Use "npm run deploy" to deploy updates')
  console.log(`\n🏪 To create another store, run setup again with a different project name!`)
}

setup().catch(error => {
  console.error('\n❌ Setup failed:', error.message)
  process.exit(1)
})
