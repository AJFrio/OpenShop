#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
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

/**
 * Parse command-line flags
 */
function parseFlags() {
  const flags = {}
  const args = process.argv.slice(2)
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=')
      flags[key.replace(/-/g, '_')] = value || args[++i]
    }
  }
  
  return flags
}

function getAvailableSites() {
  const tomlDir = 'toml'
  if (!existsSync(tomlDir)) {
    return []
  }
  
  const files = readdirSync(tomlDir)
  return files
    .filter(file => file.endsWith('.toml'))
    .map(file => file.replace('.toml', ''))
}

function selectTomlFile(siteName) {
  const tomlPath = join('toml', `${siteName}.toml`)
  
  if (!existsSync(tomlPath)) {
    console.error(`❌ Configuration file not found: ${tomlPath}`)
    console.log('\n💡 Available sites:')
    const sites = getAvailableSites()
    if (sites.length === 0) {
      console.log('   No sites found. Run "npm run setup" to create one.')
    } else {
      sites.forEach(site => console.log(`   - ${site}`))
    }
    process.exit(1)
  }
  
  // Copy the selected toml file to root as wrangler.toml
  const tomlContent = readFileSync(tomlPath, 'utf8')
  writeFileSync('wrangler.toml', tomlContent)
  console.log(`📋 Using configuration: ${siteName}`)
  
  return tomlContent
}

/**
 * Generate TOML file dynamically from flags
 */
function generateTomlFromFlags(siteName, adminPassword, stripeSecretKey, stripePublishableKey, productLimit) {
  const sanitizedProjectName = siteName.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  
  const workerUrl = `https://${sanitizedProjectName}.workers.dev`
  
  let wranglerConfig = `name = "${sanitizedProjectName}"
main = "src/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# KV namespace will be added after initial deployment
# R2 bucket will be added after initial deployment

# Environment variables
[vars]
SITE_URL = "${workerUrl}"
ADMIN_PASSWORD = "${adminPassword}"
STRIPE_SECRET_KEY = "${stripeSecretKey}"

# Static assets (automatically creates ASSETS binding)
[assets]
directory = "dist"
binding = "ASSETS"

# Observability
[observability]
enabled = true
head_sampling_rate = 1
`

  if (productLimit) {
    wranglerConfig = wranglerConfig.replace(
      `STRIPE_SECRET_KEY = "${stripeSecretKey}"\n`,
      `STRIPE_SECRET_KEY = "${stripeSecretKey}"\nPRODUCT_LIMIT = "${productLimit}"\n`
    )
  }

  return { config: wranglerConfig, projectName: sanitizedProjectName }
}

/**
 * Create KV namespace and update TOML
 */
function createKVNamespaceAndUpdateToml(projectName, wranglerConfig) {
  // Create KV namespace with project name
  console.log('\n🗃️ Creating KV namespace...')
  const kvNamespaceName = `${projectName.toUpperCase()}_KV`
  
  let kvResult
  try {
    kvResult = execSync(`wrangler kv namespace create "${kvNamespaceName}"`, { encoding: 'utf8' })
  } catch (error) {
    // KV namespace might already exist, try to get existing one
    console.log('⚠️  KV namespace creation failed, checking if it already exists...')
    try {
      const listResult = execSync(`wrangler kv namespace list`, { encoding: 'utf8' })
      // Try to extract existing namespace ID
      const lines = listResult.split('\n')
      for (const line of lines) {
        if (line.includes(kvNamespaceName)) {
          const idMatch = line.match(/([a-f0-9]{32})/)
          if (idMatch) {
            kvResult = `id = "${idMatch[1]}"`
            console.log(`✅ Using existing KV namespace: ${kvNamespaceName}`)
            break
          }
        }
      }
      if (!kvResult || !kvResult.includes('id =')) {
        throw new Error('Could not find existing KV namespace')
      }
    } catch (listError) {
      throw new Error(`Failed to create or find KV namespace: ${error.message}`)
    }
  }
  
  // Extract KV namespace ID
  let kvIdMatch = kvResult.match(/id = "([^"]+)"/) || 
                  kvResult.match(/ID:\s*([a-f0-9-]+)/) ||
                  kvResult.match(/"id":\s*"([^"]+)"/) ||
                  kvResult.match(/([a-f0-9]{32})/)
  
  if (!kvIdMatch) {
    throw new Error(`Failed to extract KV namespace ID from output: ${kvResult}`)
  }
  
  const kvId = kvIdMatch[1]
  console.log(`✅ KV namespace "${kvNamespaceName}" created/found with ID: ${kvId}`)

  // Add KV namespace binding to wrangler.toml
  const kvConfig = `
# KV namespace binding
[[kv_namespaces]]
binding = "${kvNamespaceName}"
id = "${kvId}"
`

  // Insert KV config
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

  return wranglerConfig
}

