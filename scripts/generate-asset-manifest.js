#!/usr/bin/env node

import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');

/**
 * Recursively read all files in a directory
 */
async function getAllFiles(dir, baseDir = dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    
    // Skip worker.bundle.js as it's handled separately
    if (entry.name === 'worker.bundle.js') {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else if (entry.isFile()) {
      const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/');
      files.push({ fullPath, relativePath });
    }
  }

  return files;
}

/**
 * Calculate SHA-256 hash of file content
 */
async function calculateFileHash(filePath) {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate asset manifest
 */
async function generateManifest() {
  console.log('📝 Generating asset manifest...');
  console.log(`📁 Scanning directory: ${distDir}`);

  try {
    const files = await getAllFiles(distDir);
    console.log(`Found ${files.length} files to process`);

    const manifest = {};

    for (const { fullPath, relativePath } of files) {
      try {
        const stats = await stat(fullPath);
        const hash = await calculateFileHash(fullPath);
        
        manifest[relativePath] = {
          hash,
          size: stats.size,
        };

        console.log(`  ✓ ${relativePath} (${stats.size} bytes, hash: ${hash.substring(0, 8)}...)`);
      } catch (error) {
        console.error(`  ✗ Failed to process ${relativePath}:`, error);
      }
    }

    const manifestPath = join(distDir, 'asset-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    console.log(`✅ Manifest generated: ${manifestPath}`);
    console.log(`   Total files: ${Object.keys(manifest).length}`);
    
    return manifest;
  } catch (error) {
    console.error('❌ Failed to generate manifest:', error);
    process.exit(1);
  }
}

generateManifest();

