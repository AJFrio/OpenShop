#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { createInterface } from 'readline'
import os from 'os'
import path from 'path'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt) {
  return new Promise(resolve => {
    rl.question(prompt, answer => resolve(answer))
  })
}

async function askYesNo(prompt, defaultYes = true) {
  const suffix = defaultYes ? ' [Y/n]: ' : ' [y/N]: '
  const value = (await question(`${prompt}${suffix}`)).trim().toLowerCase()
  if (!value) return defaultYes
  return ['y', 'yes'].includes(value)
}

function runCommand(command, description, options = {}) {
  const { inheritStdio = true, allowFailure = false } = options
  console.log(`\n> ${description}`)
  try {
    const result = execSync(command, {
      stdio: inheritStdio ? 'inherit' : 'pipe',
      encoding: inheritStdio ? undefined : 'utf8'
    })
    console.log(`✓ ${description}`)
    return result || ''
  } catch (error) {
    console.error(`✖ ${description}`)
    if (!inheritStdio && error.stdout) {
      console.error(error.stdout.toString())
    } else if (inheritStdio && error.message) {
      console.error(error.message)
    }
    if (allowFailure) return ''
    throw error
  }
}

function runCommandCapture(command, description, options = {}) {
  return runCommand(command, description, { ...options, inheritStdio: false })
}

function ensureDirectory(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
    console.log(`✓ Created ${dirPath}/`)
  }
}

function sanitizeProjectName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function ensureWranglerInstalled() {
  try {
    execSync('wrangler --version', { stdio: 'ignore' })
    return
  } catch {
    console.log('\nWrangler CLI is not installed. Installing globally with npm...')
  }
  runCommand('npm install -g wrangler', 'Install Wrangler CLI')
}

function parseWranglerAccountsFromJson() {
  try {
    const output = execSync('wrangler accounts list --json', { stdio: 'pipe', encoding: 'utf8' })
    const parsed = JSON.parse(output)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        id: item.id,
        name: item.name || item.id || 'Cloudflare Account'
      }))
      .filter(item => item.id)
  } catch (_) {
    return []
  }
}

function parseWranglerAccountsFromWhoAmI() {
  try {
    const output = execSync('wrangler whoami', { stdio: 'pipe', encoding: 'utf8' })
    const accounts = []
    output.split(/\r?\n/).forEach(line => {
      const idMatch = line.match(/([a-f0-9]{32})/i)
      if (idMatch) {
        const id = idMatch[1]
        const name = line.replace(id, '').replace(/[^a-zA-Z0-9\s._-]/g, '').trim() || 'Cloudflare Account'
        accounts.push({ id, name })
      }
    })
    return accounts
  } catch (_) {
    return []
  }
}

