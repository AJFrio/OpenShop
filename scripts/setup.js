#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
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

/**
 * Parse Wrangler whoami output to find available accounts
 */
function parseAccounts(output) {
  const accounts = []
  const lines = output.split('\n')
  for (const line of lines) {
    const match = line.match(/│\s*([^│]+)\s*│\s*([a-f0-9]{32})\s*│/)
    if (match) {
      const name = match[1].trim()
      const id = match[2].trim()
      if (id !== 'Account ID') {
        accounts.push({ name, id })
      }
    }
  }
  return accounts
}

/**
 * Parse command-line arguments into an object
 */
function parseArgs() {
  const args = process.argv.slice(2)
  const parsed = {}
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2).replace(/-/g, '_')
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true
      parsed[key] = value
      if (value !== true) i++ // Skip next arg if it was used as value
    }
  }
  
  return parsed
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
  // Parse command-line arguments
  const args = parseArgs()
  const useFlags = Object.keys(args).length > 0
  
  if (useFlags) {
    console.log('🚀 OpenShop Setup (CLI Mode)')
    console.log('============================\n')
  } else {
    console.log('🚀 OpenShop Setup Wizard')
    console.log('========================\n')
  }

  // Collect project configuration
  let projectName
  if (useFlags && args.site_name) {
    projectName = args.site_name
  } else {
    if (!useFlags) console.log('📋 Project Configuration:\n')
    projectName = await question('Project Name (e.g., my-store): ')
  }
  
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

  // Install Wrangler CLI if not present
  try {
    execSync('wrangler --version', { stdio: 'ignore' })
  } catch {
    console.log('\n📦 Installing dependencies (including Wrangler CLI)...')
    execCommand('npm install', 'Installing dependencies')
  }

  // Collect required credentials
  let cloudflareApiToken, cloudflareAccountId, stripeSecretKey, stripePublishableKey
  let geminiApiKey = '', productLimit = '', adminPassword = 'admin123'

  // Check if Wrangler is authenticated
  let isWranglerAuthenticated = false
  let availableAccounts = []

  try {
    const whoamiOutput = execSync('wrangler whoami', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    isWranglerAuthenticated = true
    console.log('✅ Wrangler is already authenticated')

    availableAccounts = parseAccounts(whoamiOutput)

    // Fallback if table parsing failed but simple regex works
    if (availableAccounts.length === 0) {
      const accountIdMatch = whoamiOutput.match(/([a-f0-9]{32})/)
      if (accountIdMatch && accountIdMatch[1]) {
        availableAccounts.push({ name: 'Default Account', id: accountIdMatch[1] })
      }
    }

    if (availableAccounts.length === 1) {
      cloudflareAccountId = availableAccounts[0].id
      console.log(`✅ Using Cloudflare Account ID: ${cloudflareAccountId}`)
    } else if (availableAccounts.length > 1) {
      console.log(`✅ Found ${availableAccounts.length} available Cloudflare accounts`)
    }
  } catch (e) {
    // Not authenticated
  }
  
  if (useFlags) {
    cloudflareApiToken = args.cloudflare_api_token
    cloudflareAccountId = args.cloudflare_account_id
    stripeSecretKey = args.stripe_secret_key
    stripePublishableKey = args.stripe_publishable_key
    adminPassword = args.password || 'admin123'
    productLimit = args.product_limit || ''
    geminiApiKey = args.gemini_api_key || ''
    
    // Validate required flags
    const isCloudflareAuthMissing = !cloudflareApiToken || !cloudflareAccountId
    if ((isCloudflareAuthMissing && !isWranglerAuthenticated) || !stripeSecretKey || !stripePublishableKey) {
      console.error('❌ Missing required flags: --stripe-secret-key and --stripe-publishable-key are required.')
      console.error('   If not logged in with Wrangler, --cloudflare-api-token and --cloudflare-account-id are also required.')
      process.exit(1)
    }
  } else {
    if (!isWranglerAuthenticated) {
      console.log('🔑 Required Credentials:\n')
      cloudflareApiToken = await question('Cloudflare API Token: ')
      cloudflareAccountId = await question('Cloudflare Account ID: ')
    } else {
      console.log('✅ Using existing Wrangler authentication\n')

      if (availableAccounts.length > 1) {
        console.log('📋 Select a Cloudflare account to use:')
        availableAccounts.forEach((acc, index) => {
          console.log(`  ${index + 1}. ${acc.name} (${acc.id})`)
        })

        let validSelection = false
        while (!validSelection) {
          const selection = await question(`\nEnter number (1-${availableAccounts.length}): `)
          const index = parseInt(selection) - 1
          if (index >= 0 && index < availableAccounts.length) {
            cloudflareAccountId = availableAccounts[index].id
            console.log(`✅ Selected account: ${availableAccounts[index].name}`)
            validSelection = true
          } else {
            console.log('❌ Invalid selection, please try again.')
          }
        }
      }
    }
    
    console.log('🔑 Stripe Configuration:\n')
    stripeSecretKey = await question('Stripe Secret Key: ')
    stripePublishableKey = await question('Stripe Publishable Key: ')
    
    console.log('\n🔑 AI Configuration (optional - press Enter to skip):\n')
    geminiApiKey = await question('Gemini API Key (optional): ') || ''
    
    console.log('\n🔑 Store Configuration:\n')
    const productLimitInput = await question('Product Limit (optional - press Enter for unlimited): ') || ''
    productLimit = productLimitInput.trim() ? productLimitInput.trim() : ''
    
    console.log('\n🔑 Admin Access:\n')
    adminPassword = await question('Admin Password (default: admin123): ') || 'admin123'
  }
  
  if (!useFlags) {
    rl.close()
  }

  // Set up Cloudflare authentication
  if (cloudflareApiToken) {
    console.log('\n🔐 Setting up Cloudflare authentication...')
    process.env.CLOUDFLARE_API_TOKEN = cloudflareApiToken
    process.env.CLOUDFLARE_ACCOUNT_ID = cloudflareAccountId
    console.log('✅ Using API Token authentication (skipping OAuth login)')
  } else {
    console.log('\n🔐 Using existing Wrangler authentication...')
    if (cloudflareAccountId) {
      process.env.CLOUDFLARE_ACCOUNT_ID = cloudflareAccountId
      console.log(`✅ Set account context to ID: ${cloudflareAccountId}`)
    }
  }

  // Verify Wrangler can access account
  try {
    execSync('wrangler whoami', { stdio: 'ignore' })
    console.log('✅ Cloudflare authentication verified')
  } catch (error) {
    console.log('⚠️  Authentication check failed.')
    if (!cloudflareApiToken) {
      console.error('❌ You must be logged in with Wrangler or provide a Cloudflare API Token.')
      process.exit(1)
    }
  }

  // Create a basic template for wrangler.toml in root
  console.log('\n📝 Creating wrangler.toml for deployment...')
  const basicWranglerConfig = `name = "${sanitizedProjectName}"
main = "src/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# KV namespace will be added after initial deployment
# R2 bucket will be added after initial deployment

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

  // Build and deploy Worker (initial deployment without KV/R2)
  console.log('\n🔧 Building and deploying Cloudflare Worker...')
  execCommand('npm run build', 'Building project')
  execCommand(`wrangler deploy`, `Deploying Worker "${sanitizedProjectName}"`)
  console.log('✅ Worker deployed successfully')

  // Create R2 bucket
  console.log('\n🗃️ Creating R2 bucket...')
  const bucketName = `${sanitizedProjectName}-assets`
  try {
    execSync(`wrangler r2 bucket create "${bucketName}"`, { stdio: 'ignore' })
    console.log(`✅ Created R2 bucket: ${bucketName}`)
  } catch (e) {
    console.log(`⚠️  R2 bucket creation failed or already exists: ${bucketName}`)
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

  // Add bindings to wrangler.toml
  console.log('\n📝 Adding bindings to wrangler.toml...')
  wranglerConfig = readFileSync('wrangler.toml', 'utf8')
  
  const kvConfig = `
# KV namespace binding
[[kv_namespaces]]
binding = "${kvNamespaceName}"
id = "${kvId}"
`

  const r2Config = `
# R2 bucket binding
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "${bucketName}"
`
  
  // Insert KV config
  if (wranglerConfig.includes('# KV namespace will be added after initial deployment')) {
    wranglerConfig = wranglerConfig.replace(
      '# KV namespace will be added after initial deployment',
      kvConfig.trim()
    )
  } else {
    // Fallback
    wranglerConfig = wranglerConfig.replace(
      '# Environment variables',
      `${kvConfig}\n# Environment variables`
    )
  }

  // Insert R2 config
  if (wranglerConfig.includes('# R2 bucket will be added after initial deployment')) {
    wranglerConfig = wranglerConfig.replace(
      '# R2 bucket will be added after initial deployment',
      r2Config.trim()
    )
  } else {
    // Fallback
    wranglerConfig = wranglerConfig.replace(
      '# Environment variables',
      `${r2Config}\n# Environment variables`
    )
  }
  
  writeFileSync('wrangler.toml', wranglerConfig)
  console.log('✅ Updated wrangler.toml with KV and R2 bindings')

  // Redeploy Worker with bindings
  console.log('\n🔧 Redeploying Worker with KV and R2...')
  execCommand(`wrangler deploy`, `Redeploying Worker "${sanitizedProjectName}" with bindings`)

  // Get the Worker URL with custom name
  const workerUrl = `https://${sanitizedProjectName}.workers.dev`
  
  // Update wrangler.toml with all environment variables
  console.log('\n📝 Adding environment variables to wrangler.toml...')
  wranglerConfig = readFileSync('wrangler.toml', 'utf8')
  
  // Build the complete vars section
  let varsSection = `SITE_URL = "${workerUrl}"\n`
  varsSection += `ADMIN_PASSWORD = "${adminPassword}"\n`
  varsSection += `STRIPE_SECRET_KEY = "${stripeSecretKey}"\n`
  
  if (geminiApiKey) varsSection += `GEMINI_API_KEY = "${geminiApiKey}"\n`
  if (productLimit) varsSection += `PRODUCT_LIMIT = "${productLimit}"\n`
  
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
`
  if (cloudflareApiToken) envContent += `CLOUDFLARE_API_TOKEN=${cloudflareApiToken}\n`
  if (cloudflareAccountId) envContent += `CLOUDFLARE_ACCOUNT_ID=${cloudflareAccountId}\n`

  envContent += `STRIPE_SECRET_KEY=${stripeSecretKey}
