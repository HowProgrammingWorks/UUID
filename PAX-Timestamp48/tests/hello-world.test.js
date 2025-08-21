// Minimal Hello World test for Node.js test runner
import { test } from 'node:test';
import assert from 'node:assert';

test('Hello World - Node.js test runner validation', () => {
    const result = 2 + 2;
    assert.strictEqual(result, 4);
    console.log('✅ Node.js test runner is working!');
});

test('Buffer operations validation', () => {
    const buffer = Buffer.from([1, 2, 3, 4, 5, 6]);
    assert.strictEqual(buffer.length, 6);
    assert.strictEqual(buffer[0], 1);
    assert.strictEqual(buffer[5], 6);
    console.log('✅ Buffer operations are working!');
});

test('BigInt operations validation', () => {
    const timestamp = BigInt(Date.now());
    const shifted = timestamp >> 8n;
    assert.strictEqual(typeof timestamp, 'bigint');
    assert.strictEqual(typeof shifted, 'bigint');
    console.log('✅ BigInt operations are working!');
});
