#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createInterface } from 'readline'

// --- Argument Parsing ---
function parseArgs() {
  const args = process.argv.slice(2)
  const parsedArgs = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const key = arg.substring(2)
      const nextArg = args[i + 1]
      if (nextArg && !nextArg.startsWith('--')) {
        parsedArgs[key] = nextArg
        i++ // Skip the value
      } else {
        parsedArgs[key] = true // Flag without value
      }
    }
  }
  return parsedArgs
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt, argValue) {
  if (argValue !== undefined) {
    console.log(`${prompt}${argValue}`)
    return Promise.resolve(argValue)
  }
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
  const args = parseArgs()

  console.log('🚀 OpenShop Setup Wizard')
  console.log('========================\n')

  // Collect project configuration
  console.log('📋 Project Configuration:\n')
  
  const projectName = await question('Project Name (e.g., my-store): ', args.name)
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

  // Ensure toml directory exists
  const tomlDir = 'toml'
  if (!existsSync(tomlDir)) {
    execSync(`mkdir ${tomlDir}`, { stdio: 'ignore' })
    console.log('✅ Created toml/ directory\n')
  }

  // Collect required credentials
  console.log('🔑 Required Credentials:\n')
  
  const cloudflareApiToken = await question('Cloudflare API Token: ', args.cloudflare_key)
  const cloudflareAccountId = await question('Cloudflare Account ID: ', args.cloudflare_id)
  
  console.log('\n🔑 Stripe Configuration:\n')
  const stripeSecretKey = await question('Stripe Secret Key: ', args.stripe_sk)
  const stripePublishableKey = await question('Stripe Publishable Key: ', args.stripe_pk)
  
  console.log('\n🔑 Google OAuth & Drive (optional - press Enter to skip):\n')
  const googleClientId = await question('Google Client ID (optional): ', args.google_client_id) || ''
  const googleClientSecret = await question('Google Client Secret (optional): ', args.google_client_secret) || ''
  const googleApiKey = await question('Google API Key (optional): ', args.google_api_key) || ''
  const driveRootFolder = await question('Drive Root Folder (default: OpenShop): ', args.drive_root_folder) || 'OpenShop'
  
  console.log('\n🔑 AI Configuration (optional - press Enter to skip):\n')
  const geminiApiKey = await question('Gemini API Key (optional): ', args.gemini_api_key) || ''
  
  console.log('\n🔑 Admin Access:\n')
  const adminPassword = await question('Admin Password (default: admin123): ', args.admin_password)
  
  rl.close()

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

  // Create a basic template for wrangler.toml in root
  console.log('\n📝 Creating wrangler.toml for deployment...')
  const basicWranglerConfig = `name = "${sanitizedProjectName}"
main = "src/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# KV namespace will be added after initial deployment

# Environment variables
[vars]
SITE_URL = ""

# Static assets (automatically creates ASSETS binding)
[assets]
directory = "dist"
binding = "ASSETS"

# Observability
[observability]
enabled = true
head_sampling_rate = 1
`
  writeFileSync('wrangler.toml', basicWranglerConfig)
  console.log('✅ Created wrangler.toml with project name')
  
  let wranglerConfig = basicWranglerConfig

  // Build and deploy Worker (initial deployment without KV)
  console.log('\n🔧 Building and deploying Cloudflare Worker...')
  execCommand('npm run build', 'Building project')
  execCommand(`wrangler deploy`, `Deploying Worker "${sanitizedProjectName}"`)
  console.log('✅ Worker deployed successfully')

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

  // Add KV namespace binding to wrangler.toml
  console.log('\n📝 Adding KV namespace binding to wrangler.toml...')
  wranglerConfig = readFileSync('wrangler.toml', 'utf8')
  
  const kvConfig = `
# KV namespace binding
[[kv_namespaces]]
binding = "${kvNamespaceName}"
id = "${kvId}"
`
  
  // Insert KV config after compatibility_flags or before vars section
  if (wranglerConfig.includes('# KV namespace will be added after initial deployment')) {
    wranglerConfig = wranglerConfig.replace(
      '# KV namespace will be added after initial deployment',
      kvConfig.trim()
    )
  } else {
    // Fallback: insert before # Environment variables
    wranglerConfig = wranglerConfig.replace(
      '# Environment variables',
      `${kvConfig}\n# Environment variables`
    )
  }
  
  writeFileSync('wrangler.toml', wranglerConfig)
  console.log('✅ Updated wrangler.toml with KV namespace binding')

  // Redeploy Worker with KV binding
  console.log('\n🔧 Redeploying Worker with KV namespace...')
  execCommand(`wrangler deploy`, `Redeploying Worker "${sanitizedProjectName}" with KV binding`)

  // Get the Worker URL with custom name
  const workerUrl = `https://${sanitizedProjectName}.workers.dev`
  
  // Update wrangler.toml with all environment variables
  console.log('\n📝 Adding environment variables to wrangler.toml...')
  wranglerConfig = readFileSync('wrangler.toml', 'utf8')
  
  // Build the complete vars section
  let varsSection = `SITE_URL = "${workerUrl}"\n`
  varsSection += `ADMIN_PASSWORD = "${adminPassword}"\n`
  varsSection += `DRIVE_ROOT_FOLDER = "${driveRootFolder}"\n`
  varsSection += `STRIPE_SECRET_KEY = "${stripeSecretKey}"\n`
  
  if (googleClientId) varsSection += `GOOGLE_CLIENT_ID = "${googleClientId}"\n`
  if (googleClientSecret) varsSection += `GOOGLE_CLIENT_SECRET = "${googleClientSecret}"\n`
  if (googleApiKey) varsSection += `GOOGLE_API_KEY = "${googleApiKey}"\n`
  if (geminiApiKey) varsSection += `GEMINI_API_KEY = "${geminiApiKey}"\n`
  
  // Replace the entire SITE_URL line and add all variables
  wranglerConfig = wranglerConfig.replace(
    /SITE_URL = ""/,
    varsSection.trim()
  )
  
  writeFileSync('wrangler.toml', wranglerConfig)
  console.log('✅ Added all environment variables to wrangler.toml')

  // Redeploy Worker with all configuration
  console.log('\n🔧 Redeploying Worker with complete configuration...')
  execCommand(`wrangler deploy`, `Redeploying Worker "${sanitizedProjectName}" with full configuration`)
  
  // Save the final configuration to toml directory
  const tomlPath = `toml/${sanitizedProjectName}.toml`
  writeFileSync(tomlPath, wranglerConfig)
  console.log(`✅ Saved configuration to ${tomlPath}`)

  // Create .env file for local development
  console.log('\n📝 Creating .env files for local development...')
  let envContent = `# Local development environment
CLOUDFLARE_API_TOKEN=${cloudflareApiToken}
CLOUDFLARE_ACCOUNT_ID=${cloudflareAccountId}
STRIPE_SECRET_KEY=${stripeSecretKey}
VITE_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey}
ADMIN_PASSWORD=${adminPassword}
SITE_URL=${workerUrl}
DRIVE_ROOT_FOLDER=${driveRootFolder}
`
  if (googleClientId) envContent += `GOOGLE_CLIENT_ID=${googleClientId}\n`
  if (googleClientSecret) envContent += `GOOGLE_CLIENT_SECRET=${googleClientSecret}\n`
  if (googleApiKey) envContent += `GOOGLE_API_KEY=${googleApiKey}\n`
  if (geminiApiKey) envContent += `GEMINI_API_KEY=${geminiApiKey}\n`
  
  writeFileSync('.env', envContent)
  console.log('✅ Created .env file for local development')

  const perSiteEnvPath = `.env.${sanitizedProjectName}`
  writeFileSync(perSiteEnvPath, envContent)
  console.log(`✅ Saved site-specific environment to ${perSiteEnvPath}`)

  console.log('\n🎉 Setup completed successfully!')
  console.log(`\n📱 Your "${projectName}" store is now live at: ${workerUrl}`)
  console.log(`🔧 Admin dashboard: ${workerUrl}/admin`)
  console.log(`🗃️ KV Namespace: ${kvNamespaceName}`)
  console.log(`⚡ Worker: ${sanitizedProjectName}`)
  console.log(`📋 Configuration saved: toml/${sanitizedProjectName}.toml`)
  console.log('\n📝 Next steps:')
  console.log('1. Visit your admin dashboard to add products and collections')
  console.log(`2. Login with password: ${adminPassword}`)
  console.log('3. Configure your Stripe account with webhooks (optional)')
  console.log('4. Customize your storefront design')
  console.log('\n💡 Use "npm run dev" for local development')
  console.log(`💡 Use "npm run deploy ${sanitizedProjectName}" to deploy updates to this site`)
  console.log(`💡 Use "npm run deploy" to see all sites and choose which to deploy`)
  console.log(`\n🏪 To create another store, run "npm run setup" again with a different project name!`)
}

setup().catch(error => {
  console.error('\n❌ Setup failed:', error.message)
  process.exit(1)
})
