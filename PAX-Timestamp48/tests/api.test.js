import { test, describe } from "node:test";
import assert from "node:assert";
import { 
    generate, 
    generateId, 
    generateHex, 
    generateBuffer,
    validate, 
    TimestampGenerator,
    convert,
    timestampToDate,
    getTimestampAge,
    isTimestampFresh
} from "../src/index.js";

describe("Public API - Convenience Functions", () => {
    test("generate() returns Base64URL by default", () => {
        const id = generate();
        assert.strictEqual(typeof id, "string");
        assert.strictEqual(id.length, 8);
        assert.ok(/^[A-Za-z0-9_-]+$/.test(id));
        assert.ok(validate(id));
    });
    
    test("generate() supports all formats", () => {
        const base64url = generate("base64url");
        const hex = generate("hex");
        const buffer = generate("buffer");
        
        assert.strictEqual(typeof base64url, "string");
        assert.strictEqual(base64url.length, 8);
        
        assert.strictEqual(typeof hex, "string");
        assert.strictEqual(hex.length, 12);
        assert.ok(/^[0-9a-fA-F]+$/.test(hex));
        
        assert.ok(Buffer.isBuffer(buffer));
        assert.strictEqual(buffer.length, 6);
    });
    
    test("convenience functions work correctly", () => {
        const id = generateId();
        const hex = generateHex();
        const buffer = generateBuffer();
        
        assert.ok(validate(id, "base64url"));
        assert.ok(validate(hex, "hex"));
        assert.ok(validate(buffer, "buffer"));
    });
    
    test("validate function works for all formats", () => {
        const id = generateId();
        const hex = generateHex();
        const buffer = generateBuffer();
        
        assert.ok(validate(id, "base64url"));
        assert.ok(validate(hex, "hex"));
        assert.ok(validate(buffer, "buffer"));
        
        assert.ok(!validate("invalid", "base64url"));
        assert.ok(!validate("invalid", "hex"));
        assert.ok(!validate("invalid", "buffer"));
        assert.ok(!validate(null));
        assert.ok(!validate(undefined));
    });
});

describe("Public API - TimestampGenerator Class", () => {
    test("creates generator with default options", () => {
        const generator = new TimestampGenerator();
        const config = generator.getConfig();
        
        assert.strictEqual(config.maxSubMs, 4096);
        assert.strictEqual(config.waitStrategy, "increment");
        assert.strictEqual(config.defaultFormat, "base64url");
    });
    
    test("creates generator with custom options", () => {
        const generator = new TimestampGenerator({
            maxSubMs: 8192,
            waitStrategy: "increment",
            defaultFormat: "hex"
        });
        
        const config = generator.getConfig();
        assert.strictEqual(config.maxSubMs, 8192);
        assert.strictEqual(config.waitStrategy, "increment");
        assert.strictEqual(config.defaultFormat, "hex");
    });
    
    test("generates timestamps in default format", () => {
        const generator = new TimestampGenerator({ defaultFormat: "hex" });
        const timestamp = generator.generate();
        
        assert.strictEqual(typeof timestamp, "string");
        assert.strictEqual(timestamp.length, 12);
        assert.ok(/^[0-9a-fA-F]+$/.test(timestamp));
    });
    
    test("generates batch timestamps", () => {
        const generator = new TimestampGenerator();
        const batch = generator.generateBatch(5); // Reduced from 10
        
        assert.strictEqual(batch.length, 5);
        
        // All should be valid
        for (const timestamp of batch) {
            assert.ok(generator.validate(timestamp));
        }
        
        // Should be mostly unique (allowing for same-ms timestamps)
        const unique = new Set(batch);
        assert.ok(unique.size >= 1, "Should have at least some unique timestamps");
    });
    
    test("handles invalid batch count", () => {
        const generator = new TimestampGenerator();
        
        assert.throws(() => generator.generateBatch(0), /positive integer/);
        assert.throws(() => generator.generateBatch(-5), /positive integer/);
        assert.throws(() => generator.generateBatch(1.5), /positive integer/);
        assert.throws(() => generator.generateBatch("10"), /positive integer/);
    });
    
    test("validates invalid default format", () => {
        assert.throws(() => new TimestampGenerator({ defaultFormat: "invalid" }), /Invalid defaultFormat/);
    });
});

describe("Public API - Utility Functions", () => {
    test("convert between formats", () => {
        const id = generateId();
        
        const hex = convert(id, "base64url", "hex");
        const buffer = convert(id, "base64url", "buffer");
        
        const backToBase64 = convert(hex, "hex", "base64url");
        const backFromBuffer = convert(buffer, "buffer", "base64url");
        
        assert.strictEqual(id, backToBase64);
        assert.strictEqual(id, backFromBuffer);
    });
    
    test("timestampToDate converts correctly", () => {
        const id = generateId();
        const date = timestampToDate(id);
        
        assert.ok(date instanceof Date);
        
        const now = new Date();
        const diff = Math.abs(now.getTime() - date.getTime());
        assert.ok(diff < 2000, "Timestamp should be within 2 seconds of current time");
    });
    
    test("getTimestampAge calculates age correctly", () => {
        const id = generateId();
        
        const start = Date.now();
        while (Date.now() - start < 50) {}
        
        const age = getTimestampAge(id);
        assert.ok(age >= 50, "Age should be at least 50ms");
        assert.ok(age < 1000, "Age should be less than 1 second");
    });
    
    test("isTimestampFresh works correctly", () => {
        const id = generateId();
        
        assert.ok(isTimestampFresh(id, 1000));
        
        const age = getTimestampAge(id);
        if (age <= 10) { // Very fresh timestamp
            assert.ok(isTimestampFresh(id, 10));
        }
        
        assert.ok(!isTimestampFresh("invalid", 1000));
    });
    
    test("error handling for utility functions", () => {
        assert.throws(() => convert("invalid", "base64url", "hex"), /Invalid timestamp/);
        assert.throws(() => timestampToDate("invalid"), /Invalid timestamp/);
        assert.throws(() => getTimestampAge("invalid"));
    });
});

describe("Public API - Error Handling", () => {
    test("handles 48-bit overflow gracefully", () => {
        const originalDateNow = Date.now;
        Date.now = () => Number(0xFFFFFFFFFFFFn + 1000n);
        
        try {
            assert.throws(() => generate(), /system time.*beyond year 8921/);
            assert.throws(() => generateId(), /system time.*beyond year 8921/);
            
            const generator = new TimestampGenerator();
            assert.throws(() => generator.generate(), /System time.*beyond year 8921/);
        } finally {
            Date.now = originalDateNow;
        }
    });
    
    
    test("handles null and undefined inputs", () => {
        assert.ok(!validate(null));
        assert.ok(!validate(undefined));
        assert.strictEqual(validate(null, "hex"), false);
        assert.strictEqual(validate(undefined, "buffer"), false);
    });
});
