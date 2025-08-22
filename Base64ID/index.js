const { generateBinaryId } = require('./id-generator');
const { encodeBase64URL, decodeBase64URL } = require('./base64url');

/**
 * Generates a unique 64-bit ID in Base64URL format
 * 
 * ID consists of:
 * - 48 bits: high-resolution timestamp in milliseconds
 * - 16 bits: cryptographically secure random counter
 * 
 * Format ensures:
 * - Uniqueness even when generated within the same millisecond
 * - Lexicographical sorting by creation time
 * - Security and unpredictability
 * 
 * @returns {string} Base64URL string of 11 characters
 * 
 * @example
 * ```javascript
 * const id = generateId(); // "ABC123def456"
 * ```
 */
function generateId() {
  const binaryId = generateBinaryId();
  return encodeBase64URL(binaryId);
}

/**
 * Decodes Base64URL ID back to binary format
 * 
 * @param {string} id Base64URL string to decode
 * @returns {Uint8Array} Uint8Array of 8 bytes
 * @throws {Error} Error if string contains invalid characters
 * 
 * @example
 * ```javascript
 * const binary = decodeId("ABC123def456");
 * ```
 */
function decodeId(id) {
  return decodeBase64URL(id);
}

/**
 * Extracts timestamp from decoded ID
 * 
 * @param {Uint8Array} binaryId Binary ID (result of decodeId)
 * @returns {bigint} Timestamp in milliseconds as BigInt
 * 
 * @example
 * ```javascript
 * const id = generateId();
 * const binary = decodeId(id);
 * const timestamp = extractTimestamp(binary);
 * ```
 */
function extractTimestamp(binaryId) {
  let timestamp = BigInt(0);
  
  // Reconstruct 48-bit timestamp from first 6 bytes
  for (let i = 0; i < 6; i++) {
    const shift = BigInt(40 - i * 8);
    const byte = binaryId[i] ?? 0;
    timestamp |= BigInt(byte) << shift;
  }
  
  return timestamp;
}

/**
 * Extracts random counter from decoded ID
 * 
 * @param {Uint8Array} binaryId Binary ID (result of decodeId)
 * @returns {number} 16-bit counter as number
 * 
 * @example
 * ```javascript
 * const id = generateId();
 * const binary = decodeId(id);
 * const counter = extractCounter(binary);
 * ```
 */
function extractCounter(binaryId) {
  // Reconstruct 16-bit counter from last 2 bytes
  return ((binaryId[6] ?? 0) << 8) | (binaryId[7] ?? 0);
}

// Export utility functions for testing
module.exports = {
  generateId,
  decodeId,
  extractTimestamp,
  extractCounter,
  generateBinaryId,
  encodeBase64URL,
  decodeBase64URL
};
