#!/usr/bin/env node

import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

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
  const content = readFileSync(tomlPath, 'utf8')
  
  const nameMatch = content.match(/name = "([^"]+)"/)
  const urlMatch = content.match(/SITE_URL = "([^"]+)"/)
  const kvMatch = content.match(/binding = "([^"]+)"/)
  
  return {
    configFile: siteName,
    projectName: nameMatch ? nameMatch[1] : siteName,
    url: urlMatch ? urlMatch[1] : 'Not configured',
    kvBinding: kvMatch ? kvMatch[1] : 'Not configured'
  }
}

function listSites() {
  console.log('🏪 OpenShop - Available Sites')
  console.log('============================\n')
  
  const sites = getAvailableSites()
  
  if (sites.length === 0) {
    console.log('❌ No sites found in toml/ directory')
    console.log('\n💡 Run "npm run setup" to create a new site\n')
    return
  }
  
  console.log(`Found ${sites.length} site(s):\n`)
  
  sites.forEach((site, index) => {
    const info = getSiteInfo(site)
    console.log(`${index + 1}. ${info.configFile}`)
    console.log(`   Project: ${info.projectName}`)
    console.log(`   URL: ${info.url}`)
    console.log(`   KV Binding: ${info.kvBinding}`)
    console.log()
  })
  
  console.log('💡 To deploy a specific site:')
  console.log('   npm run deploy <site-name>')
  console.log('\n💡 To deploy with interactive selection:')
  console.log('   npm run deploy')
  console.log('\n💡 To create a new site:')
  console.log('   npm run setup\n')
}

listSites()

