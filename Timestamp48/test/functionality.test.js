'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { Timestamp48, Timestamp48Error } = require('../src/index.js');

describe('Timestamp48 Functionality', () => {
  describe('UUIDv7 Standard Compliance', () => {
    test('generates valid 48-bit timestamp portion', () => {
      const id = Timestamp48.generate();
      const decoded = Timestamp48.decode(id);
      const now = Date.now();
      
      // Should be within reasonable time window (10ms)
      assert.ok(Math.abs(decoded - now) < 10);
      assert.ok(decoded > 0);
      assert.ok(decoded < Math.pow(2, 48)); // 48-bit limit
    });
    
    test('maintains chronological ordering', () => {
      const ids = [];
      
      for (let i = 0; i < 100; i++) {
        ids.push(Timestamp48.generate());
        // Small delay every 10 iterations to ensure different timestamps
        if (i % 10 === 0 && i > 0) {
          // Busy wait for 1ms
          const start = Date.now();
          while (Date.now() - start < 1) {
            // Wait
          }
        }
      }
      
      const timestamps = ids.map(id => Timestamp48.decode(id));
      const sorted = [...timestamps].sort((a, b) => a - b);
      
      assert.deepStrictEqual(timestamps, sorted);
    });
    
    test('handles timestamp range correctly', () => {
      const minTimestamp = 0;
      const maxTimestamp = Math.pow(2, 48) - 1;
      
      // Test encoding/decoding edge cases
      const encoded1 = Timestamp48._encodeTimestamp(minTimestamp);
      const encoded2 = Timestamp48._encodeTimestamp(maxTimestamp);
      
      assert.strictEqual(Timestamp48.decode(encoded1), minTimestamp);
      assert.strictEqual(Timestamp48.decode(encoded2), maxTimestamp);
    });
  });
  
  describe('Base64URL Encoding', () => {
    test('produces 8-character URL-safe output', () => {
      const id = Timestamp48.generate();
      
      // Must be exactly 8 characters
      assert.strictEqual(id.length, 8);
      
      // Must match Base64URL character set
      assert.match(id, /^[A-Za-z0-9_-]{8}$/);
      
      // Should not contain padding
      assert.ok(!id.includes('='));
    });
    
    test('roundtrip encoding preserves value', () => {
      const testValues = [
        0,
        1,
        1000,
        Date.now(),
        Date.now() - 86400000, // 24 hours ago
        Math.pow(2, 32),
        Math.pow(2, 40),
        Math.pow(2, 47) // Near max value
      ];
      
      for (const original of testValues) {
        const encoded = Timestamp48._encodeTimestamp(original);
        const decoded = Timestamp48.decode(encoded);
        assert.strictEqual(decoded, original, `Failed for value ${original}`);
      }
    });
    
    test('encodes different timestamps to different values', () => {
      const encoded1 = Timestamp48._encodeTimestamp(1000);
      const encoded2 = Timestamp48._encodeTimestamp(2000);
      
      assert.notStrictEqual(encoded1, encoded2);
    });
    
    test('validates Base64URL character set', () => {
      const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      
      for (let i = 0; i < 1000; i++) {
        const id = Timestamp48.generate();
        for (const char of id) {
          assert.ok(validChars.includes(char), `Invalid character: ${char}`);
        }
      }
    });
  });
  
  describe('Collision Handling', () => {
    test('handles same-millisecond collisions', () => {
      const ids = new Set();
      
      // Generate many IDs rapidly to force collisions
      for (let i = 0; i < 1000; i++) {
        ids.add(Timestamp48.generate());
      }
      
      // All IDs should be unique
      assert.strictEqual(ids.size, 1000);
    });
    
    test('collision counter increments correctly', () => {
      // Reset internal state
      Timestamp48._lastMs = 0;
      Timestamp48._counter = 0;
      
      const now = Date.now();
      
      // Force same timestamp
      Timestamp48._lastMs = now;
      
      const id1 = Timestamp48.generate();
      const id2 = Timestamp48.generate();
      
      // IDs should be different even with same base timestamp
      assert.notStrictEqual(id1, id2);
    });
    
    test('handles counter overflow gracefully', () => {
      // Force counter to near max
      Timestamp48._counter = 0xFFE;
      
      const ids = [];
      for (let i = 0; i < 10; i++) {
        ids.push(Timestamp48.generate());
      }
      
      // Should handle overflow without duplicates
      const uniqueIds = new Set(ids);
      assert.strictEqual(uniqueIds.size, ids.length);
    });
  });
  
  describe('Validation and Error Handling', () => {
    test('isValid returns true for valid IDs', () => {
      for (let i = 0; i < 100; i++) {
        const id = Timestamp48.generate();
        assert.ok(Timestamp48.isValid(id));
      }
    });
    
    test('isValid returns false for invalid formats', () => {
      const invalidInputs = [
        '', // Empty
        'short', // Too short
        'toolongstring', // Too long
        'invalid!', // Invalid characters
        'AAAAAAAA=', // Has padding
        'AAAAAAA+', // Invalid Base64URL character
        null, // Wrong type
        undefined, // Wrong type
        123, // Wrong type
        {}  // Wrong type
      ];
      
      for (const invalid of invalidInputs) {
        assert.strictEqual(Timestamp48.isValid(invalid), false, 
          `Should be invalid: ${invalid}`);
      }
    });
    
    test('decode throws on invalid input', () => {
      assert.throws(() => Timestamp48.decode(''), Timestamp48Error);
      assert.throws(() => Timestamp48.decode('short'), Timestamp48Error);
      assert.throws(() => Timestamp48.decode('invalid!'), Timestamp48Error);
      assert.throws(() => Timestamp48.decode(null), TypeError);
    });
    
    test('Timestamp48Error has correct properties', () => {
      const error = new Timestamp48Error('Test message', 'TEST_CODE');
      
      assert.strictEqual(error.name, 'Timestamp48Error');
      assert.strictEqual(error.message, 'Test message');
      assert.strictEqual(error.code, 'TEST_CODE');
      assert.ok(error instanceof Error);
      assert.ok(error instanceof Timestamp48Error);
    });
  });
  
  describe('Comparison and Utility Functions', () => {
    test('compare returns correct ordering', () => {
      const id1 = Timestamp48._encodeTimestamp(1000);
      const id2 = Timestamp48._encodeTimestamp(2000);
      const id3 = Timestamp48._encodeTimestamp(2000);
      
      assert.strictEqual(Timestamp48.compare(id1, id2), -1);
      assert.strictEqual(Timestamp48.compare(id2, id1), 1);
      assert.strictEqual(Timestamp48.compare(id2, id3), 0);
    });
    
    test('compare maintains chronological order', () => {
      const ids = [];
      
      // Generate with small delays
      for (let i = 0; i < 50; i++) {
        ids.push(Timestamp48.generate());
        if (i % 5 === 0) {
          // Small delay
          const start = Date.now();
          while (Date.now() - start < 1) {
            // Wait
          }
        }
      }
      
      // Sort using compare function
      const sorted = [...ids].sort(Timestamp48.compare);
      
      // Should maintain original order (already chronological)
      assert.deepStrictEqual(ids, sorted);
    });
    
    test('toDate converts correctly', () => {
      const now = Date.now();
      const encoded = Timestamp48._encodeTimestamp(now);
      const date = Timestamp48.toDate(encoded);
      
      assert.ok(date instanceof Date);
      assert.strictEqual(date.getTime(), now);
    });
    
    test('toDate handles edge cases', () => {
      const testCases = [
        0,
        1,
        Date.now(),
        Math.pow(2, 47)
      ];
      
      for (const timestamp of testCases) {
        const encoded = Timestamp48._encodeTimestamp(timestamp);
        const date = Timestamp48.toDate(encoded);
        assert.strictEqual(date.getTime(), timestamp);
      }
    });
  });
  
  describe('Batch Generation', () => {
    test('generateBatch creates correct number of IDs', () => {
      const counts = [0, 1, 10, 100, 1000];
      
      for (const count of counts) {
        const batch = Timestamp48.generateBatch(count);
        assert.strictEqual(batch.length, count);
      }
    });
    
    test('generateBatch creates unique IDs', () => {
      const batch = Timestamp48.generateBatch(10000);
      const uniqueIds = new Set(batch);
      
      assert.strictEqual(uniqueIds.size, batch.length);
    });
    
    test('generateBatch maintains chronological ordering', () => {
      const batch = Timestamp48.generateBatch(1000);
      const timestamps = batch.map(id => Timestamp48.decode(id));
      
      for (let i = 1; i < timestamps.length; i++) {
        assert.ok(timestamps[i] >= timestamps[i - 1], 
          `Timestamp at index ${i} is out of order`);
      }
    });
    
    test('batch IDs are valid', () => {
      const batch = Timestamp48.generateBatch(100);
      
      for (const id of batch) {
        assert.ok(Timestamp48.isValid(id));
        assert.strictEqual(id.length, 8);
        assert.match(id, /^[A-Za-z0-9_-]{8}$/);
      }
    });
  });
});