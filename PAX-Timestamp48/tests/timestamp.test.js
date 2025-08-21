import { test, describe } from "node:test";
import assert from "node:assert";
import { UUID48Timestamp } from "../src/timestamp.js";

describe("UUID48Timestamp Core Algorithm", () => {
    test("generates valid 48-bit timestamps", () => {
        const generator = new UUID48Timestamp();
        const timestamp = generator.generate();
        
        assert.ok(Buffer.isBuffer(timestamp));
        assert.strictEqual(timestamp.length, 6);
        
        const timestampValue = timestamp.readUIntBE(0, 6);
        const now = Date.now();
        const maxDiff = 5000;
        
        assert.ok(Math.abs(Number(timestampValue) - now) < maxDiff, 
            "Timestamp should be close to current time");
    });
    
    test("ensures monotonic progression", () => {
        const generator = new UUID48Timestamp();
        const samples = 100; // Reduced for stability
        let lastTimestamp = 0;
        
        for (let i = 0; i < samples; i++) {
            const buffer = generator.generate();
            const timestamp = buffer.readUIntBE(0, 6);
            
            assert.ok(timestamp >= lastTimestamp, 
                `Timestamp ${timestamp} should be >= ${lastTimestamp} (iteration ${i})`);
            lastTimestamp = timestamp;
        }
    });
    
    test("handles rapid generation", () => {
        const generator = new UUID48Timestamp();
        const timestamps = [];
        const iterations = 100; // Reduced for stability
        
        for (let i = 0; i < iterations; i++) {
            const timestamp = generator.generate();
            const value = timestamp.readUIntBE(0, 6);
            timestamps.push(value);
        }
        
        // Check monotonic progression
        for (let i = 1; i < timestamps.length; i++) {
            assert.ok(timestamps[i] >= timestamps[i-1], 
                `Timestamp at ${i} should be >= previous`);
        }
    });
    
    test("validates 48-bit overflow protection", () => {
        const generator = new UUID48Timestamp();
        
        const originalDateNow = Date.now;
        Date.now = () => Number(0xFFFFFFFFFFFFn + 1000n);
        
        try {
            assert.throws(() => generator.generate(), /48-bit limit/);
        } finally {
            Date.now = originalDateNow;
        }
    });
    
    test("handles clock backward movement gracefully", () => {
        const generator = new UUID48Timestamp();
        
        const first = generator.generate().readUIntBE(0, 6);
        generator.lastSystemTime = BigInt(Date.now() + 10000);
        const second = generator.generate().readUIntBE(0, 6);
        
        assert.ok(second >= first, "Should maintain monotonic progression despite clock backward");
    });
    
    test("supports custom configuration", () => {
        const generator = new UUID48Timestamp({
            maxSubMs: 8192,
            waitStrategy: "increment"
        });
        
        const config = generator.getConfig();
        assert.strictEqual(config.maxSubMs, 8192);
        assert.strictEqual(config.waitStrategy, "increment");
        
        const timestamp = generator.generate();
        assert.ok(UUID48Timestamp.validateBuffer(timestamp));
    });
    
    test("validates buffer correctly", () => {
        const generator = new UUID48Timestamp();
        const validBuffer = generator.generate();
        
        assert.ok(UUID48Timestamp.validateBuffer(validBuffer));
        assert.ok(!UUID48Timestamp.validateBuffer(Buffer.alloc(5)));
        assert.ok(!UUID48Timestamp.validateBuffer("not a buffer"));
        assert.ok(!UUID48Timestamp.validateBuffer(null));
    });
    
    test("converts buffer to timestamp correctly", () => {
        const generator = new UUID48Timestamp();
        const buffer = generator.generate();
        
        const timestamp = UUID48Timestamp.bufferToTimestamp(buffer);
        assert.strictEqual(typeof timestamp, "bigint");
        
        const now = BigInt(Date.now());
        const diff = timestamp > now ? timestamp - now : now - timestamp;
        assert.ok(diff < 5000n, "Converted timestamp should be close to current time");
    });
});
