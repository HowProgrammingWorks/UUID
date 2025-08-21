'use strict';

const { Timestamp48 } = require('../src/index.js');

// Optional dependencies for comparison (install if available)
let uuid, nanoid, shortid;
try {
  uuid = require('uuid');
} catch (e) {
  console.log('uuid not installed - skipping uuid comparison');
}

try {
  const { nanoid: nanoidGenerator } = require('nanoid');
  nanoid = nanoidGenerator;
} catch (e) {
  console.log('nanoid not installed - skipping nanoid comparison');
}

try {
  shortid = require('shortid');
} catch (e) {
  console.log('shortid not installed - skipping shortid comparison');
}

/**
 * Benchmark a function for performance measurement
 */
function benchmark(name, fn, iterations = 100000) {
  // Warm up
  for (let i = 0; i < Math.min(1000, iterations / 10); i++) {
    fn();
  }
  
  // Force GC if available
  if (global.gc) global.gc();
  
  const start = process.hrtime.bigint();
  const startMemory = process.memoryUsage().heapUsed;
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  
  const end = process.hrtime.bigint();
  const endMemory = process.memoryUsage().heapUsed;
  
  const durationNs = Number(end - start);
  const durationMs = durationNs / 1_000_000;
  const opsPerSec = (iterations / durationMs) * 1000;
  const avgLatencyNs = durationNs / iterations;
  const memoryGrowth = Math.max(0, endMemory - startMemory);
  const memoryPerOp = memoryGrowth / iterations;
  
  return {
    name,
    iterations,
    durationMs: Math.round(durationMs * 100) / 100,
    opsPerSec: Math.round(opsPerSec),
    avgLatencyNs: Math.round(avgLatencyNs),
    memoryGrowthKB: Math.round(memoryGrowth / 1024 * 100) / 100,
    memoryPerOp: Math.round(memoryPerOp * 100) / 100
  };
}

/**
 * Run comparative benchmarks
 */
function runComparativeBenchmarks() {
  console.log('🚀 Timestamp48 Comparative Benchmarks\\n');
  console.log('Platform:', process.platform, process.arch);
  console.log('Node.js:', process.version);
  console.log('Memory:', Math.round(process.memoryUsage().heapTotal / 1024 / 1024), 'MB\\n');
  
  const iterations = 100000;
  const results = [];
  
  // Timestamp48 benchmark
  console.log('Benchmarking Timestamp48...');
  Timestamp48.resetMetrics();
  const timestamp48Result = benchmark('Timestamp48.generate()', () => {
    Timestamp48.generate();
  }, iterations);
  
  const metrics = Timestamp48.getPerformanceMetrics();
  timestamp48Result.internalMetricsOps = metrics.generationsPerSecond;
  timestamp48Result.internalMetricsLatency = metrics.averageLatencyNs;
  
  results.push(timestamp48Result);
  
  // UUID v4 benchmark
  if (uuid) {
    console.log('Benchmarking UUID v4...');
    const uuidResult = benchmark('uuid.v4()', () => {
      uuid.v4();
    }, iterations);
    results.push(uuidResult);
  }
  
  // Nanoid benchmark
  if (nanoid) {
    console.log('Benchmarking nanoid...');
    const nanoidResult = benchmark('nanoid()', () => {
      nanoid();
    }, iterations);
    results.push(nanoidResult);
  }
  
  // Shortid benchmark (if available)
  if (shortid) {
    console.log('Benchmarking shortid...');
    const shortidResult = benchmark('shortid.generate()', () => {
      shortid.generate();
    }, iterations);
    results.push(shortidResult);
  }
  
  // Timestamp48 batch benchmark
  console.log('Benchmarking Timestamp48 batch...');
  const batchResult = benchmark('Timestamp48.generateBatch(1000)', () => {
    Timestamp48.generateBatch(1000);
  }, iterations / 100); // Fewer iterations since each generates 1000 IDs
  
  // Adjust metrics for batch (each call generates 1000 IDs)
  batchResult.opsPerSec *= 1000;
  batchResult.avgLatencyNs /= 1000;
  batchResult.memoryPerOp /= 1000;
  batchResult.name = 'Timestamp48.generateBatch() per ID';
  
  results.push(batchResult);
  
  return results;
}

/**
 * Display benchmark results in a formatted table
 */
function displayResults(results) {
  console.log('\\n📊 Benchmark Results\\n');
  
  // Sort by operations per second (descending)
  results.sort((a, b) => b.opsPerSec - a.opsPerSec);
  
  console.log('| Method                          | Ops/sec     | Latency (ns) | Memory/op | Duration (ms) |');
  console.log('|--------------------------------|-------------|--------------|-----------|---------------|');
  
  for (const result of results) {
    const name = result.name.padEnd(30);
    const opsPerSec = result.opsPerSec.toLocaleString().padStart(11);
    const latency = result.avgLatencyNs.toString().padStart(12);
    const memory = `${result.memoryPerOp.toFixed(1)}b`.padStart(9);
    const duration = result.durationMs.toString().padStart(13);
    
    console.log(`| ${name} | ${opsPerSec} | ${latency} | ${memory} | ${duration} |`);
  }
  
  console.log('\\n📈 Performance Analysis\\n');
  
  const fastest = results[0];
  console.log(`🥇 Fastest: ${fastest.name}`);
  console.log(`   Performance: ${fastest.opsPerSec.toLocaleString()} ops/sec`);
  console.log(`   Latency: ${fastest.avgLatencyNs}ns average`);
  
  if (results.length > 1) {
    console.log('\\n🔄 Speed Comparisons:\\n');
    
    for (let i = 1; i < results.length; i++) {
      const current = results[i];
      const speedup = fastest.opsPerSec / current.opsPerSec;
      console.log(`   ${fastest.name} is ${speedup.toFixed(1)}x faster than ${current.name}`);
    }
  }
  
  // Memory efficiency analysis
  const mostMemoryEfficient = results.reduce((min, current) => 
    current.memoryPerOp < min.memoryPerOp ? current : min
  );
  
  console.log('\\n💾 Memory Efficiency:\\n');
  console.log(`🥇 Most efficient: ${mostMemoryEfficient.name}`);
  console.log(`   Memory usage: ${mostMemoryEfficient.memoryPerOp.toFixed(1)} bytes per operation`);
}

