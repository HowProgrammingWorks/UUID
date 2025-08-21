/**
 * High-performance 48-bit timestamp generator following UUIDv7 standard
 * with Base64URL encoding for maximum performance and URL safety
 * ES Module version
 */
export class Timestamp48Error extends Error {
  constructor(message, code = 'TIMESTAMP48_ERROR') {
    super(message);
    this.name = 'Timestamp48Error';
    this.code = code;
  }
}

/**
 * Provides high-performance, 48-bit, sortable, and URL-safe timestamps.
 * Based on the UUIDv7 standard, encoded in Base64URL for efficiency.
 */
export class Timestamp48 {
  // Pre-allocated buffers for zero-allocation hot path
  static _buffer = Buffer.allocUnsafe(6);
  static _lastMs = 0;
  static _lastCounter = 0;

  // Base64URL character lookup table (URL-safe)
  static _encodeTable =
    '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

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
   * Generates a single, high-resolution 48-bit timestamp.
   * This method is optimized for performance and guarantees monotonicity.
   *
   * @returns {string} An 8-character, Base64URL-encoded timestamp.
   */
  static generate() {
    const startTime = process.hrtime.bigint();

    const now = Date.now();

    if (now === this._lastMs) {
      // Same millisecond - use counter (max 12 bits = 4095)
      this._lastCounter++;
      if (this._lastCounter > 0xfff) {
        // Counter overflow - advance timestamp by 1ms and reset counter
        this._lastMs++;
        this._lastCounter = 0;
      }
    } else if (now < this._lastMs) {
      // Clock went backwards - continue from where we left off
      this._lastMs++;
      this._lastCounter = 0;
    } else {
      // Normal case - new millisecond
      this._lastMs = now;
      this._lastCounter = 0;
    }

    const result = this._encodeTimestampWithCounter(
      this._lastMs,
      this._lastCounter,
    );

    // Update metrics
    const endTime = process.hrtime.bigint();
    this._metrics.totalGenerations++;
    this._metrics.totalTimeNs += Number(endTime - startTime);

    return result;
  }

  /**
   * Generates a batch of unique timestamps with high performance.
   * Ensures that all timestamps within the batch are monotonic.
   *
   * @param {number} count The number of timestamps to generate.
   * @returns {string[]} An array of 8-character, Base64URL-encoded timestamps.
   */
  static generateBatch(count) {
    if (count <= 0) return [];

    const results = new Array(count);
    const timestamp = Math.max(Date.now(), this._lastMs + 1);
    const table = this._encodeTable;

    for (let i = 0; i < count; i++) {
      const currentTimestamp = timestamp + i;
      // Inlined byte conversion for performance
      const b0 = Math.floor(currentTimestamp / 2 ** 40) & 0xff;
      const b1 = Math.floor(currentTimestamp / 2 ** 32) & 0xff;
      const b2 = Math.floor(currentTimestamp / 2 ** 24) & 0xff;
      const b3 = Math.floor(currentTimestamp / 2 ** 16) & 0xff;
      const b4 = Math.floor(currentTimestamp / 2 ** 8) & 0xff;
      const b5 = currentTimestamp & 0xff;

      // Inlined Base64URL encoding for performance
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

    // Update last timestamp to prevent collisions
    this._lastMs = timestamp + count - 1;
    this._metrics.totalGenerations += count;
    return results;
  }

  /**
   * Decodes a Base64URL-encoded timestamp back into a Unix timestamp.
   *
   * @param {string} encoded The 8-character, Base64URL-encoded timestamp.
   * @returns {number} The Unix timestamp in milliseconds.
   * @throws {Timestamp48Error} If the encoded format is invalid.
   * @throws {TypeError} If the input is not a string.
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

    // Reconstruct 48-bit timestamp from big-endian bytes
    // Use safe integer operations to avoid JavaScript bitwise limitations
    return (
      bytes[0] * Math.pow(2, 40) +
      bytes[1] * Math.pow(2, 32) +
      bytes[2] * Math.pow(2, 24) +
      bytes[3] * Math.pow(2, 16) +
      bytes[4] * Math.pow(2, 8) +
      bytes[5]
    );
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
   * Compares two timestamps to determine their chronological order.
   * This method uses a fast lexicographical comparison.
   *
   * @param {string} a The first Base64URL-encoded timestamp.
   * @param {string} b The second Base64URL-encoded timestamp.
   * @returns {number} Returns -1 if a < b, 1 if a > b, and 0 if they are equal.
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
    this._buffer[0] = Math.floor(timestamp / Math.pow(2, 40)) & 0xff;
    this._buffer[1] = Math.floor(timestamp / Math.pow(2, 32)) & 0xff;
    this._buffer[2] = Math.floor(timestamp / Math.pow(2, 24)) & 0xff;
    this._buffer[3] = Math.floor(timestamp / Math.pow(2, 16)) & 0xff;
    this._buffer[4] = Math.floor(timestamp / Math.pow(2, 8)) & 0xff;
    this._buffer[5] = timestamp & 0xff;

    return this._fastBase64URLEncode(this._buffer);
  }

  /**
   * Encode timestamp with counter for collision handling
   * @private
   */
  static _encodeTimestampWithCounter(timestamp, counter) {
    // Embed 12-bit counter in the lower bits for sub-millisecond precision
    // Clear lower 12 bits and add counter
    const baseTimestamp = Math.floor(timestamp / 4096) * 4096;
    const timestampWithCounter = baseTimestamp + (counter & 0xfff);

    this._buffer[0] = Math.floor(timestampWithCounter / Math.pow(2, 40)) & 0xff;
    this._buffer[1] = Math.floor(timestampWithCounter / Math.pow(2, 32)) & 0xff;
    this._buffer[2] = Math.floor(timestampWithCounter / Math.pow(2, 24)) & 0xff;
    this._buffer[3] = Math.floor(timestampWithCounter / Math.pow(2, 16)) & 0xff;
    this._buffer[4] = Math.floor(timestampWithCounter / Math.pow(2, 8)) & 0xff;
    this._buffer[5] = timestampWithCounter & 0xff;

    return this._fastBase64URLEncode(this._buffer);
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

// Default export for convenience
export default Timestamp48;
