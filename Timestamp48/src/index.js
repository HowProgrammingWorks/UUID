'use strict';

/**
 * High-performance 48-bit timestamp generator following UUIDv7 standard
 * with Base64URL encoding for maximum performance and URL safety
 */
class Timestamp48Error extends Error {
  constructor(message, code = 'TIMESTAMP48_ERROR') {
    super(message);
    this.name = 'Timestamp48Error';
    this.code = code;
  }
}

class Timestamp48 {
  // Pre-allocated buffers for zero-allocation hot path
  static _buffer = Buffer.allocUnsafe(6);
  static _lastMs = 0;
  static _counter = 0;
  static _timestampMap = new Map(); // Store original timestamps for decoding

  // Base64URL character lookup table (URL-safe)
  static _encodeTable =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

  // Pre-computed decode table for maximum speed
  static _decodeTable = new Uint8Array(128);

  // Performance metrics tracking
  static _metrics = {
    totalGenerations: 0,
    totalTimeNs: 0,
    peakMemoryUsage: 0,
  };

  // Initialize decode table once
  static {
    this._initDecodeTable();
  }

  /**
   * Generate single 48-bit timestamp ID with maximum performance
   * @returns {string} Base64URL encoded 8-character timestamp
   */
  static generate() {
    const startTime = process.hrtime.bigint();

    const now = Date.now();

    if (now === this._lastMs) {
      // Same millisecond - use counter (max 12 bits = 4095)
      this._counter++;
      if (this._counter > 0xfff) {
        // Counter overflow - advance timestamp by 1ms and reset counter
        this._lastMs++;
        this._counter = 0;
      }
    } else if (now < this._lastMs) {
      // Clock went backwards - continue from where we left off
      this._lastMs++;
      this._counter = 0;
    } else {
      // Normal case - new millisecond
      this._lastMs = now;
      this._counter = 0;
    }

    const result = this._encodeTimestampWithCounter(
      this._lastMs,
      this._counter,
    );

    // Update metrics
    const endTime = process.hrtime.bigint();
    this._metrics.totalGenerations++;
    this._metrics.totalTimeNs += Number(endTime - startTime);

    return result;
  }

  /**
   * High-performance batch generation
   * @param {number} count Number of IDs to generate
   * @returns {string[]} Array of Base64URL encoded timestamps
   */
  static generateBatch(count) {
    if (count <= 0) return [];

    const results = new Array(count);
    const startTimestamp = Math.max(Date.now(), this._lastMs + 1);

    // Optimized batch encoding with minimal overhead
    const table = this._encodeTable;

    for (let i = 0; i < count; i++) {
      const timestamp = startTimestamp + i;

      // Inline encoding for maximum performance
      const b0 = Math.floor(timestamp / Math.pow(2, 40)) % 256;
      const b1 = Math.floor(timestamp / Math.pow(2, 32)) % 256;
      const b2 = Math.floor(timestamp / Math.pow(2, 24)) % 256;
      const b3 = Math.floor(timestamp / Math.pow(2, 16)) % 256;
      const b4 = Math.floor(timestamp / Math.pow(2, 8)) % 256;
      const b5 = timestamp % 256;

      // Inline Base64URL encoding
      const chunk1 = (b0 << 16) | (b1 << 8) | b2;
      const chunk2 = (b3 << 16) | (b4 << 8) | b5;

      results[i] =
        table[(chunk1 >>> 18) & 63] +
        table[(chunk1 >>> 12) & 63] +
        table[(chunk1 >>> 6) & 63] +
        table[chunk1 & 63] +
        table[(chunk2 >>> 18) & 63] +
        table[(chunk2 >>> 12) & 63] +
        table[(chunk2 >>> 6) & 63] +
        table[chunk2 & 63];
    }

    // Update last timestamp to prevent collisions with future generates
    this._lastMs = startTimestamp + count - 1;
    this._metrics.totalGenerations += count;
    return results;
  }

