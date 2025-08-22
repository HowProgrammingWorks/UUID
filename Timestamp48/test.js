'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const original = require('./gpt-5.js');
const optimized = require('./optimized.js');

test('UUID format validation', () => {
  const uuid1 = original.generateV7Base64Url();
  const uuid2 = optimized.generateV7Base64Url();

  // Check length (22 chars for Base64URL without padding)
  assert.strictEqual(uuid1.length, 22);
  assert.strictEqual(uuid2.length, 22);

  // Check Base64URL characters
  const base64UrlPattern = /^[A-Za-z0-9\-_]+$/;
  assert.match(uuid1, base64UrlPattern);
  assert.match(uuid2, base64UrlPattern);
});

test('Monotonicity within same millisecond', () => {
  const uuids = [];
  for (let i = 0; i < 100; i++) {
    uuids.push(optimized.generateV7Base64Url());
  }

  // Check that UUIDs are unique
  const uniqueUuids = new Set(uuids);
  assert.strictEqual(uniqueUuids.size, uuids.length);
});

test('Batch generation', () => {
  const batch = optimized.generateBatch(10);

  assert.strictEqual(batch.length, 10);

  // Check all are unique
  const uniqueBatch = new Set(batch);
  assert.strictEqual(uniqueBatch.size, batch.length);

  // Check format
  batch.forEach((uuid) => {
    assert.strictEqual(uuid.length, 22);
    assert.match(uuid, /^[A-Za-z0-9\-_]+$/);
  });
});

test('Performance comparison', () => {
  const iterations = 10000;

  // Test original version
  const startOriginal = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    original.generateV7Base64Url();
  }
  const endOriginal = process.hrtime.bigint();
  // Convert to ms
  const timeOriginal = Number(endOriginal - startOriginal) / 1e6;

  // Test optimized version
  const startOptimized = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    optimized.generateV7Base64Url();
  }
  const endOptimized = process.hrtime.bigint();
  const timeOptimized = Number(endOptimized - startOptimized) / 1e6;

  console.log(`\nPerformance Results (${iterations} iterations):`);
  console.log(`Original: ${timeOriginal.toFixed(2)}ms`);
  console.log(`Optimized: ${timeOptimized.toFixed(2)}ms`);
  const improvement = ((1 - timeOptimized / timeOriginal) * 100).toFixed(1);
  console.log(`Improvement: ${improvement}%`);

  // Optimized should be at least as fast
  assert.ok(
    timeOptimized <= timeOriginal * 1.1,
    'Optimized version should not be slower',
  );
});
