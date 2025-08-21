/**
 * UUID48 Timestamp Generator - Main API Interface
 *
 * Provides hybrid convenience + power API for 48-bit timestamp generation.
 * Implements progressive complexity: simple functions for common use cases,
 * advanced class for power users with full configuration options.
 *
 * @author Pavel Valentov
 * @license MIT
 */

import { UUID48Timestamp } from "./timestamp.js";
import { timestampToBase64URL, base64URLToTimestamp, isValidTimestampBase64URL } from "./base64url.js";

// Default generator instance for convenience functions
const defaultGenerator = new UUID48Timestamp();

/**
 * Generate 48-bit timestamp in specified format
 * @param {string} format - Output format: "base64url", "hex", or "buffer"
 * @returns {string|Buffer} Generated timestamp in specified format
 * @throws {Error} If format is unsupported
 */
export function generate(format = "base64url") {
    try {
        const buffer = defaultGenerator.generate();
        return formatOutput(buffer, format);
    } catch (error) {
        if (error.message.includes("48-bit limit")) {
            throw new Error(
                `Timestamp exceeds 48-bit limit. This error indicates system time ` +
                `is beyond year 8921. Check system clock configuration.`
            );
        }
        throw new Error(`Failed to generate timestamp: ${error.message}`);
    }
}

/**
 * Generate 48-bit timestamp as Base64URL string (most common use case)
 * @returns {string} 8-character Base64URL encoded timestamp
 */
export function generateId() {
    return generate("base64url");
}

/**
 * Generate 48-bit timestamp as hex string
 * @returns {string} 12-character hex string
 */
export function generateHex() {
    return generate("hex");
}

/**
 * Generate 48-bit timestamp as Buffer
 * @returns {Buffer} 6-byte timestamp buffer
 */
export function generateBuffer() {
    return generate("buffer");
}

/**
 * Validate timestamp in specified format
 * @param {string|Buffer} timestamp - Timestamp to validate
 * @param {string} format - Expected format: "base64url", "hex", or "buffer"
 * @returns {boolean} True if valid timestamp in specified format
 */
export function validate(timestamp, format = "base64url") {
    if (timestamp == null) {
        return false;
    }

    try {
        switch (format) {
            case "base64url":
                return isValidTimestampBase64URL(timestamp);
            case "hex":
                if (typeof timestamp !== "string") return false;
                if (!/^[0-9a-fA-F]{12}$/.test(timestamp)) return false;
                // Additional validation: try to parse as buffer
                Buffer.from(timestamp, "hex");
                return true;
            case "buffer":
                return UUID48Timestamp.validateBuffer(timestamp);
            default:
                throw new Error(
                    `Invalid format "${format}". Supported formats: ` +
                    `"base64url", "hex", "buffer"`
                );
        }
    } catch (error) {
        return false;
    }
}

/**
 * Advanced timestamp generator class with full configuration options
 */
export class TimestampGenerator {
    /**
     * Create a new configurable timestamp generator
     * @param {Object} options - Configuration options
     * @param {number} options.maxSubMs - Maximum sub-millisecond counter (1-65536, default: 4096)
     * @param {string} options.waitStrategy - Overflow strategy: "increment" or "wait" (default: "increment")
     * @param {string} options.defaultFormat - Default output format (default: "base64url")
     */
    constructor(options = {}) {
        this.algorithm = new UUID48Timestamp({
            maxSubMs: options.maxSubMs || 4096,
            waitStrategy: options.waitStrategy || "increment"
        });
        this.defaultFormat = options.defaultFormat || "base64url";

        // Validate defaultFormat
        if (!["base64url", "hex", "buffer"].includes(this.defaultFormat)) {
            throw new Error(
                `Invalid defaultFormat "${this.defaultFormat}". ` +
                `Supported: "base64url", "hex", "buffer"`
            );
        }
    }

    /**
     * Generate timestamp in default or specified format
     * @param {string} format - Output format (optional, uses defaultFormat if not specified)
     * @returns {string|Buffer} Generated timestamp
     */
    generate(format = this.defaultFormat) {
        try {
            const buffer = this.algorithm.generate();
            return formatOutput(buffer, format);
        } catch (error) {
            if (error.message.includes("48-bit limit")) {
                throw new Error(
                    `Timestamp exceeds 48-bit limit. System time is beyond year 8921. ` +
                    `Check system clock configuration.`
                );
            }
            throw new Error(`Failed to generate timestamp: ${error.message}`);
        }
    }