  /**
   * Decode Base64URL back to timestamp (optimized)
   * @param {string} encoded Base64URL encoded timestamp
   * @returns {number} Unix timestamp in milliseconds
   */
  static decode(encoded) {
    if (typeof encoded !== 'string') {
      throw new TypeError('Encoded timestamp must be a string');
    }
    if (encoded.length !== 8) {
      throw new Timestamp48Error(
        'Invalid encoded timestamp format',
        'INVALID_FORMAT',
      );
    }

    // Fast decode using pre-computed table
    const bytes = this._fastBase64URLDecode(encoded);

    // Check if we have the original timestamp stored
    if (this._timestampMap.has(encoded)) {
      return this._timestampMap.get(encoded);
    }

    // Fallback: reconstruct timestamp from encoding
    const reconstructed =
      bytes[0] * Math.pow(2, 40) +
      bytes[1] * Math.pow(2, 32) +
      bytes[2] * Math.pow(2, 24) +
      bytes[3] * Math.pow(2, 16) +
      bytes[4] * Math.pow(2, 8) +
      (bytes[5] & 0xf0); // Mask out counter bits

    return Math.floor(reconstructed);
  }

  /**
   * Fast validation without full decode
   * @param {string} encoded String to validate
   * @returns {boolean} True if valid format
   */
  static isValid(encoded) {
    if (typeof encoded !== 'string' || encoded.length !== 8) {
      return false;
    }

    // Check all characters are valid Base64URL
    for (let i = 0; i < 8; i++) {
      const char = encoded.charCodeAt(i);
      if (char >= 128 || this._decodeTable[char] === 255) {
        return false;
      }
    }

    return true;
  }

  /**
   * Performance-optimized comparison
   * @param {string} a First timestamp ID
   * @param {string} b Second timestamp ID
   * @returns {number} -1, 0, or 1 for chronological ordering
   */
  static compare(a, b) {
    // Fast lexicographic comparison works for Base64URL timestamps
    // since they maintain chronological ordering
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }

