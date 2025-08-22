'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { Timestamp48 } = require('../src/index.js');

describe('UUIDv7 Standard Compliance', () => {
  describe('48-bit Timestamp Format', () => {
    test('uses 48-bit Unix millisecond timestamp', () => {
      const id = Timestamp48.generate();
      const decoded = Timestamp48.decode(id);
      const now = Date.now();

      // Should be a valid Unix millisecond timestamp
      assert.ok(decoded > 0, 'Timestamp should be positive');
      assert.ok(decoded <= Math.pow(2, 48) - 1, 'Should fit in 48 bits');
      assert.ok(
        Math.abs(decoded - now) < 1000,
        'Should be within 1 second of current time',
      );
      assert.ok(Number.isInteger(decoded), 'Should be an integer');
    });

    test('timestamp range covers UUIDv7 specification', () => {
      // UUIDv7 specifies 48-bit timestamp from 1970-01-01 to ~2248-09-26
      const minDate = new Date('1970-01-01T00:00:00.000Z');
      const maxDate = new Date(Math.pow(2, 48) - 1);

      console.log(
        `Valid range: ${minDate.toISOString()} to ${maxDate.toISOString()}`,
      );

      // Test encoding/decoding at boundaries
      const minTimestamp = minDate.getTime();
      const maxTimestamp = maxDate.getTime();

      const encodedMin = Timestamp48._encodeTimestamp(minTimestamp);
      const encodedMax = Timestamp48._encodeTimestamp(maxTimestamp);

      assert.strictEqual(Timestamp48.decode(encodedMin), minTimestamp);
      assert.strictEqual(Timestamp48.decode(encodedMax), maxTimestamp);

      // Verify range
      assert.ok(
        maxDate.getFullYear() >= 2248,
        'Should support dates beyond 2248',
      );
    });

    test('big-endian byte ordering (network byte order)', () => {
      const timestamp = 0x123456789abc; // Test value with distinct bytes
      const encoded = Timestamp48._encodeTimestamp(timestamp);
      const bytes = Timestamp48._fastBase64URLDecode(encoded);

      // Check big-endian ordering (most significant byte first)
      assert.strictEqual(bytes[0], 0x12, 'Byte 0 should be most significant');
      assert.strictEqual(bytes[1], 0x34, 'Byte 1 should be next');
      assert.strictEqual(bytes[2], 0x56, 'Byte 2 should be next');
      assert.strictEqual(bytes[3], 0x78, 'Byte 3 should be next');
      assert.strictEqual(bytes[4], 0x9a, 'Byte 4 should be next');
      assert.strictEqual(bytes[5], 0xbc, 'Byte 5 should be least significant');
    });

    test('maintains monotonic ordering property', () => {
      const timestamps = [];
      const ids = [];

      // Generate IDs with explicit delays to ensure different timestamps
      for (let i = 0; i < 20; i++) {
        const id = Timestamp48.generate();
        const timestamp = Timestamp48.decode(id);

        ids.push(id);
        timestamps.push(timestamp);

        // Small delay to ensure timestamp progression
        const start = Date.now();
        while (Date.now() - start < 2) {
          // Busy wait 2ms
        }
      }

      // Timestamps should be non-decreasing
      for (let i = 1; i < timestamps.length; i++) {
        assert.ok(
          timestamps[i] >= timestamps[i - 1],
          `Timestamp at index ${i} (${timestamps[i]}) < previous (${
            timestamps[i - 1]
          })`,
        );
      }

      // Lexicographic ordering of encoded IDs should match timestamp ordering
      const sortedIds = [...ids].sort();
      const sortedByTimestamp = [...ids].sort((a, b) => {
        const tsA = Timestamp48.decode(a);
        const tsB = Timestamp48.decode(b);
        return tsA - tsB;
      });

      assert.deepStrictEqual(
        sortedIds,
        sortedByTimestamp,
        'Lexicographic sort should match timestamp sort',
      );
    });
  });

  describe('Sub-millisecond Precision and Collision Handling', () => {
    test('handles multiple IDs within same millisecond', () => {
      // Force same millisecond by manipulating internal state
      const fixedTimestamp = Date.now();
      Timestamp48._lastMs = fixedTimestamp;
      Timestamp48._counter = 0;

      const ids = [];
      for (let i = 0; i < 100; i++) {
        // Override Date.now to return fixed timestamp
        const originalNow = Date.now;
        Date.now = () => fixedTimestamp;

        const id = Timestamp48.generate();
        ids.push(id);

        // Restore Date.now
        Date.now = originalNow;
      }

      // All IDs should be unique despite same base timestamp
      const uniqueIds = new Set(ids);
      assert.strictEqual(
        uniqueIds.size,
        ids.length,
        'All IDs should be unique',
      );

      // All IDs should decode to timestamps very close to the fixed timestamp
      for (const id of ids) {
        const decoded = Timestamp48.decode(id);
        const diff = Math.abs(decoded - fixedTimestamp);
        assert.ok(
          diff <= 1,
          `Decoded timestamp ${decoded} too far from fixed ${fixedTimestamp}`,
        );
      }
    });

    test('counter mechanism provides deterministic ordering', () => {
      const baseTimestamp = Date.now();
      const idsWithCounters = [];

      // Generate IDs with explicit counters
      for (let counter = 0; counter < 10; counter++) {
        const id = Timestamp48._encodeTimestampWithCounter(
          baseTimestamp,
          counter,
        );
        const decoded = Timestamp48.decode(id);
        idsWithCounters.push({ id, decoded, expectedCounter: counter });
      }

      // IDs should maintain ordering even with counters
      for (let i = 1; i < idsWithCounters.length; i++) {
        const current = idsWithCounters[i];
        const previous = idsWithCounters[i - 1];

        assert.ok(
          current.id >= previous.id,
          `ID ordering not maintained: ${current.id} < ${previous.id}`,
        );
      }

      // All decoded timestamps should be very close to base
      for (const item of idsWithCounters) {
        const diff = Math.abs(item.decoded - baseTimestamp);
        assert.ok(
          diff <= 1,
          'Counter should not significantly change timestamp',
        );
      }
    });

    test('handles counter overflow correctly', () => {
      const fixedTimestamp = Date.now();

      // Test counter at max value (0xFFF = 4095)
      const maxCounterId = Timestamp48._encodeTimestampWithCounter(
        fixedTimestamp,
        0xfff,
      );
      assert.ok(
        Timestamp48.isValid(maxCounterId),
        'Max counter ID should be valid',
      );

      // Verify counter stays within 12-bit range
      for (let counter = 0; counter <= 0xfff; counter += 100) {
        const id = Timestamp48._encodeTimestampWithCounter(
          fixedTimestamp,
          counter,
        );
        assert.ok(
          Timestamp48.isValid(id),
          `Counter ${counter} should produce valid ID`,
        );
      }
    });

    test('collision handling preserves chronological order', () => {
      // Reset state
      Timestamp48._lastMs = 0;
      Timestamp48._counter = 0;

      const ids = [];
      const timestamps = [];

      // Generate many IDs rapidly to force collisions
      for (let i = 0; i < 1000; i++) {
        const id = Timestamp48.generate();
        const timestamp = Timestamp48.decode(id);

        ids.push(id);
        timestamps.push(timestamp);
      }

      // Verify all timestamps are non-decreasing
      for (let i = 1; i < timestamps.length; i++) {
        assert.ok(
          timestamps[i] >= timestamps[i - 1],
          `Chronological order broken at index ${i}: ${timestamps[i]} < ${
            timestamps[i - 1]
          }`,
        );
      }

      // Verify lexicographic order matches timestamp order
      const lexicographicSorted = [...ids].sort();
      assert.deepStrictEqual(
        ids,
        lexicographicSorted,
        'Generated IDs should already be in lexicographic order',
      );
    });
  });

  describe('Encoding Format Compliance', () => {
    test('produces exactly 6 bytes before encoding', () => {
      const timestamp = Date.now();
      const encoded = Timestamp48._encodeTimestamp(timestamp);
      const bytes = Timestamp48._fastBase64URLDecode(encoded);

      assert.strictEqual(bytes.length, 6, 'Should produce exactly 6 bytes');
      assert.ok(bytes instanceof Uint8Array, 'Should be a Uint8Array');
    });

    test('encoding is deterministic', () => {
      const timestamp = Date.now();

      // Same timestamp should always produce same encoding
      const encoded1 = Timestamp48._encodeTimestamp(timestamp);
      const encoded2 = Timestamp48._encodeTimestamp(timestamp);

      assert.strictEqual(
        encoded1,
        encoded2,
        'Same timestamp should produce same encoding',
      );
    });

    test('different timestamps produce different encodings', () => {
      const timestamp1 = Date.now();
      const timestamp2 = timestamp1 + 1;

      const encoded1 = Timestamp48._encodeTimestamp(timestamp1);
      const encoded2 = Timestamp48._encodeTimestamp(timestamp2);

      assert.notStrictEqual(
        encoded1,
        encoded2,
        'Different timestamps should produce different encodings',
      );
    });

    test('preserves all 48 bits of timestamp information', () => {
      const testCases = [
        0x000000000000, // All zeros
        0x000000000001, // Minimum non-zero
        0xffffffffffff, // Maximum 48-bit value
        0x123456789abc, // Mixed bits
        0x800000000000, // High bit set
        0x7fffffffffff, // All bits except high bit
      ];

      for (const timestamp of testCases) {
        const encoded = Timestamp48._encodeTimestamp(timestamp);
        const decoded = Timestamp48.decode(encoded);

        assert.strictEqual(
          decoded,
          timestamp,
          `Failed to preserve timestamp: 0x${timestamp.toString(
            16,
          )} -> 0x${decoded.toString(16)}`,
        );
      }
    });
  });

  describe('Base64URL RFC 4648 Section 5 Compliance', () => {
    test('uses correct Base64URL character set', () => {
      const expectedChars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
      assert.strictEqual(
        Timestamp48._encodeTable,
        expectedChars,
        'Character set must match RFC 4648 Section 5',
      );
    });

    test('produces URL-safe output without padding', () => {
      for (let i = 0; i < 1000; i++) {
        const id = Timestamp48.generate();

        // Should be exactly 8 characters
        assert.strictEqual(id.length, 8, 'Should be exactly 8 characters');

        // Should only contain URL-safe characters
        assert.match(
          id,
          /^[A-Za-z0-9_-]+$/,
          'Should only contain Base64URL characters',
        );

        // Should not contain padding
        assert.ok(!id.includes('='), 'Should not contain padding characters');

        // Should not contain standard Base64 characters that are not URL-safe
        assert.ok(!id.includes('+'), 'Should not contain + (use - instead)');
        assert.ok(!id.includes('/'), 'Should not contain / (use _ instead)');
      }
    });

    test('decode table correctly maps all Base64URL characters', () => {
      const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

      for (let i = 0; i < chars.length; i++) {
        const char = chars[i];
        const charCode = char.charCodeAt(0);
        const decoded = Timestamp48._decodeTable[charCode];

        assert.strictEqual(
          decoded,
          i,
          `Character '${char}' should map to ${i}, got ${decoded}`,
        );
      }

      // Invalid characters should map to 255
      const invalidChars = ['+', '/', '=', '!', '@', '#'];
      for (const char of invalidChars) {
        const charCode = char.charCodeAt(0);
        const decoded = Timestamp48._decodeTable[charCode];
        assert.strictEqual(
          decoded,
          255,
          `Invalid character '${char}' should map to 255`,
        );
      }
    });

    test('encoding/decoding is bijective', () => {
      // Test with various byte patterns
      const testPatterns = [
        new Uint8Array([0, 0, 0, 0, 0, 0]),
        new Uint8Array([255, 255, 255, 255, 255, 255]),
        new Uint8Array([170, 170, 170, 170, 170, 170]), // 10101010 pattern
        new Uint8Array([85, 85, 85, 85, 85, 85]), // 01010101 pattern
        new Uint8Array([1, 2, 3, 4, 5, 6]),
        new Uint8Array([255, 254, 253, 252, 251, 250]),
      ];

      for (const bytes of testPatterns) {
        // Convert to Buffer for encoding
        const buffer = Buffer.from(bytes);
        const encoded = Timestamp48._fastBase64URLEncode(buffer);
        const decoded = Timestamp48._fastBase64URLDecode(encoded);

        assert.deepStrictEqual(
          Array.from(decoded),
          Array.from(bytes),
          `Bijection failed for pattern [${Array.from(bytes).join(', ')}]`,
        );
      }
    });

    test('handles all possible 6-byte values correctly', () => {
      // Test edge cases and random values
      const testCount = 1000;

      for (let i = 0; i < testCount; i++) {
        // Generate random 48-bit timestamp
        const timestamp = Math.floor(Math.random() * Math.pow(2, 48));

        const encoded = Timestamp48._encodeTimestamp(timestamp);
        const decoded = Timestamp48.decode(encoded);

        assert.strictEqual(
          decoded,
          timestamp,
          `Failed roundtrip for timestamp ${timestamp}: got ${decoded}`,
        );
      }
    });
  });

  describe('Standard Validation', () => {
    test('validates against UUIDv7 timestamp portion requirements', () => {
      // Generate many IDs and verify they meet UUIDv7 timestamp requirements
      for (let i = 0; i < 100; i++) {
        const id = Timestamp48.generate();
        const timestamp = Timestamp48.decode(id);
        const now = Date.now();

        // Must be a valid Unix millisecond timestamp
        assert.ok(Number.isInteger(timestamp), 'Timestamp must be integer');
        assert.ok(timestamp > 0, 'Timestamp must be positive');
        assert.ok(
          timestamp <= Math.pow(2, 48) - 1,
          'Timestamp must fit in 48 bits',
        );

        // Should be reasonably close to current time (within 1 second)
        assert.ok(
          Math.abs(timestamp - now) < 1000,
          `Timestamp ${timestamp} too far from current time ${now}`,
        );
      }
    });

    test('complies with Base64URL without padding requirement', () => {
      // 6 bytes = 48 bits should encode to exactly 8 Base64URL characters
      // 48 bits / 6 bits per character = 8 characters exactly

      for (let i = 0; i < 100; i++) {
        const id = Timestamp48.generate();

        assert.strictEqual(
          id.length,
          8,
          'Must be exactly 8 characters (no padding needed)',
        );
        assert.ok(!id.includes('='), 'Must not include padding');

        // Verify it's valid Base64URL
        assert.match(id, /^[A-Za-z0-9_-]{8}$/, 'Must be valid Base64URL');
      }
    });
  });
});
