import { normalizeImageUrl } from '../src/lib/utils.js'

const ITERATIONS = 100000;

const testCases = [
  { name: 'Empty string', url: '' },
  { name: 'Simple URL', url: 'https://example.com/image.jpg' },
  { name: 'Google Drive URL', url: 'https://drive.google.com/file/d/1234567890abcdef/view?usp=sharing' },
];

console.log(`Running benchmark with ${ITERATIONS} iterations...`);

for (const { name, url } of testCases) {
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    normalizeImageUrl(url);
  }
  const end = performance.now();
  console.log(`${name}: ${(end - start).toFixed(2)}ms`);
}

// Simulate cached access
const cachedUrl = 'https://drive.google.com/file/d/1234567890abcdef/view?usp=sharing';
const normalizedCached = normalizeImageUrl(cachedUrl);
const startCached = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const _ = normalizedCached;
}
const endCached = performance.now();
console.log(`Cached access (simulated): ${(endCached - startCached).toFixed(2)}ms`);