VITE_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey}
ADMIN_PASSWORD=${adminPassword}
SITE_URL=${workerUrl}
`
  if (geminiApiKey) envContent += `GEMINI_API_KEY=${geminiApiKey}\n`
  if (productLimit) envContent += `PRODUCT_LIMIT=${productLimit}\n`
  
  writeFileSync('.env', envContent)
  console.log('✅ Created .env file for local development')

  const perSiteEnvPath = `.env.${sanitizedProjectName}`
  writeFileSync(perSiteEnvPath, envContent)
  console.log(`✅ Saved site-specific environment to ${perSiteEnvPath}`)

  console.log('\n🎉 Setup completed successfully!')
  console.log(`\n📱 Your "${projectName}" store is now live at: ${workerUrl}`)
  console.log(`🔧 Admin dashboard: ${workerUrl}/admin`)
  console.log(`🗃️ KV Namespace: ${kvNamespaceName}`)
  console.log(`🗃️ R2 Bucket: ${bucketName}`)
  console.log(`⚡ Worker: ${sanitizedProjectName}`)
  console.log(`📋 Configuration saved: toml/${sanitizedProjectName}.toml`)
  
  // Output JSON result for container/automated use
  if (useFlags) {
    const result = {
      success: true,
      worker_id: sanitizedProjectName,
      worker_name: sanitizedProjectName,
      worker_url: workerUrl,
      admin_url: `${workerUrl}/admin`,
      kv_namespace: kvNamespaceName,
      r2_bucket: bucketName
    }
    console.log('\n' + JSON.stringify(result))
  } else {
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
}

setup().catch(error => {
  const args = parseArgs()
  const useFlags = Object.keys(args).length > 0
  
  if (useFlags) {
    // Output error as JSON for container/automated use
    const errorResult = {
      success: false,
      error: error.message
    }
    console.error('\n' + JSON.stringify(errorResult))
  } else {
    console.error('\n❌ Setup failed:', error.message)
  }
  process.exit(1)
})