/**
 * Create R2 bucket and update TOML
 */
function createR2BucketAndUpdateToml(projectName, wranglerConfig) {
  console.log('\n🗃️ Creating R2 bucket...')
  const bucketName = `${projectName}-assets`

  try {
    execSync(`wrangler r2 bucket create "${bucketName}"`, { stdio: 'ignore' })
    console.log(`✅ Created R2 bucket: ${bucketName}`)
  } catch (e) {
    console.log(`⚠️  R2 bucket creation failed or already exists: ${bucketName}`)
  }

  const r2Config = `
# R2 bucket binding
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "${bucketName}"
`

  // Insert R2 config
  if (wranglerConfig.includes('# R2 bucket will be added after initial deployment')) {
    wranglerConfig = wranglerConfig.replace(
      '# R2 bucket will be added after initial deployment',
      r2Config.trim()
    )
  } else {
    // Fallback
    if (!wranglerConfig.includes('[[r2_buckets]]')) {
      wranglerConfig = wranglerConfig.replace(
        '# Environment variables',
        `${r2Config}\n# Environment variables`
      )
    }
  }

  return wranglerConfig
}

async function deploy() {
  console.log('🚀 OpenShop Deployment')
  console.log('======================\n')

  // Parse command-line flags
  const flags = parseFlags()
  
  // Check if we're in flag-based mode
  const isFlagMode = flags.site_name && flags.admin_password && flags.stripe_secret_key && flags.stripe_publishable_key

  let siteName, projectName, tomlContent

  if (isFlagMode) {
    // Flag-based deployment mode
    rl.close()
    
    siteName = flags.site_name
    const adminPassword = flags.admin_password
    const stripeSecretKey = flags.stripe_secret_key
    const stripePublishableKey = flags.stripe_publishable_key
    const productLimit = flags.product_limit || ''

    // Validate site name format
    const siteNameRegex = /^[a-z0-9-]+$/
    if (!siteNameRegex.test(siteName)) {
      console.error('❌ Site name can only contain lowercase letters, numbers, and hyphens')
      process.exit(1)
    }

    console.log(`📋 Deploying site: ${siteName} (flag-based mode)\n`)

    // Generate TOML configuration
    const { config, projectName: generatedProjectName } = generateTomlFromFlags(
      siteName,
      adminPassword,
      stripeSecretKey,
      stripePublishableKey,
      productLimit
    )
    projectName = generatedProjectName
    tomlContent = config

    // Write wrangler.toml
    writeFileSync('wrangler.toml', tomlContent)
    console.log('✅ Generated wrangler.toml from flags')

    // Create .env file for build process
    let envContent = `VITE_STRIPE_PUBLISHABLE_KEY=${stripePublishableKey}\n`
    writeFileSync('.env', envContent)
    console.log('✅ Created .env file for build')

    // Build the project first
    execCommand('npm run build', 'Building project')

    // Deploy Worker (initial deployment without KV/R2)
    execCommand(`wrangler deploy`, `Deploying Worker "${projectName}" (initial)`)

    // Create KV namespace and update TOML
    tomlContent = createKVNamespaceAndUpdateToml(projectName, tomlContent)

    // Create R2 bucket and update TOML
    tomlContent = createR2BucketAndUpdateToml(projectName, tomlContent)

    writeFileSync('wrangler.toml', tomlContent)

    // Redeploy with bindings
    execCommand(`wrangler deploy`, `Redeploying Worker "${projectName}" with bindings`)

    // Save configuration to toml directory
    const tomlDir = 'toml'
    if (!existsSync(tomlDir)) {
      mkdirSync(tomlDir, { recursive: true })
    }
    const tomlPath = join(tomlDir, `${siteName}.toml`)
    writeFileSync(tomlPath, tomlContent)
    console.log(`✅ Saved configuration to ${tomlPath}`)

  } else {
    // Interactive mode (original behavior)
    siteName = process.argv[2]

    if (!siteName) {
      const sites = getAvailableSites()
      
      if (sites.length === 0) {
        console.error('❌ No sites found in toml/ directory')
        console.log('💡 Run "npm run setup" to create a new site')
        process.exit(1)
      }
      
      console.log('📁 Available sites:')
      sites.forEach((site, index) => {
        console.log(`   ${index + 1}. ${site}`)
      })
      
      const answer = await question('\n🎯 Which site do you want to deploy? (number or name): ')
      rl.close()
      
      const siteIndex = parseInt(answer) - 1
      if (!isNaN(siteIndex) && siteIndex >= 0 && siteIndex < sites.length) {
        siteName = sites[siteIndex]
      } else {
        siteName = answer.trim()
      }
    } else {
      rl.close()
    }

    // Select and load the toml file
    tomlContent = selectTomlFile(siteName)

    applySiteEnv(siteName)
    
    // Read project name from the selected toml
    projectName = siteName
    const nameMatch = tomlContent.match(/name = "([^"]+)"/)
    if (nameMatch) {
      projectName = nameMatch[1]
    }
    
    console.log(`📋 Deploying project: ${projectName}\n`)

    // Check for R2 binding and add if missing (migration path)
    if (!tomlContent.includes('[[r2_buckets]]')) {
      console.log('ℹ️  R2 bucket configuration missing. Adding it now...')
      tomlContent = createR2BucketAndUpdateToml(projectName, tomlContent)
      writeFileSync('wrangler.toml', tomlContent)

      // Update the saved TOML file
      const tomlPath = join('toml', `${siteName}.toml`)
      if (existsSync(tomlPath)) {
        writeFileSync(tomlPath, tomlContent)
        console.log(`✅ Updated stored configuration: ${tomlPath}`)
      }
    }

    // Build the project
    execCommand('npm run build', 'Building project')

    // Deploy Cloudflare Worker
    execCommand(`wrangler deploy`, `Deploying Cloudflare Worker (${projectName})`)
  }

  console.log('\n🎉 Deployment completed successfully!')
  console.log(`\n💡 Your changes are now live at: https://${projectName}.workers.dev`)
  process.exit(0)
}

function applySiteEnv(siteName) {
  const envCandidates = [`.env.${siteName}`, join('env', `${siteName}.env`)]
  const matchedPath = envCandidates.find(path => existsSync(path))

  if (!matchedPath) {
    console.warn(`⚠️  No site-specific .env file found for ${siteName}.`)
    console.warn('    Ensure VITE_* values are configured before deploying this site.')
    return
  }

  const envContent = readFileSync(matchedPath, 'utf8')
  writeFileSync('.env', envContent)

  envContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (!key || valueParts.length === 0) return
      const value = valueParts.join('=').trim()
      process.env[key.trim()] = value
    })

  console.log(`🌱 Applied environment variables from ${matchedPath}`)
}

deploy().catch(error => {
  console.error('\n❌ Deployment failed:', error.message)
  rl.close()
  process.exit(1)
})