    /**
     * Generate multiple timestamps efficiently
     * @param {number} count - Number of timestamps to generate
     * @param {string} format - Output format (optional, uses defaultFormat if not specified)
     * @returns {Array<string|Buffer>} Array of generated timestamps
     * @throws {Error} If count is not a positive integer
     */
    generateBatch(count, format = this.defaultFormat) {
        if (!Number.isInteger(count) || count <= 0) {
            throw new Error("Count must be a positive integer");
        }

        const results = [];
        for (let i = 0; i < count; i++) {
            results.push(this.generate(format));
        }
        return results;
    }

    /**
     * Get current generator configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return {
            ...this.algorithm.getConfig(),
            defaultFormat: this.defaultFormat
        };
    }

    /**
     * Validate timestamp using this generators default format
     * @param {string|Buffer} timestamp - Timestamp to validate
     * @param {string} format - Format to validate against (optional, uses defaultFormat)
     * @returns {boolean} True if valid
     */
    validate(timestamp, format = this.defaultFormat) {
        return validate(timestamp, format);
    }
}

/**
 * Convert timestamp between formats
 * @param {string|Buffer} timestamp - Input timestamp
 * @param {string} fromFormat - Current format of timestamp
 * @param {string} toFormat - Desired output format
 * @returns {string|Buffer} Converted timestamp
 * @throws {Error} If conversion fails or formats are invalid
 */
export function convert(timestamp, fromFormat, toFormat) {
    // Validate input format
    if (!validate(timestamp, fromFormat)) {
        throw new Error(`Invalid timestamp for format "${fromFormat}"`);
    }

    // Convert to buffer first (common intermediate format)
    let buffer;
    switch (fromFormat) {
        case "buffer":
            buffer = timestamp;
            break;
        case "hex":
            buffer = Buffer.from(timestamp, "hex");
            break;
        case "base64url":
            buffer = base64URLToTimestamp(timestamp);
            break;
        default:
            throw new Error(`Unsupported source format: ${fromFormat}`);
    }

    // Convert from buffer to target format
    return formatOutput(buffer, toFormat);
}

/**
 * Utility functions for timestamp manipulation
 */

/**
 * Convert timestamp to Date object
 * @param {string|Buffer} timestamp - Timestamp in any supported format
 * @param {string} format - Format of the timestamp (default: "base64url")
 * @returns {Date} JavaScript Date object
 * @throws {Error} If timestamp is invalid
 */
export function timestampToDate(timestamp, format = "base64url") {
    if (!validate(timestamp, format)) {
        throw new Error(`Invalid timestamp for format "${format}"`);
    }

    let buffer;
    switch (format) {
        case "buffer":
            buffer = timestamp;
            break;
        case "hex":
            buffer = Buffer.from(timestamp, "hex");
            break;
        case "base64url":
            buffer = base64URLToTimestamp(timestamp);
            break;
        default:
            throw new Error(`Unsupported format: ${format}`);
    }

    const timestampMs = UUID48Timestamp.bufferToTimestamp(buffer);
    return new Date(Number(timestampMs));
}

/**
 * Get age of timestamp in milliseconds
 * @param {string|Buffer} timestamp - Timestamp in any supported format
 * @param {string} format - Format of the timestamp (default: "base64url")
 * @returns {number} Age in milliseconds (current time - timestamp time)
 */
export function getTimestampAge(timestamp, format = "base64url") {
    const timestampDate = timestampToDate(timestamp, format);
    return Date.now() - timestampDate.getTime();
}

/**
 * Check if timestamp is within specified age range
 * @param {string|Buffer} timestamp - Timestamp to check
 * @param {number} maxAgeMs - Maximum allowed age in milliseconds
 * @param {string} format - Format of the timestamp (default: "base64url")
 * @returns {boolean} True if timestamp is within age limit
 */
export function isTimestampFresh(timestamp, maxAgeMs, format = "base64url") {
    try {
        const age = getTimestampAge(timestamp, format);
        return age >= 0 && age <= maxAgeMs;
    } catch {
        return false;
    }
}

/**
 * Internal helper function to format buffer output
 * @private
 */
function formatOutput(buffer, format) {
    switch (format) {
        case "buffer":
            return buffer;
        case "hex":
            return buffer.toString("hex");
        case "base64url":
            return timestampToBase64URL(buffer);
        default:
            throw new Error(
                `Unsupported format: ${format}. ` +
                `Supported formats: "buffer", "hex", "base64url"`
            );
    }
}

// Default export for convenience
export default {
    generate,
    generateId,
    generateHex,
    generateBuffer,
    validate,
    convert,
    timestampToDate,
    getTimestampAge,
    isTimestampFresh,
    TimestampGenerator,
    UUID48Timestamp
};
