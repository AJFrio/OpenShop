
import { KVManager } from '../src/lib/kv.js';
import { performance } from 'perf_hooks';

// Mock KV namespace that counts operations
function createCountingMockKV() {
  const store = new Map();
  let counts = { get: 0, put: 0, delete: 0, list: 0 };

  return {
    get: async (key) => {
      counts.get++;
      return store.get(key) || null;
    },
    put: async (key, value) => {
      counts.put++;
      store.set(key, value);
    },
    delete: async (key) => {
      counts.delete++;
      store.delete(key);
    },
    list: async (options) => {
      counts.list++;
      const keys = Array.from(store.keys());
      const filtered = options?.prefix
        ? keys.filter(k => k.startsWith(options.prefix))
        : keys;
      return {
        keys: filtered.map(key => ({ name: key })),
        list_complete: true,
        cursor: ''
      };
    },
    getCounts: () => ({ ...counts }),
    resetCounts: () => {
      counts = { get: 0, put: 0, delete: 0, list: 0 };
    }
  };
}

async function runBenchmark() {
  const kv = createCountingMockKV();
  const kvManager = new KVManager(kv);

  const productCount = 1000;
  const collectionCount = 10;
  const targetCollectionId = 'coll_target';

  console.log(`Setting up benchmark with ${productCount} products across ${collectionCount} collections...`);

  // Create products
  const productIds = [];
  for (let i = 0; i < productCount; i++) {
    const collId = i < 100 ? targetCollectionId : `coll_${i % (collectionCount - 1)}`;
    const product = {
      id: `prod_${i}`,
      name: `Product ${i}`,
      collectionId: collId
    };
    await kvManager.createProduct(product);
    productIds.push(product.id);
  }

  kv.resetCounts();

  console.log(`\nBenchmarking getProductsByCollection for '${targetCollectionId}' (contains 100 products)...`);

  const start = performance.now();
  const products = await kvManager.getProductsByCollection(targetCollectionId);
  const end = performance.now();

  const counts = kv.getCounts();

  console.log(`Results:`);
  console.log(`- Found: ${products.length} products`);
  console.log(`- Time: ${(end - start).toFixed(2)}ms`);
  console.log(`- KV Get calls: ${counts.get}`);
  console.log(`- KV Put calls: ${counts.put}`);
  console.log(`- KV Delete calls: ${counts.delete}`);
  console.log(`- KV List calls: ${counts.list}`);
  console.log(`- Total KV calls: ${counts.get + counts.put + counts.delete + counts.list}`);
}

runBenchmark().catch(console.error);
