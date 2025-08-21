// Base64URL encoding tests using Node.js built-in test runner
import { test, describe } from "node:test";
import assert from "node:assert";
import { 
    encodeBase64URL, 
    decodeBase64URL, 
    isValidBase64URL, 
    isValidTimestampBase64URL,
    timestampToBase64URL,
    base64URLToTimestamp 
} from "../src/base64url.js";

describe("Base64URL Encoding Module", () => {
    test("encodes buffer to Base64URL correctly", () => {
        const buffer = Buffer.from([1, 2, 3, 4, 5, 6]);
        const encoded = encodeBase64URL(buffer);
        
        assert.strictEqual(typeof encoded, "string");
        assert.strictEqual(encoded.length, 8); // 6 bytes -> 8 characters
        assert.ok(/^[A-Za-z0-9_-]+$/.test(encoded)); // URL-safe chars only
        assert.ok(!encoded.includes("=")); // No padding
    });
    
    test("decodes Base64URL correctly", () => {
        const original = Buffer.from([1, 2, 3, 4, 5, 6]);
        const encoded = encodeBase64URL(original);
        const decoded = decodeBase64URL(encoded);
        
        assert.ok(original.equals(decoded));
    });
    
    test("handles round-trip encoding/decoding", () => {
        const testCases = [
            Buffer.from([0, 0, 0, 0, 0, 0]),
            Buffer.from([255, 255, 255, 255, 255, 255]),
            Buffer.from([1, 2, 3, 4, 5, 6]),
            Buffer.from([255, 128, 64, 32, 16, 8]),
            Buffer.alloc(6).fill(42)
        ];
        
        for (const original of testCases) {
            const encoded = encodeBase64URL(original);
            const decoded = decodeBase64URL(encoded);
            
            assert.ok(original.equals(decoded), 
                `Round-trip failed for ${original.toString("hex")}`);
        }
    });
    
    test("validates Base64URL format correctly", () => {
        assert.ok(isValidBase64URL("AZjMtm5O")); // Valid
        assert.ok(isValidBase64URL(""));         // Empty is valid
        assert.ok(isValidBase64URL("A_-z"));     // URL-safe chars
        
        assert.ok(!isValidBase64URL("A=B"));     // Contains padding
        assert.ok(!isValidBase64URL("A+B"));     // Contains +
        assert.ok(!isValidBase64URL("A/B"));     // Contains /
        assert.ok(!isValidBase64URL("A B"));     // Contains space
        assert.ok(!isValidBase64URL(123));       // Not a string
        assert.ok(!isValidBase64URL(null));      // Null
    });
    
    test("validates timestamp Base64URL specifically", () => {
        const buffer = Buffer.from([1, 2, 3, 4, 5, 6]);
        const encoded = encodeBase64URL(buffer);
        
        assert.ok(isValidTimestampBase64URL(encoded));
        assert.ok(!isValidTimestampBase64URL("short"));    // Too short
        assert.ok(!isValidTimestampBase64URL("toolonggg")); // Too long
        assert.ok(!isValidTimestampBase64URL("A======="));  // Wrong length after decode
    });
    
    test("timestamp-specific functions work correctly", () => {
        const buffer = Buffer.from([1, 2, 3, 4, 5, 6]);
        
        // Test timestampToBase64URL
        const encoded = timestampToBase64URL(buffer);
        assert.strictEqual(encoded.length, 8);
        assert.ok(isValidTimestampBase64URL(encoded));
        
        // Test base64URLToTimestamp  
        const decoded = base64URLToTimestamp(encoded);
        assert.ok(buffer.equals(decoded));
    });
    
    test("handles error cases gracefully", () => {
        // encodeBase64URL errors
        assert.throws(() => encodeBase64URL("not a buffer"), /Input must be a Buffer/);
        assert.throws(() => encodeBase64URL(null), /Input must be a Buffer/);
        
        // decodeBase64URL errors
        assert.throws(() => decodeBase64URL(123), /Input must be a string/);
        assert.throws(() => decodeBase64URL("A+B"), /Invalid Base64URL string/);
        
        // timestampToBase64URL errors
        assert.throws(() => timestampToBase64URL(Buffer.alloc(5)), /Expected 6-byte/);
        assert.throws(() => timestampToBase64URL("not buffer"), /Input must be a Buffer/);
        
        // base64URLToTimestamp errors
        assert.throws(() => base64URLToTimestamp("short"), /Invalid timestamp Base64URL/);
        assert.throws(() => base64URLToTimestamp("toolonggg"), /Invalid timestamp Base64URL/);
    });
    
    test("empty buffer handling", () => {
        const empty = Buffer.alloc(0);
        const encoded = encodeBase64URL(empty);
        const decoded = decodeBase64URL(encoded);
        
        assert.strictEqual(encoded, "");
        assert.ok(empty.equals(decoded));
    });
    
    test("RFC 4648 compliance", () => {
        // Test specific RFC 4648 requirements
        const buffer = Buffer.from("any carnal pleasure.", "utf8");
        const encoded = encodeBase64URL(buffer);
        
        // Should not contain standard Base64 chars that are not URL-safe
        assert.ok(!encoded.includes("+"));
        assert.ok(!encoded.includes("/"));
        assert.ok(!encoded.includes("="));
        
        // Should only contain URL-safe alphabet
        assert.ok(/^[A-Za-z0-9_-]*$/.test(encoded));
    });
});