async function authenticateWithCloudflare() {
  console.log('\n=== Cloudflare ===')
  console.log('We will open an OAuth flow in your browser using the Wrangler CLI.')
  runCommand('wrangler login', 'Authenticate with Cloudflare (browser OAuth)')

  let accounts = parseWranglerAccountsFromJson()
  if (accounts.length === 0) {
    accounts = parseWranglerAccountsFromWhoAmI()
  }

  let accountId = ''
  let accountName = ''

  if (accounts.length === 1) {
    accountId = accounts[0].id
    accountName = accounts[0].name
    console.log(`Detected Cloudflare account: ${accountName} (${accountId})`)
  } else if (accounts.length > 1) {
    console.log('\nMultiple Cloudflare accounts detected:')
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. ${account.name} (${account.id})`)
    })

    const selected = await question('Select an account by number (or paste an account ID): ')
    const index = parseInt(selected, 10)
    if (!Number.isNaN(index) && index >= 1 && index <= accounts.length) {
      accountId = accounts[index - 1].id
      accountName = accounts[index - 1].name
    } else {
      accountId = selected.trim()
      accountName = accounts.find(account => account.id === accountId)?.name || 'Cloudflare Account'
    }
  } else {
    accountId = (await question('Enter your Cloudflare Account ID: ')).trim()
    accountName = 'Cloudflare Account'
  }

  if (!accountId) {
    throw new Error('Cloudflare account ID is required to continue.')
  }

  return { accountId, accountName }
}

function stripeCliAvailable() {
  try {
    execSync('stripe --version', { stdio: 'ignore' })
    return true
  } catch (_) {
    return false
  }
}

function locateStripeConfigFile() {
  const home = os.homedir()
  const candidates = [
    path.join(home, '.config', 'stripe', 'config.toml'),
    path.join(home, '.stripe', 'config.toml'),
    path.join(home, 'AppData', 'Roaming', 'Stripe', 'config.toml'),
    path.join(home, 'AppData', 'Roaming', 'stripe', 'config.toml')
  ]
  return candidates.find(candidate => existsSync(candidate)) || null
}

function parseToml(content) {
  const result = {}
  let currentPath = []

  content.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      return
    }

    const sectionMatch = line.match(/^\[([^\]]+)\]$/)
    if (sectionMatch) {
      currentPath = sectionMatch[1].split('.').map(part => part.trim()).filter(Boolean)
      return
    }

    const keyMatch = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*"(.*)"$/)
    if (!keyMatch) return

    const [, key, rawValue] = keyMatch
    const value = rawValue.replace(/\\"/g, '"')

    let pointer = result
    currentPath.forEach(part => {
      if (!pointer[part]) pointer[part] = {}
      pointer = pointer[part]
    })
    pointer[key] = value
  })

  return result
}

function readStripeCliConfig() {
  try {
    const output = execSync('stripe config --list --json', { stdio: 'pipe', encoding: 'utf8' })
    return JSON.parse(output)
  } catch (_) {
    const configPath = locateStripeConfigFile()
    if (!configPath) return null
    try {
      const content = readFileSync(configPath, 'utf8')
      return parseToml(content)
    } catch (innerError) {
      console.warn(`Could not parse Stripe CLI config at ${configPath}: ${innerError.message}`)
      return null
    }
  }
}

function extractStripeKey(profile, mode) {
  if (!profile || typeof profile !== 'object') return ''

  const normalizedMode = mode === 'live' ? 'live' : 'test'
  const restrictedKey = profile?.restricted_keys?.[normalizedMode]?.key
  if (restrictedKey) return restrictedKey

  const explicitKey = profile[`${normalizedMode}_mode_api_key`] || profile[`${normalizedMode}_api_key`]
  if (explicitKey) return explicitKey

  if (normalizedMode === 'test' && profile.api_key) {
    return profile.api_key
  }

  return ''
}

function extractStripePublishableKey(profile, mode) {
  if (!profile || typeof profile !== 'object') return ''
  const normalizedMode = mode === 'live' ? 'live' : 'test'
  const directKey = profile[`${normalizedMode}_mode_publishable_key`] || profile[`${normalizedMode}_publishable_key`]
  if (directKey) return directKey
  if (normalizedMode === 'test' && profile.publishable_key) return profile.publishable_key
  return ''
}

async function authenticateWithStripe(preferredMode) {
  const normalizedMode = preferredMode === 'live' ? 'live' : 'test'
  console.log('\n=== Stripe ===')

  const available = stripeCliAvailable()
  if (!available) {
    console.warn('Stripe CLI not found on PATH. Falling back to manual key entry.')
    return {
      secretKey: (await question(`Enter your Stripe ${normalizedMode} secret key: `)).trim(),
      publishableKey: (await question(`Enter your Stripe ${normalizedMode} publishable key: `)).trim()
    }
  }

  const useCli = await askYesNo('Use Stripe CLI to complete OAuth login?', true)
  let profileName = 'default'
  let secretKey = ''
  let publishableKey = ''

  if (useCli) {
    console.log('The Stripe CLI will open a browser window to authorize access.')
    runCommand('stripe login --interactive', 'Stripe CLI OAuth login')

    const config = readStripeCliConfig()
    const profiles = config?.profiles || {}
    const profileNames = Object.keys(profiles)
    if (profileNames.length > 1) {
      console.log('\nMultiple Stripe CLI profiles detected:')
      profileNames.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`)
      })
      const choice = await question('Select a profile by number (or press Enter to use "default"): ')
      const choiceIndex = parseInt(choice, 10)
      if (!Number.isNaN(choiceIndex) && choiceIndex >= 1 && choiceIndex <= profileNames.length) {
        profileName = profileNames[choiceIndex - 1]
      } else if (choice && profileNames.includes(choice.trim())) {
        profileName = choice.trim()
      }
    } else if (profileNames.length === 1) {
      profileName = profileNames[0]
    }

    const profile = profiles[profileName] || profiles.default || null
    secretKey = extractStripeKey(profile, normalizedMode)
    publishableKey = extractStripePublishableKey(profile, normalizedMode)

    if (!secretKey) {
      console.warn('Stripe CLI login completed but no secret key was found for the selected mode.')
    }
    if (!publishableKey) {
      console.warn('Stripe CLI config did not contain a publishable key.')
    }
  }

  if (!secretKey) {
    secretKey = (await question(`Enter your Stripe ${normalizedMode} secret key: `)).trim()
  }
  if (!publishableKey) {
    publishableKey = (await question(`Enter your Stripe ${normalizedMode} publishable key: `)).trim()
  }

  if (!secretKey || !publishableKey) {
    throw new Error('Stripe secret and publishable keys are required to continue.')
  }

  return { secretKey, publishableKey }
}

