#!/usr/bin/env node

import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Read package.json for version
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))

async function buildWorker() {
  console.log('🔨 Building worker bundle...')

  try {
    // Ensure dist directory exists
    const distDir = join(rootDir, 'dist')
    mkdirSync(distDir, { recursive: true })

    await build({
      entryPoints: [join(rootDir, 'src/worker.js')],
      bundle: true,
      platform: 'neutral',
      format: 'esm',
      target: 'es2022',
      outfile: join(distDir, 'worker.bundle.js'),
      minify: true,
      sourcemap: false,
      external: [
        // Cloudflare runtime APIs are provided by the runtime
        '@cloudflare/workers-types'
      ],
      plugins: [
        {
          name: 'node-builtins-polyfill',
          setup(build) {
            // Handle Node.js built-in modules that Stripe tries to import
            const nodeBuiltins = ['crypto', 'events', 'child_process', 'http', 'https']
            
            nodeBuiltins.forEach(module => {
              build.onResolve({ filter: new RegExp(`^${module}$`) }, () => {
                return { path: module, namespace: 'node-builtin-polyfill' }
              })
            })
            
            // Provide polyfills for Node.js built-ins
            build.onLoad({ filter: /.*/, namespace: 'node-builtin-polyfill' }, (args) => {
              const moduleName = args.path
              
              if (moduleName === 'crypto') {
                // Use Web Crypto API available in Workers
                return {
                  contents: `
                    // Crypto polyfill using Web Crypto API
                    const cryptoImpl = globalThis.crypto || {};
                    export const randomBytes = (size) => {
                      const arr = new Uint8Array(size);
                      cryptoImpl.getRandomValues(arr);
                      return arr;
                    };
                    export const createHash = (algorithm) => ({
                      update: () => {},
                      digest: (encoding) => ''
                    });
                    export default cryptoImpl;
                  `,
                  loader: 'js'
                }
              }
              
              if (moduleName === 'events') {
                return {
                  contents: `
                    // Events polyfill - minimal EventEmitter stub
                    export class EventEmitter {
                      constructor() {}
                      on() { return this; }
                      emit() { return false; }
                      once() { return this; }
                      removeListener() { return this; }
                    }
                    export default EventEmitter;
                  `,
                  loader: 'js'
                }
              }
              
              if (moduleName === 'child_process') {
                return {
                  contents: `
                    // child_process stub - not used in Workers
                    export const exec = () => Promise.resolve({ stdout: '', stderr: '' });
                    export default {};
                  `,
                  loader: 'js'
                }
              }
              
              if (moduleName === 'http' || moduleName === 'https') {
                return {
                  contents: `
                    // HTTP/HTTPS stubs - Workers use fetch API instead
                    export default {};
                    export const request = () => {};
                    export const get = () => {};
                  `,
                  loader: 'js'
                }
              }
              
              return {
                contents: `export default {};`,
                loader: 'js'
              }
            })
          }
        },
        {
          name: 'qs-polyfill',
          setup(build) {
            // Handle qs package - provide a minimal implementation
            build.onResolve({ filter: /^qs$/ }, () => {
              return { path: 'qs', namespace: 'qs-polyfill' }
            })
            
            build.onLoad({ filter: /.*/, namespace: 'qs-polyfill' }, () => {
              return {
                contents: `
                  // Minimal qs polyfill for Workers
                  export const stringify = (obj) => {
                    return new URLSearchParams(obj).toString();
                  };
                  export const parse = (str) => {
                    const params = new URLSearchParams(str);
                    const result = {};
                    for (const [key, value] of params) {
                      result[key] = value;
                    }
                    return result;
                  };
                  export default { stringify, parse };
                `,
                loader: 'js'
              }
            })
          }
        }
      ]
    })

    // Add build banner comment
    const bundlePath = join(distDir, 'worker.bundle.js')
    let content = readFileSync(bundlePath, 'utf8')
    
    const banner = `// Worker Bundle - Built ${new Date().toISOString()}\n// Version: ${packageJson.version}\n`
    content = banner + content
    
    writeFileSync(bundlePath, content, 'utf8')

    console.log('✅ Worker bundle created: dist/worker.bundle.js')
  } catch (error) {
    console.error('❌ Worker build failed:', error)
    process.exit(1)
  }
}

buildWorker()

