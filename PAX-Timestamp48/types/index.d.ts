/**
 * TypeScript definitions for @tools/uuid48-timestamp
 *
 * Professional 48-bit timestamp generator for UUIDv7 compliance with Base64URL encoding
 *
 * @author Pavel Valentov
 * @license MIT
 */

// Type definitions for supported formats
export type TimestampFormat = "base64url" | "hex" | "buffer";

// Type definitions for wait strategies
export type WaitStrategy = "increment" | "wait";

// Configuration options for UUID48Timestamp
export interface UUID48TimestampOptions {
    /** Maximum sub-millisecond counter value (1-65536, default: 4096) */
    maxSubMs?: number;
    /** Strategy for counter overflow: "increment" or "wait" (default: "increment") */
    waitStrategy?: WaitStrategy;
}

// Configuration options for TimestampGenerator
export interface TimestampGeneratorOptions extends UUID48TimestampOptions {
    /** Default output format (default: "base64url") */
    defaultFormat?: TimestampFormat;
}

// Configuration returned by getConfig methods
export interface TimestampConfiguration {
    maxSubMs: number;
    waitStrategy: WaitStrategy;
}

export interface TimestampGeneratorConfiguration extends TimestampConfiguration {
    defaultFormat: TimestampFormat;
}

// Core timestamp generation class
export declare class UUID48Timestamp {
    constructor(options?: UUID48TimestampOptions);

    /**
     * Generate a 48-bit timestamp as 6-byte Buffer
     * @returns 6-byte buffer containing the timestamp in big-endian format
     * @throws Error if timestamp exceeds 48-bit limit
     */
    generate(): Buffer;

    /**
     * Get current configuration
     * @returns Current configuration options
     */
    getConfig(): TimestampConfiguration;

    /**
     * Validate a 6-byte timestamp buffer
     * @param buffer Buffer to validate
     * @returns True if valid 6-byte timestamp
     */
    static validateBuffer(buffer: unknown): buffer is Buffer;

    /**
     * Convert 6-byte buffer back to timestamp for validation/debugging
     * @param buffer 6-byte timestamp buffer
     * @returns Timestamp in milliseconds
     * @throws Error if buffer is invalid
     */
    static bufferToTimestamp(buffer: Buffer): bigint;
}

// Function overloads for generate() with format parameter
export function generate(): string;
export function generate(format: "base64url"): string;
export function generate(format: "hex"): string;
export function generate(format: "buffer"): Buffer;
export function generate(format: TimestampFormat): string | Buffer;

/**
 * Generate 48-bit timestamp as Base64URL string (most common use case)
 * @returns 8-character Base64URL encoded timestamp
 */
export declare function generateId(): string;

/**
 * Generate 48-bit timestamp as hex string
 * @returns 12-character hex string
 */
export declare function generateHex(): string;

/**
 * Generate 48-bit timestamp as Buffer
 * @returns 6-byte timestamp buffer
 */
export declare function generateBuffer(): Buffer;

// Function overloads for validate() with format parameter
export function validate(timestamp: string): boolean;
export function validate(timestamp: string, format: "base64url"): boolean;
export function validate(timestamp: string, format: "hex"): boolean;
export function validate(timestamp: Buffer, format: "buffer"): boolean;
export function validate(timestamp: string | Buffer, format: TimestampFormat): boolean;

// Advanced timestamp generator class
export declare class TimestampGenerator {
    constructor(options?: TimestampGeneratorOptions);

    /**
     * Generate timestamp in default or specified format
     * @param format Output format (optional, uses defaultFormat if not specified)
     * @returns Generated timestamp
     */
    generate(): string | Buffer;
    generate(format: "base64url"): string;
    generate(format: "hex"): string;
    generate(format: "buffer"): Buffer;
    generate(format: TimestampFormat): string | Buffer;

    /**
     * Generate multiple timestamps efficiently
     * @param count Number of timestamps to generate
     * @param format Output format (optional, uses defaultFormat if not specified)
     * @returns Array of generated timestamps
     * @throws Error if count is not a positive integer
     */
    generateBatch(count: number): Array<string | Buffer>;
    generateBatch(count: number, format: "base64url"): string[];
    generateBatch(count: number, format: "hex"): string[];
    generateBatch(count: number, format: "buffer"): Buffer[];
    generateBatch(count: number, format: TimestampFormat): Array<string | Buffer>;

    /**
     * Get current generator configuration
     * @returns Current configuration
     */
    getConfig(): TimestampGeneratorConfiguration;

    /**
     * Validate timestamp using this generators default format
     * @param timestamp Timestamp to validate
     * @param format Format to validate against (optional, uses defaultFormat)
     * @returns True if valid
     */
    validate(timestamp: string | Buffer, format?: TimestampFormat): boolean;
}

// Conversion functions
export function convert(timestamp: string, fromFormat: "base64url", toFormat: "hex"): string;
export function convert(timestamp: string, fromFormat: "base64url", toFormat: "buffer"): Buffer;
export function convert(timestamp: string, fromFormat: "hex", toFormat: "base64url"): string;
export function convert(timestamp: string, fromFormat: "hex", toFormat: "buffer"): Buffer;
export function convert(timestamp: Buffer, fromFormat: "buffer", toFormat: "base64url"): string;
export function convert(timestamp: Buffer, fromFormat: "buffer", toFormat: "hex"): string;
export function convert(
    timestamp: string | Buffer,
    fromFormat: TimestampFormat,
    toFormat: TimestampFormat
): string | Buffer;

// Utility functions
export declare function timestampToDate(timestamp: string | Buffer, format?: TimestampFormat): Date;
export declare function getTimestampAge(timestamp: string | Buffer, format?: TimestampFormat): number;
export declare function isTimestampFresh(
    timestamp: string | Buffer,
    maxAgeMs: number,
    format?: TimestampFormat
): boolean;

// Base64URL functions (re-exported for convenience)
export declare function encodeBase64URL(buffer: Buffer): string;
export declare function decodeBase64URL(str: string): Buffer;
export declare function isValidBase64URL(str: string): boolean;
export declare function isValidTimestampBase64URL(str: string): boolean;
export declare function timestampToBase64URL(timestampBuffer: Buffer): string;
export declare function base64URLToTimestamp(base64url: string): Buffer;

// Default export interface
declare const _default: {
    generate: typeof generate;
    generateId: typeof generateId;
    generateHex: typeof generateHex;
    generateBuffer: typeof generateBuffer;
    validate: typeof validate;
    convert: typeof convert;
    timestampToDate: typeof timestampToDate;
    getTimestampAge: typeof getTimestampAge;
    isTimestampFresh: typeof isTimestampFresh;
    TimestampGenerator: typeof TimestampGenerator;
    UUID48Timestamp: typeof UUID48Timestamp;
};

export default _default;
