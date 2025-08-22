// optimized.mjs - ESM browser-safe version with performance improvements

// Constants
const VERSION_7 = 0x70;
const VARIANT_RFC4122 = 0x80;
const VARIANT_MASK = 0x3f;
const SEQ_MAX = 0x0fff;
const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Pre-allocated typed arrays for better performance
const sharedBytes = new Uint8Array(16);
const randomPool = new Uint8Array(1024);
let poolOffset = 1024;

// State management
const state = {
  lastTimestamp: 0n,
  sequence: 0,
};

// Optimized Base64URL encoding
const encodeBase64Url = (bytes) => {
  let result = '';
  let i = 0;

  // Process 3 bytes at a time
  while (i < 15) {
    const b1 = bytes[i++];
    const b2 = bytes[i++];
    const b3 = bytes[i++];

    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result += BASE64_CHARS[((b2 & 15) << 2) | (b3 >> 6)];
    result += BASE64_CHARS[b3 & 63];
  }

  // Handle last byte
  const lastByte = bytes[15];
  result += BASE64_CHARS[lastByte >> 2];
  result += BASE64_CHARS[(lastByte & 3) << 4];

  return result;
};

// Get random bytes from pre-allocated pool
const getRandomBytes = (length) => {
  if (poolOffset + length > randomPool.length) {
    globalThis.crypto.getRandomValues(randomPool);
    poolOffset = 0;
  }
  const result = randomPool.subarray(poolOffset, poolOffset + length);
  poolOffset += length;
  return result;
};

// Get random 12-bit sequence
const getRandomSequence = () => {
  const bytes = getRandomBytes(2);
  return ((bytes[0] << 8) | bytes[1]) & SEQ_MAX;
};

// Get current timestamp
const getCurrentTimestamp = () => BigInt(Date.now());

// Pack UUID v7 components
const packUuidV7 = (timestamp, sequence, randomTail) => {
  // Write 48-bit timestamp (big-endian)
  sharedBytes[0] = Number((timestamp >> 40n) & 0xffn);
  sharedBytes[1] = Number((timestamp >> 32n) & 0xffn);
  sharedBytes[2] = Number((timestamp >> 24n) & 0xffn);
  sharedBytes[3] = Number((timestamp >> 16n) & 0xffn);
  sharedBytes[4] = Number((timestamp >> 8n) & 0xffn);
  sharedBytes[5] = Number(timestamp & 0xffn);

  // Version and sequence
  sharedBytes[6] = VERSION_7 | ((sequence >> 8) & 0x0f);
  sharedBytes[7] = sequence & 0xff;

  // Copy random tail and apply variant
  sharedBytes.set(randomTail, 8);
  sharedBytes[8] = (sharedBytes[8] & VARIANT_MASK) | VARIANT_RFC4122;

  return sharedBytes;
};

/**
 * Generates a UUIDv7-like identifier optimized for browser performance
 * @returns {string} Base64URL encoded 22-character string
 */
export const generateV7Base64Url = () => {
  const now = getCurrentTimestamp();
  let timestamp = now > state.lastTimestamp ? now : state.lastTimestamp;

  // Handle sequence for monotonicity
  if (timestamp === state.lastTimestamp) {
    state.sequence = (state.sequence + 1) & SEQ_MAX;
    if (state.sequence === 0) {
      // Virtual timestamp increment to avoid blocking
      timestamp = state.lastTimestamp + 1n;
    }
  } else {
    state.sequence = getRandomSequence();
  }

  state.lastTimestamp = timestamp;

  // Get random tail from pool
  const randomTail = getRandomBytes(8);

  // Pack and encode
  packUuidV7(timestamp, state.sequence, randomTail);
  return encodeBase64Url(sharedBytes);
};

/**
 * Generate batch of UUIDs for better performance
 * @param {number} count - Number of UUIDs to generate
 * @returns {Array<string>} Array of Base64URL encoded UUIDs
 */
export const generateBatch = (count) => {
  const results = new Array(count);
  for (let i = 0; i < count; i++) {
    results[i] = generateV7Base64Url();
  }
  return results;
};

export default generateV7Base64Url;
