'use strict';

const original = require('./gpt-5.js');
const optimized = require('./optimized.js');

const benchmark = (name, fn, iterations) => {
  // Warmup
  for (let i = 0; i < 1000; i++) fn();

  // Actual benchmark
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = process.hrtime.bigint();

  const timeMs = Number(end - start) / 1e6;
  const opsPerSec = (iterations / timeMs) * 1000;

  console.log(`${name}:`);
  console.log(`  Time: ${timeMs.toFixed(2)}ms`);
  console.log(`  Ops/sec: ${opsPerSec.toFixed(0)}`);
  const avgTime = ((timeMs / iterations) * 1000).toFixed(3);
  console.log(`  Avg time per op: ${avgTime}μs`);

  return { timeMs, opsPerSec };
};

const iterations = 100000;

console.log(`\nBenchmark: ${iterations} UUID generations\n`);
console.log('='.repeat(50));

const originalResult = benchmark(
  'Original (gpt-5.js)',
  () => original.generateV7Base64Url(),
  iterations,
);

console.log('');

const optimizedResult = benchmark(
  'Optimized',
  () => optimized.generateV7Base64Url(),
  iterations,
);

console.log('');

const batchResult = benchmark(
  'Batch (10 at once)',
  () => optimized.generateBatch(10),
  iterations / 10,
);

console.log('\n' + '='.repeat(50));
console.log('\nSummary:');
const perfGain = (
  (optimizedResult.opsPerSec / originalResult.opsPerSec - 1) *
  100
).toFixed(1);
console.log(`  Performance gain: ${perfGain}%`);
const batchEff = (
  ((batchResult.opsPerSec * 10) / optimizedResult.opsPerSec - 1) *
  100
).toFixed(1);
console.log(`  Batch efficiency: ${batchEff}% faster per UUID`);