async function setup() {
  console.log('OpenShop Setup Wizard')
  console.log('=====================\n')

  const projectNameInput = await question('Project name (e.g. my-store): ')
  const projectName = projectNameInput.trim()
  if (!projectName) {
    throw new Error('Project name is required.')
  }

  const sanitizedProjectName = sanitizeProjectName(projectName)
  console.log(`Using sanitized project name: ${sanitizedProjectName}`)

  ensureDirectory('toml')
  ensureWranglerInstalled()

  const cloudflareAuth = await authenticateWithCloudflare()

  console.log('\nStripe configuration:')
  const stripeModeInput = (await question('Use Stripe mode (test/live) [test]: ')).trim().toLowerCase()
  const stripeMode = stripeModeInput === 'live' ? 'live' : 'test'
  const stripeAuth = await authenticateWithStripe(stripeMode)

  console.log('\nOptional Google configuration (press Enter to skip fields):')
  const googleClientId = (await question('Google OAuth Client ID: ')).trim()
  const googleClientSecret = (await question('Google OAuth Client Secret: ')).trim()
  const googleApiKey = (await question('Google API Key: ')).trim()
  const driveRootFolderInput = (await question('Drive root folder [OpenShop]: ')).trim()
  const driveRootFolder = driveRootFolderInput || 'OpenShop'

  console.log('\nOptional AI configuration (press Enter to skip):')
  const geminiApiKey = (await question('Gemini API Key: ')).trim()

  console.log('\nAdmin configuration:')
  const adminPasswordInput = (await question('Admin password [admin123]: ')).trim()
  const adminPassword = adminPasswordInput || 'admin123'

  rl.close()

  console.log('\nPreparing Cloudflare Worker deployment...')

  const baseWranglerConfig = `name = "${sanitizedProjectName}"
main = "src/worker.js"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]

# KV namespace will be added after initial deployment

[vars]
SITE_URL = ""

[assets]
directory = "dist"
binding = "ASSETS"

[observability]
enabled = true
head_sampling_rate = 1
`
  writeFileSync('wrangler.toml', baseWranglerConfig)
  console.log('✓ Created initial wrangler.toml')

  runCommand('npm run build', 'Build project assets')
  runCommand('wrangler deploy', `Initial deployment for ${sanitizedProjectName}`)

  const kvNamespaceName = `${sanitizedProjectName.toUpperCase()}_KV`
  const kvCommand = cloudflareAuth.accountId
    ? `wrangler kv namespace create "${kvNamespaceName}" --account-id ${cloudflareAuth.accountId}`
    : `wrangler kv namespace create "${kvNamespaceName}"`
  const kvOutput = runCommandCapture(kvCommand, 'Create KV namespace')

  const kvIdMatch = kvOutput.match(/id\s*=\s*"([^"]+)"/) ||
    kvOutput.match(/ID:\s*([a-f0-9-]+)/i) ||
    kvOutput.match(/"id"\s*:\s*"([^"]+)"/) ||
    kvOutput.match(/([a-f0-9]{32})/)

  if (!kvIdMatch) {
    throw new Error(`Unable to extract KV namespace ID from Wrangler output:\n${kvOutput}`)
  }
  const kvId = kvIdMatch[1]
  console.log(`✓ KV namespace ${kvNamespaceName} (${kvId}) created`)

  let wranglerConfig = readFileSync('wrangler.toml', 'utf8')
  const kvSection = `
[[kv_namespaces]]
binding = "${kvNamespaceName}"
id = "${kvId}"
`
  wranglerConfig = wranglerConfig.replace(
    '# KV namespace will be added after initial deployment',
    kvSection.trim()
  )

  const siteUrl = `https://${sanitizedProjectName}.workers.dev`
  const vars = [
    `SITE_URL = "${siteUrl}"`,
    `ADMIN_PASSWORD = "${adminPassword}"`,
    `DRIVE_ROOT_FOLDER = "${driveRootFolder}"`,
    `STRIPE_SECRET_KEY = "${stripeAuth.secretKey}"`,
    `STRIPE_MODE = "${stripeMode}"`
  ]

  if (cloudflareAuth.accountId) {
    vars.push(`CLOUDFLARE_ACCOUNT_ID = "${cloudflareAuth.accountId}"`)
  }
  if (googleClientId) vars.push(`GOOGLE_CLIENT_ID = "${googleClientId}"`)
  if (googleClientSecret) vars.push(`GOOGLE_CLIENT_SECRET = "${googleClientSecret}"`)
  if (googleApiKey) vars.push(`GOOGLE_API_KEY = "${googleApiKey}"`)
  if (geminiApiKey) vars.push(`GEMINI_API_KEY = "${geminiApiKey}"`)

  wranglerConfig = wranglerConfig.replace(/SITE_URL = ""/, vars.join('\n'))
  writeFileSync('wrangler.toml', wranglerConfig)
  console.log('✓ Updated wrangler.toml with environment variables')

  runCommand('wrangler deploy', `Redeploy ${sanitizedProjectName} with KV binding`)

  const tomlPath = `toml/${sanitizedProjectName}.toml`
  writeFileSync(tomlPath, wranglerConfig)
  console.log(`✓ Saved site configuration to ${tomlPath}`)

  const envLines = [
    `STRIPE_SECRET_KEY=${stripeAuth.secretKey}`,
    `VITE_STRIPE_PUBLISHABLE_KEY=${stripeAuth.publishableKey}`,
    `ADMIN_PASSWORD=${adminPassword}`,
    `SITE_URL=${siteUrl}`,
    `DRIVE_ROOT_FOLDER=${driveRootFolder}`,
    `STRIPE_MODE=${stripeMode}`
  ]
  if (cloudflareAuth.accountId) envLines.push(`CLOUDFLARE_ACCOUNT_ID=${cloudflareAuth.accountId}`)
  if (googleClientId) envLines.push(`GOOGLE_CLIENT_ID=${googleClientId}`)
  if (googleClientSecret) envLines.push(`GOOGLE_CLIENT_SECRET=${googleClientSecret}`)
  if (googleApiKey) envLines.push(`GOOGLE_API_KEY=${googleApiKey}`)
  if (geminiApiKey) envLines.push(`GEMINI_API_KEY=${geminiApiKey}`)

  const envContent = `# Local development environment
${envLines.join('\n')}
`
  writeFileSync('.env', envContent)
  writeFileSync(`.env.${sanitizedProjectName}`, envContent)
  console.log('✓ Wrote .env files for local development')

  console.log('\nSetup complete!')
  console.log(`- Store URL: ${siteUrl}`)
  console.log(`- Admin dashboard: ${siteUrl}/admin`)
  console.log(`- KV namespace: ${kvNamespaceName}`)
}

setup().catch(error => {
  rl.close()
  console.error('\nSetup failed:', error.message)
  process.exit(1)
})
