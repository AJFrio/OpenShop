#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync, readdirSync, existsSync, unlinkSync, writeFileSync } from 'fs'
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

function execCommand(command, description, allowFailure = false) {
  console.log(`\n🔄 ${description}...`)
  try {
    execSync(command, { stdio: 'inherit' })
    console.log(`✅ ${description} completed`)
    return true
  } catch (error) {
    if (allowFailure) {
      console.warn(`⚠️  ${description} failed (continuing):`, error.message)
      return false
    } else {
      console.error(`❌ ${description} failed:`, error.message)
      throw error
    }
  }
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

function getSiteInfo(siteName) {
  const tomlPath = join('toml', `${siteName}.toml`)
  if (!existsSync(tomlPath)) {
    return null
  }
  
  const content = readFileSync(tomlPath, 'utf8')
  
  const nameMatch = content.match(/name = "([^"]+)"/)
  const kvIdMatch = content.match(/id = "([^"]+)"/)
  const kvBindingMatch = content.match(/binding = "([^"]+)"/)
  
  return {
    configFile: siteName,
    projectName: nameMatch ? nameMatch[1] : siteName,
    kvNamespaceId: kvIdMatch ? kvIdMatch[1] : null,
    kvBinding: kvBindingMatch ? kvBindingMatch[1] : null
  }
}

async function deleteSite() {
  console.log('🗑️  OpenShop - Delete Site')
  console.log('==========================\n')

  // Get available sites
  const sites = getAvailableSites()
  
  if (sites.length === 0) {
    console.error('❌ No sites found in toml/ directory')
    console.log('💡 Run "npm run setup" to create a new site')
    rl.close()
    process.exit(1)
  }
  
  // Display available sites
  console.log('📁 Available sites:')
  sites.forEach((site, index) => {
    const info = getSiteInfo(site)
    if (info) {
      console.log(`   ${index + 1}. ${site} (${info.projectName})`)
    } else {
      console.log(`   ${index + 1}. ${site}`)
    }
  })
  
  // Ask user which site to delete
  const answer = await question('\n⚠️  Which site do you want to DELETE? (number or name): ')
  rl.close()
  
  let siteName
  const siteIndex = parseInt(answer) - 1
  if (!isNaN(siteIndex) && siteIndex >= 0 && siteIndex < sites.length) {
    siteName = sites[siteIndex]
  } else {
    siteName = answer.trim()
  }

  // Verify site exists
  const siteInfo = getSiteInfo(siteName)
  if (!siteInfo) {
    console.error(`❌ Site "${siteName}" not found`)
    process.exit(1)
  }

  // Confirm deletion
  console.log(`\n⚠️  WARNING: You are about to delete site "${siteName}"`)
  console.log(`   Project: ${siteInfo.projectName}`)
  if (siteInfo.kvBinding) {
    console.log(`   KV Namespace: ${siteInfo.kvBinding}`)
  }
  console.log('\n   This will:')
  console.log('   - Delete the Cloudflare Worker')
  console.log('   - Delete the KV namespace')
  console.log('   - Remove local configuration files')
  console.log('\n   This action CANNOT be undone!\n')
  
  const rl2 = createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  const confirm = await new Promise(resolve => {
    rl2.question('Type "DELETE" to confirm: ', resolve)
  })
  rl2.close()
  
  if (confirm.trim() !== 'DELETE') {
    console.log('\n❌ Deletion cancelled')
    process.exit(0)
  }

  console.log(`\n🗑️  Deleting site "${siteName}"...\n`)

  // Step 1: Delete Worker first
  // We delete the worker before the KV namespace to avoid dependency issues
  // We need to temporarily set up wrangler.toml to delete the worker
  const tomlPath = join('toml', `${siteName}.toml`)
  const tomlContent = readFileSync(tomlPath, 'utf8')
  
  // Write temporary wrangler.toml for deletion
  const originalWranglerToml = existsSync('wrangler.toml') ? readFileSync('wrangler.toml', 'utf8') : null
  try {
    // Write the site's toml to root for wrangler commands
    writeFileSync('wrangler.toml', tomlContent)
    
    console.log(`⚡ Deleting Cloudflare Worker "${siteInfo.projectName}"...`)
    execCommand(
      `wrangler delete --force`,
      `Deleting Worker "${siteInfo.projectName}"`,
      true // Allow failure in case worker was already deleted
    )
  } catch (error) {
    console.warn(`⚠️  Could not delete Worker (may already be deleted): ${error.message}`)
  } finally {
    // Restore original wrangler.toml or remove temporary one
    if (originalWranglerToml) {
      writeFileSync('wrangler.toml', originalWranglerToml)
    } else if (existsSync('wrangler.toml')) {
      try {
        unlinkSync('wrangler.toml')
      } catch (e) {
        // Ignore errors removing temp file
      }
    }
  }

  // Step 2: Delete KV namespace if it exists
  if (siteInfo.kvNamespaceId && siteInfo.kvBinding) {
    console.log(`🗃️  Deleting KV namespace "${siteInfo.kvBinding}" (ID: ${siteInfo.kvNamespaceId})...`)
    execCommand(
      `wrangler kv namespace delete --namespace-id "${siteInfo.kvNamespaceId}"`,
      `Deleting KV namespace "${siteInfo.kvBinding}"`,
      true // Allow failure in case namespace was already deleted
    )
  } else {
    console.log('⚠️  No KV namespace information found in configuration')
  }

  // Step 3: Delete local files
  console.log(`\n📁 Deleting local files...`)
  
  // Delete toml file
  const tomlFilePath = join('toml', `${siteName}.toml`)
  if (existsSync(tomlFilePath)) {
    try {
      unlinkSync(tomlFilePath)
      console.log(`✅ Deleted: ${tomlFilePath}`)
    } catch (error) {
      console.warn(`⚠️  Could not delete ${tomlFilePath}: ${error.message}`)
    }
  }

  // Delete env file
  const envFilePath = `.env.${siteName}`
  if (existsSync(envFilePath)) {
    try {
      unlinkSync(envFilePath)
      console.log(`✅ Deleted: ${envFilePath}`)
    } catch (error) {
      console.warn(`⚠️  Could not delete ${envFilePath}: ${error.message}`)
    }
  }

  console.log('\n🎉 Site deletion completed!')
  console.log(`\n✅ Removed site "${siteName}"`)
  console.log('   - Cloudflare Worker (if it existed)')
  console.log('   - KV namespace (if it existed)')
  console.log('   - Local configuration files')
  console.log('\n💡 Note: If deletion of Cloudflare resources failed, you may need to delete them manually from the Cloudflare dashboard.')
}

deleteSite().catch(error => {
  console.error('\n❌ Deletion failed:', error.message)
  rl.close()
  process.exit(1)
})

