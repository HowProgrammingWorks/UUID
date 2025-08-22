const { randomBytes } = require('crypto');

// Global variables to track the last timestamp and sequence
let lastTimestamp = BigInt(0);
let sequence = 0;
let randomSeed = 0;

// Initialize random seed once at startup for maximum performance
const initRandomBuffer = randomBytes(2);
randomSeed = ((initRandomBuffer[0] ?? 0) << 8) | (initRandomBuffer[1] ?? 0);

/**
 * Generates 48-bit timestamp in milliseconds from high-resolution time
 * with additional logic to ensure uniqueness and proper sequence handling
 * @returns {bigint} BigInt representing 48-bit timestamp in milliseconds
 */
function generateTimestamp() {
  // Get high-resolution time in nanoseconds
  const hrtime = process.hrtime.bigint();
  
  // Convert nanoseconds to milliseconds (1 millisecond = 1,000,000 nanoseconds)
  const milliseconds = hrtime / BigInt(1_000_000);
  
  // Mask to 48 bits (maximum value: 2^48 - 1 = 281474976710655)
  const mask48Bit = BigInt(0xFFFFFFFFFFFF); // 48 bits = 6 bytes
  const currentTimestamp = milliseconds & mask48Bit;
  
  // If timestamp is the same as the last one, handle sequence
  if (currentTimestamp === lastTimestamp) {
    sequence++;
    // If we've exceeded the counter capacity in the same millisecond,
    // wait for the next millisecond to maintain time accuracy
    if (sequence >= 65536) { // 2^16 = 65536
      // Busy wait for next millisecond
      let nextMs = currentTimestamp;
      while (nextMs <= currentTimestamp) {
        const nextHrtime = process.hrtime.bigint();
        nextMs = (nextHrtime / BigInt(1_000_000)) & mask48Bit;
      }
      sequence = 0;
      lastTimestamp = nextMs;
      return nextMs;
    }
    return currentTimestamp;
  } else {
    // New millisecond, reset sequence
    sequence = 0;
    lastTimestamp = currentTimestamp;
    return currentTimestamp;
  }
}

/**
 * Generates 16-bit counter using deterministic sequence for maximum performance
 * Uses crypto-seeded starting point but then pure sequence for zero collisions
 * @returns {Buffer} Buffer with 2 bytes of counter data
 */
function generateCounter() {
  const buffer = Buffer.alloc(2);
  
  // Use simple sequence with crypto-initialized seed for perfect uniqueness
  // This ensures zero collisions while maintaining maximum performance
  const combined = (sequence + randomSeed) & 0xFFFF;
  
  buffer[0] = (combined >> 8) & 0xFF;
  buffer[1] = combined & 0xFF;
  
  return buffer;
}

/**
 * Combines 48-bit timestamp and 16-bit counter into 64-bit buffer
 * @param {bigint} timestamp 48-bit timestamp in milliseconds
 * @param {Buffer} counter 16-bit random counter
 * @returns {Uint8Array} Uint8Array of 8 bytes with combined data
 */
function packComponents(timestamp, counter) {
  const result = new Uint8Array(8);
  
  // Place 48-bit timestamp in first 6 bytes (big-endian)
  for (let i = 0; i < 6; i++) {
    const shift = BigInt(40 - i * 8);
    const byte = Number((timestamp >> shift) & BigInt(0xFF));
    result[i] = byte;
  }
  
  // Place 16-bit counter in last 2 bytes
  result[6] = counter[0] ?? 0;
  result[7] = counter[1] ?? 0;
  
  return result;
}

/**
 * Generates 64-bit ID in binary format
 * @returns {Uint8Array} Uint8Array of 8 bytes with 64-bit ID
 */
function generateBinaryId() {
  const timestamp = generateTimestamp();
  const counter = generateCounter();
  return packComponents(timestamp, counter);
}

module.exports = {
  generateBinaryId,
  generateTimestamp,
  generateCounter,
  packComponents
};
