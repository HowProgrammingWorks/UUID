'use strict';

const crypto = require('crypto');

// Constants for better readability
const VERSION_7 = 0x70;
const VARIANT_RFC4122 = 0x80;
const VARIANT_MASK = 0x3f;
const SEQ_MAX = 0x0fff;

// Pre-allocated buffers for better performance
const sharedBuffer = Buffer.allocUnsafe(16);
const randomPool = Buffer.allocUnsafe(1024);
let poolOffset = 1024;

// State management
const state = {
  lastTimestamp: 0n,
  sequence: 0,
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

// Pack UUID v7 components into buffer
const packUuidV7 = (timestamp, sequence, randomTail) => {
  // Write 48-bit timestamp (big-endian)
  sharedBuffer.writeBigUInt64BE(timestamp << 16n, 0);

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

  // Handle sequence for monotonicity and counter overflow
  if (timestamp <= state.lastTimestamp) {
    timestamp = state.lastTimestamp;
    state.sequence = (state.sequence + 1) & SEQ_MAX;
    if (state.sequence === 0) {
      // Sequence overflow, increment timestamp.
      // This is a robust way to handle high generation rates
      // without busy-waiting for the next millisecond.
      timestamp++;
      state.lastTimestamp = timestamp;
    }
  } else {
    // New millisecond or time moved backwards: randomize sequence
    state.lastTimestamp = timestamp;
    // Using random bytes is faster than crypto.randomInt()
    state.sequence = getRandomBytes(2).readUInt16BE(0) & SEQ_MAX;
  }

  // Get random tail from pool
  const randomTail = getRandomBytes(8);

  // Pack and encode
  const packed = packUuidV7(timestamp, state.sequence, randomTail);
  return packed.toString('base64url');
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
