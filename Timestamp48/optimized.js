'use strict';

const crypto = require('crypto');

// Constants for better readability
const VERSION_7 = 0x70;
const VARIANT_RFC4122 = 0x80;
const VARIANT_MASK = 0x3f;
const SEQ_MAX = 0x0fff;
const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Pre-allocated buffers for better performance
const sharedBuffer = Buffer.allocUnsafe(16);
const randomPool = Buffer.allocUnsafe(1024);
let poolOffset = 1024;

// State management
const state = {
  lastTimestamp: 0n,
  sequence: 0,
};

// Optimized Base64URL encoding using lookup table
const base64UrlLookup = [];
for (let i = 0; i < 256; i++) {
  base64UrlLookup[i] = BASE64_CHARS[i >> 2] + BASE64_CHARS[(i & 3) << 4];
}

const encodeBase64Url = (buffer) => {
  let result = '';
  let i = 0;

  // Process 3 bytes at a time (produces 4 Base64 chars)
  while (i < 15) {
    const byte1 = buffer[i++];
    const byte2 = buffer[i++];
    const byte3 = buffer[i++];

    result += BASE64_CHARS[byte1 >> 2];
    result += BASE64_CHARS[((byte1 & 3) << 4) | (byte2 >> 4)];
    result += BASE64_CHARS[((byte2 & 15) << 2) | (byte3 >> 6)];
    result += BASE64_CHARS[byte3 & 63];
  }

  // Handle last byte
  const lastByte = buffer[15];
  result += BASE64_CHARS[lastByte >> 2];
  result += BASE64_CHARS[(lastByte & 3) << 4];

  return result;
};

// Get random bytes from pre-allocated pool
const getRandomBytes = (length) => {
  if (poolOffset + length > randomPool.length) {
    crypto.randomFillSync(randomPool);
    poolOffset = 0;
  }
  const result = randomPool.subarray(poolOffset, poolOffset + length);
  poolOffset += length;
  return result;
};

// Get current timestamp in milliseconds
const getCurrentTimestamp = () => BigInt(Date.now());

// Wait for next millisecond (non-blocking approach)
const waitNextMillisecond = (currentMs) => {
  let timestamp = getCurrentTimestamp();
  while (timestamp <= currentMs) {
    timestamp = getCurrentTimestamp();
  }
  return timestamp;
};

// Pack UUID v7 components into buffer
const packUuidV7 = (timestamp, sequence, randomTail) => {
  // Write 48-bit timestamp (big-endian)
  sharedBuffer.writeUIntBE(Number(timestamp >> 16n), 0, 4);
  sharedBuffer.writeUInt16BE(Number(timestamp & 0xffffn), 4);

  // Version (7) and sequence high bits
  sharedBuffer[6] = VERSION_7 | ((sequence >> 8) & 0x0f);
  sharedBuffer[7] = sequence & 0xff;

  // RFC 4122 variant and random tail
  randomTail.copy(sharedBuffer, 8);
  sharedBuffer[8] = (sharedBuffer[8] & VARIANT_MASK) | VARIANT_RFC4122;

  return sharedBuffer;
};

/**
 * Generates a UUIDv7-like identifier with improved performance
 * @returns {string} Base64URL encoded 22-character string
 */
const generateV7Base64Url = () => {
  let timestamp = getCurrentTimestamp();

  // Handle sequence for monotonicity
  if (timestamp === state.lastTimestamp) {
    state.sequence = (state.sequence + 1) & SEQ_MAX;
    if (state.sequence === 0) {
      timestamp = waitNextMillisecond(timestamp);
    }
  } else {
    // New millisecond: randomize sequence
    state.sequence = crypto.randomInt(0, SEQ_MAX + 1);
  }

  state.lastTimestamp = timestamp;

  // Get random tail from pool
  const randomTail = getRandomBytes(8);

  // Pack and encode
  const packed = packUuidV7(timestamp, state.sequence, randomTail);
  return encodeBase64Url(packed);
};

// Batch generation for better performance
const generateBatch = (count) => {
  const results = new Array(count);
  for (let i = 0; i < count; i++) {
    results[i] = generateV7Base64Url();
  }
  return results;
};

module.exports = {
  generateV7Base64Url,
  generateBatch,
};
