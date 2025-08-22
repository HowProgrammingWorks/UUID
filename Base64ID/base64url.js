// Base64URL alphabet: A-Z, a-z, 0-9, -, _
const BASE64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Pre-computed lookup arrays for better performance
const ENCODE_LOOKUP = [];
const DECODE_LOOKUP = new Array(256).fill(-1);

// Initialize lookup tables
for (let i = 0; i < BASE64URL_ALPHABET.length; i++) {
  const char = BASE64URL_ALPHABET[i];
  if (char !== undefined) {
    ENCODE_LOOKUP[i] = char;
    DECODE_LOOKUP[char.charCodeAt(0)] = i;
  }
}

/**
 * Encodes Uint8Array to Base64URL string
 * @param {Uint8Array} data Byte array to encode
 * @returns {string} Base64URL string without padding
 */
function encodeBase64URL(data) {
  let result = '';
  let i = 0;
  
  while (i < data.length) {
    // Take 3 bytes at a time
    const byte1 = data[i] || 0;
    const byte2 = data[i + 1] || 0;
    const byte3 = data[i + 2] || 0;
    
    // Extract 4 groups of 6 bits each
    const group1 = (byte1 >> 2) & 0x3F;
    const group2 = ((byte1 & 0x03) << 4) | ((byte2 >> 4) & 0x0F);
    const group3 = ((byte2 & 0x0F) << 2) | ((byte3 >> 6) & 0x03);
    const group4 = byte3 & 0x3F;
    
    // Encode each group to a character using lookup array
    result += ENCODE_LOOKUP[group1];
    result += ENCODE_LOOKUP[group2];
    
    // Add third character only if second byte exists
    if (i + 1 < data.length) {
      result += ENCODE_LOOKUP[group3];
    }
    
    // Add fourth character only if third byte exists
    if (i + 2 < data.length) {
      result += ENCODE_LOOKUP[group4];
    }
    
    i += 3;
  }
  
  return result;
}

/**
 * Decodes Base64URL string to Uint8Array
 * @param {string} str Base64URL string to decode
 * @returns {Uint8Array} Uint8Array with decoded data
 * @throws {Error} Error if string contains invalid characters
 */
function decodeBase64URL(str) {
  // Remove padding if present
  str = str.replace(/=/g, '');
  
  const result = [];
  let i = 0;
  
  while (i < str.length) {
    // Take 4 characters at a time
    const char1 = str[i];
    const char2 = str[i + 1] || 'A'; // Default 'A' (0) for padding
    const char3 = str[i + 2] || 'A';
    const char4 = str[i + 3] || 'A';
    
    // Check that char1 is not undefined
    if (char1 === undefined) {
      throw new Error('Invalid Base64URL string');
    }
    
    // Get 6-bit values using lookup array for better performance
    const val1 = DECODE_LOOKUP[char1.charCodeAt(0)] ?? -1;
    const val2 = DECODE_LOOKUP[char2.charCodeAt(0)] ?? -1;
    const val3 = DECODE_LOOKUP[char3.charCodeAt(0)] ?? -1;
    const val4 = DECODE_LOOKUP[char4.charCodeAt(0)] ?? -1;
    
    if (val1 === -1 || val2 === -1 || val3 === -1 || val4 === -1) {
      throw new Error('Invalid Base64URL character');
    }
    
    // Reconstruct 3 bytes from 4 groups of 6 bits
    const byte1 = (val1 << 2) | ((val2 >> 4) & 0x03);
    const byte2 = ((val2 & 0x0F) << 4) | ((val3 >> 2) & 0x0F);
    const byte3 = ((val3 & 0x03) << 6) | val4;
    
    result.push(byte1);
    
    // Add second byte only if third character exists
    if (i + 2 < str.length) {
      result.push(byte2);
    }
    
    // Add third byte only if fourth character exists
    if (i + 3 < str.length) {
      result.push(byte3);
    }
    
    i += 4;
  }
  
  return new Uint8Array(result);
}

module.exports = {
  encodeBase64URL,
  decodeBase64URL
};
