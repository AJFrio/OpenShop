import { performance } from 'perf_hooks';

// Setup mock data
const NUM_COLLECTIONS = 100;
const NUM_PRODUCTS = 5000;

const collectionsData = Array.from({ length: NUM_COLLECTIONS }, (_, i) => ({
    id: `collection_${i}`,
    name: `Collection ${i}`
}));

const productsData = Array.from({ length: NUM_PRODUCTS }, (_, i) => ({
    id: `product_${i}`,
    collectionId: `collection_${Math.floor(Math.random() * NUM_COLLECTIONS)}`,
    name: `Product ${i}`
}));

function baseline() {
    const start = performance.now();
    const collectionsWithProducts = collectionsData.map(collection => ({
        ...collection,
        products: productsData.filter(product => product.collectionId === collection.id)
    }));
    return performance.now() - start;
}

function optimized() {
    const start = performance.now();
    const productsByCollectionId = productsData.reduce((acc, product) => {
        if (!acc[product.collectionId]) {
            acc[product.collectionId] = [];
        }
        acc[product.collectionId].push(product);
        return acc;
    }, {});

    const collectionsWithProducts = collectionsData.map(collection => ({
        ...collection,
        products: productsByCollectionId[collection.id] || []
    }));
    return performance.now() - start;
}

const iterations = 100;
let baselineTotal = 0;
let optimizedTotal = 0;

// Warmup
for (let i=0; i<10; i++) {
    baseline();
    optimized();
}

for (let i = 0; i < iterations; i++) {
    baselineTotal += baseline();
    optimizedTotal += optimized();
}

console.log(`Baseline Avg: ${(baselineTotal / iterations).toFixed(2)} ms`);
console.log(`Optimized Avg: ${(optimizedTotal / iterations).toFixed(2)} ms`);
