import { performance } from 'perf_hooks';

// Simulated delays
const FILE_TO_DATA_URL_DELAY = 10;
const UPLOAD_API_DELAY = 100;
const MEDIA_API_DELAY = 50;

// Mock functions
async function fileToDataUrl(f) {
  await new Promise(resolve => setTimeout(resolve, FILE_TO_DATA_URL_DELAY));
  return 'data:image/png;base64,mockbase64';
}

function parseDataUrl(dataUrl) {
  return { mimeType: 'image/png', base64: 'mockbase64' };
}

async function adminApiRequest(url, options) {
  const delay = url.includes('/storage/upload') ? UPLOAD_API_DELAY : MEDIA_API_DELAY;
  await new Promise(resolve => setTimeout(resolve, delay));
  return {
    ok: true,
    json: async () => ({
      viewUrl: 'http://example.com/image.png',
      id: 'mock-id'
    })
  };
}

// Current sequential implementation
async function uploadFileAndRecordSequential(files) {
  const createdItems = [];
  for (const f of files) {
    const dataUrl = await fileToDataUrl(f);
    const { mimeType, base64 } = parseDataUrl(dataUrl);
    const uploadRes = await adminApiRequest('/api/admin/storage/upload', {
      method: 'POST',
      body: JSON.stringify({ mimeType, dataBase64: base64, filename: f.name || 'image.png' })
    });
    const uploaded = await uploadRes.json();

    const mediaRes = await adminApiRequest('/api/admin/media', {
      method: 'POST',
      body: JSON.stringify({
        url: uploaded.viewUrl || uploaded.downloadUrl,
        source: 'storage',
        filename: f.name || 'image',
        mimeType: mimeType,
      })
    });
    const saved = await mediaRes.json();
    createdItems.push(saved);
  }
  return createdItems;
}

// Optimized parallel implementation
async function uploadFileAndRecordParallel(files) {
  return Promise.all(files.map(async (f) => {
    const dataUrl = await fileToDataUrl(f);
    const { mimeType, base64 } = parseDataUrl(dataUrl);
    const uploadRes = await adminApiRequest('/api/admin/storage/upload', {
      method: 'POST',
      body: JSON.stringify({ mimeType, dataBase64: base64, filename: f.name || 'image.png' })
    });
    const uploaded = await uploadRes.json();

    const mediaRes = await adminApiRequest('/api/admin/media', {
      method: 'POST',
      body: JSON.stringify({
        url: uploaded.viewUrl || uploaded.downloadUrl,
        source: 'storage',
        filename: f.name || 'image',
        mimeType: mimeType,
      })
    });
    return await mediaRes.json();
  }));
}

async function runBenchmark() {
  const files = [
    { name: 'file1.png' },
    { name: 'file2.png' },
    { name: 'file3.png' },
    { name: 'file4.png' },
    { name: 'file5.png' },
  ];

  console.log(`Running benchmark with ${files.length} files...`);

  const startSeq = performance.now();
  await uploadFileAndRecordSequential(files);
  const endSeq = performance.now();
  const seqTime = endSeq - startSeq;
  console.log(`Sequential implementation: ${seqTime.toFixed(2)}ms`);

  const startPar = performance.now();
  await uploadFileAndRecordParallel(files);
  const endPar = performance.now();
  const parTime = endPar - startPar;
  console.log(`Parallel implementation: ${parTime.toFixed(2)}ms`);

  const improvement = ((seqTime - parTime) / seqTime) * 100;
  console.log(`Improvement: ${improvement.toFixed(2)}%`);

  // Theoretical sequential time: 5 * (10 + 100 + 50) = 800ms
  // Theoretical parallel time: 1 * (10 + 100 + 50) = 160ms
}

runBenchmark().catch(console.error);
