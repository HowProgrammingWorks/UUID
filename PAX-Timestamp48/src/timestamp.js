/**
 * UUID48Timestamp - Core 48-bit Timestamp Generator
 *
 * Implements hybrid precision approach for UUIDv7-compatible timestamp generation.
 * Uses system time synchronization with sub-millisecond counter for high-frequency scenarios.
 *
 * @author Pavel Valentov
 * @license MIT
 */

export class UUID48Timestamp {
    /**
     * Create a new timestamp generator
     * @param {Object} options - Configuration options
     * @param {number} options.maxSubMs - Maximum sub-millisecond counter value (default: 4096)
     * @param {string} options.waitStrategy - Strategy for counter overflow: "increment" or "wait" (default: "increment")
     */
    constructor(options = {}) {
        this.lastSystemTime = 0n;
        this.subMillisecondCounter = 0n;
        this.maxSubMs = BigInt(options.maxSubMs || 4096); // 12-bit counter space
        this.waitStrategy = options.waitStrategy || "increment"; // "increment" | "wait"

        // Validate options
        if (this.maxSubMs <= 0n || this.maxSubMs > 65536n) {
            throw new Error(`maxSubMs must be between 1 and 65536, got ${this.maxSubMs}`);
        }

        if (!["increment", "wait"].includes(this.waitStrategy)) {
            throw new Error(`waitStrategy must be "increment" or "wait", got "${this.waitStrategy}"`);
        }
    }

    /**
     * Generate a 48-bit timestamp as 6-byte Buffer
     * @returns {Buffer} 6-byte buffer containing the timestamp in big-endian format
     * @throws {Error} If timestamp exceeds 48-bit limit
     */
    generate() {
        const systemTime = BigInt(Date.now());

        if (systemTime === this.lastSystemTime) {
            return this._handleSameMillisecond(systemTime);
        } else if (systemTime > this.lastSystemTime) {
            return this._handleNewMillisecond(systemTime);
        } else {
            return this._handleClockBackward(systemTime);
        }
    }

    /**
     * Handle generation within the same millisecond
     * @private
     */
    _handleSameMillisecond(systemTime) {
        this.subMillisecondCounter++;

        if (this.subMillisecondCounter >= this.maxSubMs) {
            if (this.waitStrategy === "wait") {
                return this._waitForNextMillisecond();
            } else {
                // Increment timestamp by 1ms and reset counter
                const incrementedTime = systemTime + 1n;
                this.lastSystemTime = incrementedTime;
                this.subMillisecondCounter = 0n;
                return this._timestampToBuffer(incrementedTime);
            }
        }

        return this._timestampToBuffer(systemTime);
    }

    /**
     * Handle new millisecond
     * @private
     */
    _handleNewMillisecond(systemTime) {
        this.lastSystemTime = systemTime;
        this.subMillisecondCounter = 0n;
        return this._timestampToBuffer(systemTime);
    }

    /**
     * Handle clock moving backward
     * @private
     */
    _handleClockBackward(systemTime) {
        // Clock moved backward - continue with last known time + 1
        this.lastSystemTime = this.lastSystemTime + 1n;
        this.subMillisecondCounter = 0n;
        return this._timestampToBuffer(this.lastSystemTime);
    }

    /**
     * Convert timestamp to 6-byte buffer
     * @private
     */
    _timestampToBuffer(timestamp) {
        // Validate 48-bit limit (2^48 - 1 = 281,474,976,710,655)
        const maxValue = 0xFFFFFFFFFFFFn;
        if (timestamp > maxValue) {
            throw new Error(
                `Timestamp ${timestamp} exceeds 48-bit limit (max: ${maxValue}). ` +
                `This indicates system time is beyond year 8921. Check system clock configuration.`
            );
        }

        // Convert to 6-byte buffer in big-endian format
        return Buffer.from([
            Number((timestamp >> 40n) & 0xFFn),
            Number((timestamp >> 32n) & 0xFFn),
            Number((timestamp >> 24n) & 0xFFn),
            Number((timestamp >> 16n) & 0xFFn),
            Number((timestamp >> 8n) & 0xFFn),
            Number(timestamp & 0xFFn)
        ]);
    }

    /**
     * Wait for next millisecond (busy wait)
     * @private
     */
    _waitForNextMillisecond() {
        while (BigInt(Date.now()) === this.lastSystemTime) {
            // Minimal busy wait - could be optimized with setImmediate
        }
        return this.generate();
    }

    /**
     * Validate a 6-byte timestamp buffer
     * @param {Buffer} buffer - Buffer to validate
     * @returns {boolean} True if valid 6-byte timestamp
     */
    static validateBuffer(buffer) {
        if (!Buffer.isBuffer(buffer)) {
            return false;
        }

        if (buffer.length !== 6) {
            return false;
        }

        // Convert back to timestamp and check range
        try {
            const timestamp = (BigInt(buffer[0]) << 40n) |
                            (BigInt(buffer[1]) << 32n) |
                            (BigInt(buffer[2]) << 24n) |
                            (BigInt(buffer[3]) << 16n) |
                            (BigInt(buffer[4]) << 8n) |
                            BigInt(buffer[5]);

            return timestamp <= 0xFFFFFFFFFFFFn;
        } catch {
            return false;
        }
    }

    /**
     * Convert 6-byte buffer back to timestamp for validation/debugging
     * @param {Buffer} buffer - 6-byte timestamp buffer
     * @returns {bigint} Timestamp in milliseconds
     * @throws {Error} If buffer is invalid
     */
    static bufferToTimestamp(buffer) {
        if (!this.validateBuffer(buffer)) {
            throw new Error("Invalid timestamp buffer: must be 6 bytes");
        }

        return (BigInt(buffer[0]) << 40n) |
               (BigInt(buffer[1]) << 32n) |
               (BigInt(buffer[2]) << 24n) |
               (BigInt(buffer[3]) << 16n) |
               (BigInt(buffer[4]) << 8n) |
               BigInt(buffer[5]);
    }

    /**
     * Get current configuration
     * @returns {Object} Current configuration options
     */
    getConfig() {
        return {
            maxSubMs: Number(this.maxSubMs),
            waitStrategy: this.waitStrategy
        };
    }
}
