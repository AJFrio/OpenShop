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
 * Sanitize path for GitHub release asset name
 * GitHub asset names can't contain /, so we replace with -
 */
function sanitizeAssetName(path) {
  // Ensure path starts with / for consistency
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  // Replace / with - and remove leading - if any
  return `asset-${normalizedPath.replace(/\//g, '-').replace(/^-/, '')}`;
}

/**
 * Generate asset manifest for GitHub release
 */
async function generateManifest() {
  console.log('📝 Generating asset manifest...');
  console.log(`📁 Scanning directory: ${distDir}`);

  try {
    const files = await getAllFiles(distDir);
    console.log(`Found ${files.length} files to process`);

    const manifest = {
      files: []
    };

    for (const { fullPath, relativePath } of files) {
      try {
        const stats = await stat(fullPath);
        const hash = await calculateFileHash(fullPath);
        
        // Normalize path to start with /
        const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
        const assetName = sanitizeAssetName(relativePath);
        
        manifest.files.push({
          path: normalizedPath,
          assetName: assetName,
          size: stats.size,
          hash: hash
        });

        console.log(`  ✓ ${relativePath} → ${assetName} (${stats.size} bytes)`);
      } catch (error) {
        console.error(`  ✗ Failed to process ${relativePath}:`, error);
      }
    }

    // Write asset-manifest.json (for GitHub release)
    const assetManifestPath = join(rootDir, 'assets-manifest.json');
    await writeFile(assetManifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`✅ Assets manifest generated: ${assetManifestPath}`);

    // Also write asset-manifest.json in dist (for backwards compatibility)
    const distManifestPath = join(distDir, 'asset-manifest.json');
    const distManifest = {};
    for (const file of manifest.files) {
      distManifest[file.path] = {
        hash: file.hash,
        size: file.size,
      };
    }
    await writeFile(distManifestPath, JSON.stringify(distManifest, null, 2), 'utf8');
    console.log(`✅ Dist manifest generated: ${distManifestPath}`);
    
    console.log(`   Total files: ${manifest.files.length}`);
    
    return manifest;
  } catch (error) {
    console.error('❌ Failed to generate manifest:', error);
    process.exit(1);
  }
}

generateManifest();

