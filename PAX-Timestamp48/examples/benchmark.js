// Performance benchmark for UUID48 timestamp generator
import { generateId, generate, TimestampGenerator } from "../src/index.js";

console.log("🚀 UUID48 Timestamp Generator - Performance Benchmark");
console.log("===================================================");

// Benchmark 1: Simple generation
console.log("\n📊 Benchmark 1: Simple Generation");
const iterations = 10000;

console.time("generateId() x10k");
for (let i = 0; i < iterations; i++) {
    generateId();
}
console.timeEnd("generateId() x10k");

// Benchmark 2: Different formats
console.log("\n📊 Benchmark 2: Format Comparison");

console.time("base64url x10k");
for (let i = 0; i < iterations; i++) {
    generate("base64url");
}
console.timeEnd("base64url x10k");

console.time("hex x10k");
for (let i = 0; i < iterations; i++) {
    generate("hex");
}
console.timeEnd("hex x10k");

console.time("buffer x10k");
for (let i = 0; i < iterations; i++) {
    generate("buffer");
}
console.timeEnd("buffer x10k");

// Benchmark 3: Advanced generator
console.log("\n📊 Benchmark 3: Advanced Generator");
const generator = new TimestampGenerator();

console.time("TimestampGenerator x10k");
for (let i = 0; i < iterations; i++) {
    generator.generate();
}
console.timeEnd("TimestampGenerator x10k");

// Benchmark 4: Batch generation
console.log("\n📊 Benchmark 4: Batch Generation");
console.time("generateBatch(10k)");
const batch = generator.generateBatch(iterations);
console.timeEnd("generateBatch(10k)");
console.log(`Generated ${batch.length} timestamps in batch`);

// Memory usage
const memUsage = process.memoryUsage();
console.log("\n💾 Memory Usage:");
console.log(`Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

console.log("\n✅ Benchmark complete!");
