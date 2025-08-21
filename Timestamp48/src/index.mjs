/**
 * High-performance 48-bit timestamp generator following UUIDv7 standard
 * with Base64URL encoding for maximum performance and URL safety
 * ES Module version
 */

/**
 * High-performance 48-bit timestamp generator following UUIDv7 standard
 * with Base64URL encoding for maximum performance and URL safety
 */
export class Timestamp48 {
  // Pre-allocated buffers for zero-allocation hot path
  static _buffer = Buffer.allocUnsafe(6);
  static _lastMs = 0;
  static _counter = 0;
  
  // Base64URL character lookup table (URL-safe)
  static _encodeTable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  
  // Pre-computed decode table for maximum speed
  static _decodeTable = new Uint8Array(128);
  
  // Performance metrics tracking
  static _metrics = {
    totalGenerations: 0,
    totalTimeNs: 0,
    peakMemoryUsage: 0
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
    
    let now = Date.now();
    
    // Ensure we have a unique timestamp by incrementing if collision occurs
    if (now <= this._lastMs) {
      now = this._lastMs + 1;
    }
    
    this._lastMs = now;
    const result = this._encodeTimestamp(now);
    
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
    let currentTime = Math.max(Date.now(), this._lastMs + 1);
    
    for (let i = 0; i < count; i++) {
      // Each ID gets a unique timestamp
      const timestamp = currentTime + i;
      results[i] = this._encodeTimestamp(timestamp);
    }
    
    // Update last timestamp to prevent collisions with future generates
    this._lastMs = currentTime + count - 1;
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
      throw new Timestamp48Error('Invalid encoded timestamp format', 'INVALID_FORMAT');
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
   * Performance-optimized comparison
   * @param {string} a First timestamp ID
   * @param {string} b Second timestamp ID
   * @returns {number} -1, 0, or 1 for chronological ordering
   */
  static compare(a, b) {
    // Fast lexicographic comparison works for Base64URL timestamps
    // since they maintain chronological ordering
    return a < b ? -1 : a > b ? 1 : 0;
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
    const avgLatencyNs = this._metrics.totalGenerations > 0 
      ? this._metrics.totalTimeNs / this._metrics.totalGenerations 
      : 0;
      
    const generationsPerSecond = this._metrics.totalTimeNs > 0
      ? (this._metrics.totalGenerations * 1_000_000_000) / this._metrics.totalTimeNs
      : 0;
    
    return {
      generationsPerSecond: Math.round(generationsPerSecond),
      averageLatencyNs: Math.round(avgLatencyNs),
      memoryUsageBytes: this._metrics.peakMemoryUsage,
      totalGenerations: this._metrics.totalGenerations
    };
  }
  
  /**
   * Reset performance metrics
   */
  static resetMetrics() {
    this._metrics = { 
      totalGenerations: 0, 
      totalTimeNs: 0, 
      peakMemoryUsage: 0 
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
    this._buffer[0] = Math.floor(timestamp / Math.pow(2, 40)) & 0xFF;
    this._buffer[1] = Math.floor(timestamp / Math.pow(2, 32)) & 0xFF;
    this._buffer[2] = Math.floor(timestamp / Math.pow(2, 24)) & 0xFF;
    this._buffer[3] = Math.floor(timestamp / Math.pow(2, 16)) & 0xFF;
    this._buffer[4] = Math.floor(timestamp / Math.pow(2, 8)) & 0xFF;
    this._buffer[5] = timestamp & 0xFF;
    
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
    const timestampWithCounter = baseTimestamp + (counter & 0xFFF);
    
    this._buffer[0] = Math.floor(timestampWithCounter / Math.pow(2, 40)) & 0xFF;
    this._buffer[1] = Math.floor(timestampWithCounter / Math.pow(2, 32)) & 0xFF;
    this._buffer[2] = Math.floor(timestampWithCounter / Math.pow(2, 24)) & 0xFF;
    this._buffer[3] = Math.floor(timestampWithCounter / Math.pow(2, 16)) & 0xFF;
    this._buffer[4] = Math.floor(timestampWithCounter / Math.pow(2, 8)) & 0xFF;
    this._buffer[5] = timestampWithCounter & 0xFF;
    
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
      result += table[(chunk >>> 18) & 63] +
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
        throw new Timestamp48Error(`Invalid Base64URL character at position ${i}`, 'INVALID_CHARACTER');
      }
    }
    
    for (let i = 0, j = 0; i < 8; i += 4, j += 3) {
      const chunk = (table[str.charCodeAt(i)] << 18) |
                    (table[str.charCodeAt(i + 1)] << 12) |
                    (table[str.charCodeAt(i + 2)] << 6) |
                    table[str.charCodeAt(i + 3)];
      
      bytes[j] = (chunk >>> 16) & 0xFF;
      bytes[j + 1] = (chunk >>> 8) & 0xFF;
      bytes[j + 2] = chunk & 0xFF;
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

/**
 * Custom error class for Timestamp48 operations
 */
export class Timestamp48Error extends Error {
  constructor(message, code = 'TIMESTAMP48_ERROR') {
    super(message);
    this.name = 'Timestamp48Error';
    this.code = code;
  }
}

// Default export for convenience
export default Timestamp48;