/**
 * Run specific performance tests
 */
function runPerformanceTests() {
  console.log('\\n⚡ Timestamp48 Specific Performance Tests\\n');
  
  // Test collision handling performance
  console.log('Testing collision handling...');
  const collisionStart = process.hrtime.bigint();
  const ids = new Set();
  
  for (let i = 0; i < 10000; i++) {
    ids.add(Timestamp48.generate());
  }
  
  const collisionEnd = process.hrtime.bigint();
  const collisionTime = Number(collisionEnd - collisionStart) / 1_000_000;
  
  console.log(`Generated 10,000 unique IDs in ${collisionTime.toFixed(2)}ms`);
  console.log(`Collision handling rate: ${Math.round((10000 / collisionTime) * 1000).toLocaleString()} IDs/sec`);
  console.log(`All unique: ${ids.size === 10000 ? '✅' : '❌'}`);
  
  // Test decode performance
  console.log('\\nTesting decode performance...');
  const testIds = [];
  for (let i = 0; i < 1000; i++) {
    testIds.push(Timestamp48.generate());
  }
  
  const decodeResult = benchmark('Timestamp48.decode()', () => {
    const randomId = testIds[Math.floor(Math.random() * testIds.length)];
    Timestamp48.decode(randomId);
  }, 100000);
  
  console.log(`Decode performance: ${decodeResult.opsPerSec.toLocaleString()} ops/sec`);
  console.log(`Average decode latency: ${decodeResult.avgLatencyNs}ns`);
  
  // Test validation performance
  console.log('\\nTesting validation performance...');
  const validationResult = benchmark('Timestamp48.isValid()', () => {
    const randomId = testIds[Math.floor(Math.random() * testIds.length)];
    Timestamp48.isValid(randomId);
  }, 100000);
  
  console.log(`Validation performance: ${validationResult.opsPerSec.toLocaleString()} ops/sec`);
  console.log(`Average validation latency: ${validationResult.avgLatencyNs}ns`);
}

/**
 * Test memory usage over time
 */
function testMemoryUsage() {
  if (!global.gc) {
    console.log('\\n⚠️  Memory testing requires --expose-gc flag');
    return;
  }
  
  console.log('\\n🧪 Memory Usage Analysis\\n');
  
  const measurements = [];
  const batchSize = 10000;
  const iterations = 20;
  
  for (let i = 0; i < iterations; i++) {
    global.gc();
    const beforeMemory = process.memoryUsage().heapUsed;
    
    // Generate IDs
    for (let j = 0; j < batchSize; j++) {
      Timestamp48.generate();
    }
    
    global.gc();
    const afterMemory = process.memoryUsage().heapUsed;
    const growth = afterMemory - beforeMemory;
    
    measurements.push(growth);
    
    if (i % 5 === 0) {
      console.log(`Iteration ${i + 1}: ${(growth / 1024).toFixed(1)}KB growth`);
    }
  }
  
  const avgGrowth = measurements.reduce((a, b) => a + b) / measurements.length;
  const maxGrowth = Math.max(...measurements);
  const minGrowth = Math.min(...measurements);
  
  console.log(`\\nMemory growth analysis (${batchSize} IDs per iteration):`);
  console.log(`  Average: ${(avgGrowth / 1024).toFixed(1)}KB`);
  console.log(`  Range: ${(minGrowth / 1024).toFixed(1)}KB - ${(maxGrowth / 1024).toFixed(1)}KB`);
  console.log(`  Per ID: ${(avgGrowth / batchSize).toFixed(2)} bytes`);
  
  // Check for memory leaks
  const trend = measurements.slice(10); // Skip initial measurements
  const firstHalf = trend.slice(0, Math.floor(trend.length / 2));
  const secondHalf = trend.slice(Math.floor(trend.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
  const growthTrend = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  console.log(`\\nMemory leak analysis:`);
  console.log(`  Growth trend: ${growthTrend.toFixed(1)}%`);
  console.log(`  Leak detected: ${Math.abs(growthTrend) > 25 ? '❌ Possible' : '✅ None'}`);
}

// Main execution
async function main() {
  try {
    const results = runComparativeBenchmarks();
    displayResults(results);
    
    runPerformanceTests();
    testMemoryUsage();
    
    console.log('\\n✅ Benchmark suite completed successfully');
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { benchmark, runComparativeBenchmarks, displayResults };