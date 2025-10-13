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

async function deploy() {
  console.log('🚀 OpenShop Deployment')
  console.log('======================\n')

  // Get site name from command line argument or prompt
  let siteName = process.argv[2]
  
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
  }

  // Select and load the toml file
  const tomlContent = selectTomlFile(siteName)
  
  // Read project name from the selected toml
  let projectName = siteName
  const nameMatch = tomlContent.match(/name = "([^"]+)"/)
  if (nameMatch) {
    projectName = nameMatch[1]
  }
  
  console.log(`📋 Deploying project: ${projectName}\n`)

  // Build the project
  execCommand('npm run build', 'Building project')

  // Deploy Cloudflare Worker
  execCommand(`wrangler deploy`, `Deploying Cloudflare Worker (${projectName})`)

  console.log('\n🎉 Deployment completed successfully!')
  console.log(`\n💡 Your changes are now live at: https://${projectName}.workers.dev`)
  process.exit(0)
}

deploy().catch(error => {
  console.error('\n❌ Deployment failed:', error.message)
  rl.close()
  process.exit(1)
})
