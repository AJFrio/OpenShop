
import { performance } from 'perf_hooks';

// Simulate the logic in AddMediaModal.jsx
async function blobToBase64(blob) {
  // Simulate FileReader and processing time
  await new Promise(resolve => setTimeout(resolve, 10));
  return { mimeType: 'image/png', base64: 'base64data' };
}

async function fetchSimulated(url) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    ok: true,
    blob: async () => ({ type: 'image/png' })
  };
}

async function sequential(refUrls) {
  const start = performance.now();
  const inputs = [];
  for (const url of refUrls.slice(0, 3)) {
    try {
      const proxied = `/api/image-proxy?src=${encodeURIComponent(url)}`;
      const resp = await fetchSimulated(proxied);
      if (!resp.ok) continue;
      const blob = await resp.blob();
      const { mimeType, base64 } = await blobToBase64(blob);
      if (base64) inputs.push({ mimeType, dataBase64: base64 });
    } catch (_) {}
  }
  const end = performance.now();
  return { duration: end - start, count: inputs.length };
}

async function parallel(refUrls) {
  const start = performance.now();

  const promises = refUrls.slice(0, 3).map(async (url) => {
    try {
      const proxied = `/api/image-proxy?src=${encodeURIComponent(url)}`;
      const resp = await fetchSimulated(proxied);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const { mimeType, base64 } = await blobToBase64(blob);
      if (base64) return { mimeType, dataBase64: base64 };
    } catch (_) {
      return null;
    }
    return null;
  });

  const results = await Promise.all(promises);
  const inputs = results.filter(Boolean);

  const end = performance.now();
  return { duration: end - start, count: inputs.length };
}

async function run() {
  const urls = ['url1', 'url2', 'url3'];

  console.log('Establishing baseline (Sequential)...');
  const seqResult = await sequential(urls);
  console.log(`Sequential: ${seqResult.duration.toFixed(2)}ms for ${seqResult.count} images`);

  console.log('\nMeasuring optimization (Parallel)...');
  const parResult = await parallel(urls);
  console.log(`Parallel: ${parResult.duration.toFixed(2)}ms for ${parResult.count} images`);

  const improvement = seqResult.duration - parResult.duration;
  const percent = (improvement / seqResult.duration) * 100;
  console.log(`\nImprovement: ${improvement.toFixed(2)}ms (${percent.toFixed(2)}%)`);
}

run().catch(console.error);