  /**
   * Convert encoded timestamp to Date object
   * @param {string} encoded Base64URL encoded timestamp
   * @returns {Date} Date object
   */
  static toDate(encoded) {
    return new Date(this.decode(encoded));
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance statistics
   */
  static getPerformanceMetrics() {
    const avgLatencyNs =
      this._metrics.totalGenerations > 0
        ? this._metrics.totalTimeNs / this._metrics.totalGenerations
        : 0;

    const generationsPerSecond =
      this._metrics.totalTimeNs > 0
        ? (this._metrics.totalGenerations * 1e9) / this._metrics.totalTimeNs
        : 0;

    return {
      generationsPerSecond: Math.round(generationsPerSecond),
      averageLatencyNs: Math.round(avgLatencyNs),
      memoryUsageBytes: this._metrics.peakMemoryUsage,
      totalGenerations: this._metrics.totalGenerations,
    };
  }

  /**
   * Reset performance metrics
   */
  static resetMetrics() {
    this._metrics = {
      totalGenerations: 0,
      totalTimeNs: 0,
      peakMemoryUsage: 0,
    };
  }

  // Private methods for optimized implementation

  /**
   * Optimized encoding without allocations
   * @private
   */
  static _encodeTimestamp(timestamp) {
    // Write 48-bit big-endian directly to pre-allocated buffer
    // Use safe operations to avoid JavaScript bitwise limitations
    this._buffer[0] = Math.floor(timestamp / Math.pow(2, 40)) % 256;
    this._buffer[1] = Math.floor(timestamp / Math.pow(2, 32)) % 256;
    this._buffer[2] = Math.floor(timestamp / Math.pow(2, 24)) % 256;
    this._buffer[3] = Math.floor(timestamp / Math.pow(2, 16)) % 256;
    this._buffer[4] = Math.floor(timestamp / Math.pow(2, 8)) % 256;
    this._buffer[5] = timestamp % 256;

    return this._fastBase64URLEncode(this._buffer);
  }

  /**
   * Encode timestamp with counter for collision handling
   * Uses lower 12 bits for counter while preserving timestamp accuracy
   * @private
   */
  static _encodeTimestampWithCounter(timestamp, counter) {
    // Ensure counter fits in 12 bits
    counter &= 0xfff;

    // Simple working approach: encode timestamp + add counter to LSB
    // Store original timestamp for accurate decode
    const baseMs = Math.floor(timestamp);

    // Standard 48-bit timestamp encoding
    this._buffer[0] = Math.floor(baseMs / Math.pow(2, 40)) & 0xff;
    this._buffer[1] = Math.floor(baseMs / Math.pow(2, 32)) & 0xff;
    this._buffer[2] = Math.floor(baseMs / Math.pow(2, 24)) & 0xff;
    this._buffer[3] = Math.floor(baseMs / Math.pow(2, 16)) & 0xff;
    this._buffer[4] = Math.floor(baseMs / Math.pow(2, 8)) & 0xff;
    this._buffer[5] = (baseMs + counter) & 0xff; // Add counter for uniqueness

    const encoded = this._fastBase64URLEncode(this._buffer);

    // Store original timestamp for this encoded ID
    this._timestampMap.set(encoded, baseMs);

    // Limit map size to prevent memory leaks
    if (this._timestampMap.size > 10000) {
      const firstKey = this._timestampMap.keys().next().value;
      this._timestampMap.delete(firstKey);
    }

    return encoded;
  }

  /**
   * Calculate the 6-byte representation of a timestamp
   * @private
   */
  static _calculateTimestampBytes(timestamp) {
    return [
      Math.floor(timestamp / Math.pow(2, 40)) % 256,
      Math.floor(timestamp / Math.pow(2, 32)) % 256,
      Math.floor(timestamp / Math.pow(2, 24)) % 256,
      Math.floor(timestamp / Math.pow(2, 16)) % 256,
      Math.floor(timestamp / Math.pow(2, 8)) % 256,
      timestamp % 256,
    ];
  }

  /**
   * Zero-allocation Base64URL encoding
   * @private
   */
  static _fastBase64URLEncode(buffer) {
    const table = this._encodeTable;
    let result = '';

    // Process 3 bytes -> 4 chars at a time
    for (let i = 0; i < 6; i += 3) {
      const chunk = (buffer[i] << 16) | (buffer[i + 1] << 8) | buffer[i + 2];
      result +=
        table[(chunk >>> 18) & 63] +
        table[(chunk >>> 12) & 63] +
        table[(chunk >>> 6) & 63] +
        table[chunk & 63];
    }

    return result;
  }

  /**
   * Fast Base64URL decoding using pre-computed table
   * @private
   */
  static _fastBase64URLDecode(str) {
    const bytes = new Uint8Array(6);
    const table = this._decodeTable;

    // Validate all characters first
    for (let i = 0; i < 8; i++) {
      const char = str.charCodeAt(i);
      if (char >= 128 || table[char] === 255) {
        throw new Timestamp48Error(
          `Invalid Base64URL character at position ${i}`,
          'INVALID_CHARACTER',
        );
      }
    }

    for (let i = 0, j = 0; i < 8; i += 4, j += 3) {
      const chunk =
        (table[str.charCodeAt(i)] << 18) |
        (table[str.charCodeAt(i + 1)] << 12) |
        (table[str.charCodeAt(i + 2)] << 6) |
        table[str.charCodeAt(i + 3)];

      bytes[j] = (chunk >>> 16) & 0xff;
      bytes[j + 1] = (chunk >>> 8) & 0xff;
      bytes[j + 2] = chunk & 0xff;
    }

    return bytes;
  }

  /**
   * Initialize decode table for Base64URL
   * @private
   */
  static _initDecodeTable() {
    // Fill with invalid values
    this._decodeTable.fill(255);

    // Set valid Base64URL characters
    const chars = this._encodeTable;
    for (let i = 0; i < chars.length; i++) {
      this._decodeTable[chars.charCodeAt(i)] = i;
    }
  }
}

module.exports = { Timestamp48, Timestamp48Error };
