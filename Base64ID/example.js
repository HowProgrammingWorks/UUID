const { generateId, decodeId, extractTimestamp, extractCounter } = require('./index.js');

console.log('Base64 ID Generator - Educational Example\n');

// Basic usage
console.log('=== Basic Usage ===');
const id = generateId();
console.log(`Generated ID: ${id}`);
console.log(`Length: ${id.length} characters`);

// Decoding and analysis
console.log('\n=== ID Analysis ===');
const binary = decodeId(id);
const timestamp = extractTimestamp(binary);
const counter = extractCounter(binary);

console.log(`Timestamp: ${timestamp} (${new Date(Number(timestamp)).toISOString()})`);
console.log(`Counter: ${counter}`);
console.log(`Binary: [${Array.from(binary).map(b => b.toString(16).padStart(2, '0')).join(' ')}]`);

// Multiple ID generation
console.log('\n=== Multiple IDs ===');
console.log('Generated IDs:');
for (let i = 0; i < 5; i++) {
  console.log(`  ${generateId()}`);
}

// Lexicographical sorting demonstration
console.log('\n=== Lexicographical Sorting ===');
const ids = [];
for (let i = 0; i < 5; i++) {
  ids.push(generateId());
  // Small delay to ensure different timestamps
  const start = Date.now();
  while (Date.now() - start < 3) {}
}

console.log('Original order:');
ids.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));

console.log('Sorted order:');
const sortedIds = [...ids].sort();
sortedIds.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));

console.log(`Chronological order maintained: ${JSON.stringify(ids) === JSON.stringify(sortedIds)}`);

// Performance demonstration
console.log('\n=== Performance Test ===');
const iterations = 100000;
console.log(`Generating ${iterations.toLocaleString()} IDs...`);

const start = performance.now();
const testIds = new Set();
for (let i = 0; i < iterations; i++) {
  testIds.add(generateId());
}
const end = performance.now();

const duration = end - start;
const idsPerSecond = Math.round(iterations / (duration / 1000));

console.log(`Time: ${Math.round(duration)}ms`);
console.log(`Performance: ${idsPerSecond.toLocaleString()} IDs/second`);
console.log(`Unique IDs: ${testIds.size.toLocaleString()}/${iterations.toLocaleString()}`);
console.log(`Collision rate: ${((iterations - testIds.size) / iterations * 100).toFixed(6)}%`);

// Architecture demonstration
console.log('\n=== Architecture Benefits ===');
console.log('✅ Single crypto call at startup (not per ID)');
console.log('✅ Deterministic sequence ensures zero collisions');
console.log('✅ High-resolution timestamps for ordering');
console.log('✅ Custom Base64URL encoding for efficiency');
console.log('✅ 64-bit design balances range and performance');
