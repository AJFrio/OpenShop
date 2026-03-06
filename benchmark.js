import React, { useMemo, useState } from 'react';

// A synthetic version of the work we want to measure
function runBenchmark() {
  const collectionCount = 100;
  const productCount = 1000;
  const iterations = 10000;

  const collectionsData = Array.from({ length: collectionCount }, (_, i) => ({ id: `col-${i}`, name: `Collection ${i}` }));
  const productsData = Array.from({ length: productCount }, (_, i) => ({ id: `prod-${i}`, name: `Product ${i}`, collectionId: `col-${i % collectionCount}` }));

  console.time('baseline');
  for (let i = 0; i < iterations; i++) {
    const collectionsWithProducts = collectionsData.map(collection => ({
      ...collection,
      products: productsData.filter(product => product.collectionId === collection.id)
    }));
  }
  console.timeEnd('baseline');
}

runBenchmark();
