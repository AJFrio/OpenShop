import { performance } from 'perf_hooks';

const FILE_TO_DATA_URL_DELAY = 15; // Simulate some delay reading files

async function fileToDataUrl(f) {
  await new Promise(resolve => setTimeout(resolve, FILE_TO_DATA_URL_DELAY));
  return `data:image/png;base64,mockbase64_${f.name}`;
}

function parseDataUrl(dataUrl) {
  return { mimeType: 'image/png', base64: 'mockbase64' };
}

async function sequential(files) {
  const inputs = [];
  for (const f of files.slice(0, 4)) {
    if (!f) continue;
    const dataUrl = await fileToDataUrl(f);
    const { mimeType, base64 } = parseDataUrl(dataUrl);
    inputs.push({ mimeType, dataBase64: base64 });
  }
  return inputs;
}

async function parallel(files) {
  const validFiles = files.slice(0, 4).filter(f => f);
  const inputs = await Promise.all(
    validFiles.map(async (f) => {
      const dataUrl = await fileToDataUrl(f);
      const { mimeType, base64 } = parseDataUrl(dataUrl);
      return { mimeType, dataBase64: base64 };
    })
  );
  return inputs;
}

async function runBenchmark() {
  const files = [
    { name: 'file1.png' },
    { name: 'file2.png' },
    { name: 'file3.png' },
    { name: 'file4.png' },
    { name: 'file5.png' },
  ];

  console.log(`Running benchmark with ${files.length} files (processing up to 4)...`);

  const startSeq = performance.now();
  await sequential(files);
  const endSeq = performance.now();
  const seqTime = endSeq - startSeq;
  console.log(`Sequential implementation: ${seqTime.toFixed(2)}ms`);

  const startPar = performance.now();
  await parallel(files);
  const endPar = performance.now();
  const parTime = endPar - startPar;
  console.log(`Parallel implementation: ${parTime.toFixed(2)}ms`);

  const improvement = ((seqTime - parTime) / seqTime) * 100;
  console.log(`Improvement: ${improvement.toFixed(2)}%`);
}

runBenchmark().catch(console.error);
