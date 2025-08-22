const { 
  generateId, 
  decodeId, 
  extractTimestamp, 
  extractCounter,
  encodeBase64URL,
  decodeBase64URL
} = require('./index.js');

// Simple test framework
let tests = 0;
let passed = 0;

function test(description, testFn) {
  tests++;
  try {
    testFn();
    passed++;
    console.log(`✅ ${description}`);
  } catch (error) {
    console.log(`❌ ${description}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('Base64 ID Generator - Test Suite\n');

// Basic functionality tests
test('should generate valid Base64URL strings', () => {
  const id = generateId();
  assert(typeof id === 'string', 'ID should be string');
  assert(id.length === 11, 'ID should be 11 characters');
  assert(/^[A-Za-z0-9\-_]+$/.test(id), 'ID should contain only Base64URL characters');
});

test('should generate unique IDs', () => {
  const ids = new Set();
  for (let i = 0; i < 1000; i++) {
    ids.add(generateId());
  }
  assert(ids.size === 1000, 'All IDs should be unique');
});

test('should handle rapid generation without collisions', () => {
  const ids = new Set();
  for (let i = 0; i < 10000; i++) {
    ids.add(generateId());
  }
  const collisionRate = (10000 - ids.size) / 10000;
  assert(collisionRate === 0, `Zero collisions expected, got ${collisionRate * 100}%`);
});

// Encoding/Decoding tests
test('should correctly encode and decode Base64URL', () => {
  const testData = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0]);
  const encoded = encodeBase64URL(testData);
  const decoded = decodeBase64URL(encoded);
  
  assert(decoded.length === testData.length, 'Decoded length should match');
  for (let i = 0; i < testData.length; i++) {
    assert(decoded[i] === testData[i], `Byte ${i} should match`);
  }
});

test('should handle edge cases in encoding', () => {
  const testCases = [
    new Uint8Array([0x00, 0x00, 0x00]),
    new Uint8Array([0xFF, 0xFF, 0xFF]),
    new Uint8Array([0x12, 0x34]),
    new Uint8Array([0x12])
  ];
  
  testCases.forEach((data, index) => {
    const encoded = encodeBase64URL(data);
    const decoded = decodeBase64URL(encoded);
    assert(decoded.length === data.length, `Test case ${index} length should match`);
    for (let i = 0; i < data.length; i++) {
      assert(decoded[i] === data[i], `Test case ${index} byte ${i} should match`);
    }
  });
});

test('should reject invalid Base64URL characters', () => {
  let thrown = false;
  try {
    decodeBase64URL('ABC123+def'); // + is not valid in Base64URL
  } catch (e) {
    thrown = true;
  }
  assert(thrown, 'Should throw on invalid characters');
});

// Component extraction tests
test('should correctly extract timestamp and counter', () => {
  const id = generateId();
  const binary = decodeId(id);
  
  const timestamp = extractTimestamp(binary);
  const counter = extractCounter(binary);
  
  assert(typeof timestamp === 'bigint', 'Timestamp should be BigInt');
  assert(typeof counter === 'number', 'Counter should be number');
  assert(timestamp > 0n, 'Timestamp should be positive');
  assert(counter >= 0, 'Counter should be non-negative');
  assert(counter < 65536, 'Counter should be within 16-bit range');
});

test('should maintain timestamp precision', () => {
  const id1 = generateId();
  const id2 = generateId();
  
  const binary1 = decodeId(id1);
  const binary2 = decodeId(id2);
  
  const timestamp1 = extractTimestamp(binary1);
  const timestamp2 = extractTimestamp(binary2);
  
  const diff = timestamp2 - timestamp1;
  assert(diff >= 0n, 'Second timestamp should not be earlier');
  assert(diff < 1000n, 'Timestamps should be within reasonable range');
});

// Lexicographical sorting test
test('should maintain chronological order in lexicographical sorting', () => {
  const ids = [];
  
  // Generate IDs with small delays
  for (let i = 0; i < 10; i++) {
    ids.push(generateId());
    // Small delay to ensure different timestamps
    const start = Date.now();
    while (Date.now() - start < 2) {}
  }
  
  // Sort lexicographically
  const sortedIds = [...ids].sort();
  
  // Check chronological order is maintained
  let chronologicalErrors = 0;
  for (let i = 0; i < sortedIds.length - 1; i++) {
    const currentBinary = decodeId(sortedIds[i]);
    const nextBinary = decodeId(sortedIds[i + 1]);
    
    const currentTimestamp = extractTimestamp(currentBinary);
    const nextTimestamp = extractTimestamp(nextBinary);
    
    if (currentTimestamp > nextTimestamp) {
      chronologicalErrors++;
    }
  }
  
  assert(chronologicalErrors <= 1, `Chronological order should be mostly maintained, got ${chronologicalErrors} errors`);
});

// Performance test
test('should generate IDs at high performance', () => {
  const iterations = 100000;
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    generateId();
  }
  
  const end = performance.now();
  const duration = end - start;
  const idsPerSecond = iterations / (duration / 1000);
  
  assert(idsPerSecond > 100000, `Should generate at least 100k IDs/sec, got ${Math.round(idsPerSecond)}`);
});

// Stress test
test('should handle massive ID generation without issues', () => {
  const ids = new Set();
  const count = 100000;
  
  for (let i = 0; i < count; i++) {
    ids.add(generateId());
  }
  
  const collisionRate = (count - ids.size) / count;
  assert(collisionRate === 0, `Zero collisions expected in stress test, got ${collisionRate * 100}%`);
});

// Summary
console.log(`\n=== Test Results ===`);
console.log(`Tests run: ${tests}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${tests - passed}`);
console.log(`Success rate: ${(passed / tests * 100).toFixed(1)}%`);

if (passed === tests) {
  console.log('\n🎉 All tests passed! The implementation is working correctly.');
} else {
  console.log('\n❌ Some tests failed. Please review the implementation.');
  process.exit(1);
}
