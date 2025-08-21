/**
 * Base64URL Encoding/Decoding Module
 *
 * Implements RFC 4648 Base64URL encoding without padding for 48-bit timestamps.
 * Provides URL-safe encoding suitable for use in web applications and APIs.
 *
 * @author Pavel Valentov
 * @license MIT
 */

/**
 * Encode buffer to Base64URL format (RFC 4648) without padding
 * @param {Buffer} buffer - Input buffer to encode
 * @returns {string} Base64URL encoded string without padding
 * @throws {Error} If input is not a Buffer
 */
export function encodeBase64URL(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        throw new Error("Input must be a Buffer");
    }

    if (buffer.length === 0) {
        return "";
    }

    return buffer
        .toString("base64")
        .replace(/\+/g, "-")     // Replace + with -
        .replace(/\//g, "_")     // Replace / with _
        .replace(/=/g, "");      // Remove padding
}

/**
 * Decode Base64URL string back to buffer
 * @param {string} str - Base64URL string to decode
 * @returns {Buffer} Decoded buffer
 * @throws {Error} If input is invalid Base64URL
 */
export function decodeBase64URL(str) {
    if (typeof str !== "string") {
        throw new Error("Input must be a string");
    }

    if (str.length === 0) {
        return Buffer.alloc(0);
    }

    // Validate Base64URL character set
    if (!/^[A-Za-z0-9_-]*$/.test(str)) {
        throw new Error("Invalid Base64URL string: contains invalid characters");
    }

    try {
        // Add padding back for standard Base64 decoding
        const padded = str + "=".repeat((4 - str.length % 4) % 4);

        // Convert back to standard Base64
        const base64 = padded
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        return Buffer.from(base64, "base64");
    } catch (error) {
        throw new Error(`Failed to decode Base64URL string: ${error.message}`);
    }
}

/**
 * Validate if a string is valid Base64URL format
 * @param {string} str - String to validate
 * @returns {boolean} True if valid Base64URL
 */
export function isValidBase64URL(str) {
    if (typeof str !== "string") {
        return false;
    }

    if (str.length === 0) {
        return true; // Empty string is valid
    }

    // Check character set (Base64URL alphabet)
    if (!/^[A-Za-z0-9_-]+$/.test(str)) {
        return false;
    }

    // Check padding (should not have any)
    if (str.includes("=")) {
        return false;
    }

    // Test decode to verify validity
    try {
        decodeBase64URL(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate if a string is valid Base64URL with expected length for 6-byte input
 * @param {string} str - String to validate
 * @returns {boolean} True if valid 8-character Base64URL (for 6-byte input)
 */
export function isValidTimestampBase64URL(str) {
    // 6 bytes should encode to 8 characters in Base64URL
    if (!isValidBase64URL(str) || str.length !== 8) {
        return false;
    }

    try {
        const decoded = decodeBase64URL(str);
        return decoded.length === 6;
    } catch {
        return false;
    }
}

/**
 * Convert 6-byte timestamp buffer to Base64URL string
 * Convenience function combining timestamp validation and encoding
 * @param {Buffer} timestampBuffer - 6-byte timestamp buffer
 * @returns {string} 8-character Base64URL string
 * @throws {Error} If buffer is not 6 bytes
 */
export function timestampToBase64URL(timestampBuffer) {
    if (!Buffer.isBuffer(timestampBuffer)) {
        throw new Error("Input must be a Buffer");
    }

    if (timestampBuffer.length !== 6) {
        throw new Error(`Expected 6-byte timestamp buffer, got ${timestampBuffer.length} bytes`);
    }

    const encoded = encodeBase64URL(timestampBuffer);

    // Verify expected length for 6-byte input
    if (encoded.length !== 8) {
        throw new Error(`Expected 8-character Base64URL output, got ${encoded.length} characters`);
    }

    return encoded;
}

/**
 * Convert Base64URL string to 6-byte timestamp buffer
 * Convenience function combining validation and decoding
 * @param {string} base64url - 8-character Base64URL string
 * @returns {Buffer} 6-byte timestamp buffer
 * @throws {Error} If string is not valid 8-character Base64URL
 */
export function base64URLToTimestamp(base64url) {
    if (!isValidTimestampBase64URL(base64url)) {
        throw new Error("Invalid timestamp Base64URL: must be 8 characters encoding 6 bytes");
    }

    return decodeBase64URL(base64url);
}
