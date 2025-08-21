'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { Timestamp48 } = require('../src/index.js');

describe('Timestamp48 Performance', () => {
  describe('Single Generation Performance', () => {
    test('generates >1M IDs per second (conservative test)', () => {
      // Conservative test - 1M instead of 10M for CI compatibility
      const iterations = 1_000_000;
      
      // Reset metrics
      Timestamp48.resetMetrics();
      
      const start = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        Timestamp48.generate();
      }
      
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      const idsPerSecond = (iterations / durationMs) * 1000;
      
      console.log(`Generated ${iterations} IDs in ${durationMs.toFixed(2)}ms`);
      console.log(`Performance: ${Math.round(idsPerSecond).toLocaleString()} IDs/second`);
      
      // Conservative assertion - should easily exceed 1M/sec
      assert.ok(idsPerSecond > 1_000_000, 
        `Performance target not met: ${Math.round(idsPerSecond)} < 1,000,000 IDs/sec`);
    });
    
    test('sub-millisecond latency per generation', () => {
      const measurements = [];
      
      // Warm up
      for (let i = 0; i < 100; i++) {
        Timestamp48.generate();
      }
      
      // Measure individual generation latency
      for (let i = 0; i < 1000; i++) {
        const start = process.hrtime.bigint();
        Timestamp48.generate();
        const end = process.hrtime.bigint();
        measurements.push(Number(end - start));
      }
      
      const avgLatencyNs = measurements.reduce((a, b) => a + b) / measurements.length;
      const minLatencyNs = Math.min(...measurements);
      const maxLatencyNs = Math.max(...measurements);
      
      console.log(`Average latency: ${avgLatencyNs.toFixed(0)}ns (${(avgLatencyNs / 1000).toFixed(2)}μs)`);
      console.log(`Min latency: ${minLatencyNs}ns, Max latency: ${maxLatencyNs}ns`);
      
      // Most generations should be sub-millisecond (1,000,000 ns)
      const subMillisecondCount = measurements.filter(m => m < 1_000_000).length;
      const percentage = (subMillisecondCount / measurements.length) * 100;
      
      assert.ok(percentage > 90, 
        `${percentage.toFixed(1)}% of generations were sub-millisecond (target: >90%)`);
    });
    
    test('consistent performance over time', () => {
      const batchSize = 10000;
      const batches = 10;
      const results = [];
      
      for (let batch = 0; batch < batches; batch++) {
        const start = process.hrtime.bigint();
        
        for (let i = 0; i < batchSize; i++) {
          Timestamp48.generate();
        }
        
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000;
        const idsPerSecond = (batchSize / durationMs) * 1000;
        
        results.push(idsPerSecond);
      }
      
      const avgPerformance = results.reduce((a, b) => a + b) / results.length;
      const minPerformance = Math.min(...results);
      const maxPerformance = Math.max(...results);
      const variance = results.reduce((acc, val) => acc + Math.pow(val - avgPerformance, 2), 0) / results.length;
      const stdDev = Math.sqrt(variance);
      
      console.log(`Avg: ${Math.round(avgPerformance).toLocaleString()} IDs/sec`);
      console.log(`Range: ${Math.round(minPerformance).toLocaleString()} - ${Math.round(maxPerformance).toLocaleString()}`);
      console.log(`Std Dev: ${Math.round(stdDev).toLocaleString()}`);
      
      // Performance should be relatively stable (coefficient of variation < 20%)
      const coefficientOfVariation = (stdDev / avgPerformance) * 100;
      assert.ok(coefficientOfVariation < 20, 
        `Performance too variable: CV=${coefficientOfVariation.toFixed(1)}% (target: <20%)`);
    });
  });
  
  describe('Batch Generation Performance', () => {
    test('batch generation is faster than individual calls', () => {
      const count = 100_000;
      
      // Individual generation
      const start1 = process.hrtime.bigint();
      for (let i = 0; i < count; i++) {
        Timestamp48.generate();
      }
      const individualTime = Number(process.hrtime.bigint() - start1);
      
      // Batch generation
      const start2 = process.hrtime.bigint();
      Timestamp48.generateBatch(count);
      const batchTime = Number(process.hrtime.bigint() - start2);
      
      const speedupRatio = individualTime / batchTime;
      
      console.log(`Individual: ${(individualTime / 1_000_000).toFixed(2)}ms`);
      console.log(`Batch: ${(batchTime / 1_000_000).toFixed(2)}ms`);
      console.log(`Speedup: ${speedupRatio.toFixed(1)}x`);
      
      // Batch should be at least 2x faster
      assert.ok(speedupRatio > 2, 
        `Batch generation not fast enough: ${speedupRatio.toFixed(1)}x speedup (target: >2x)`);
    });
    
    test('large batch generation performance', () => {
      const sizes = [1000, 10000, 100000, 1000000];
      
      for (const size of sizes) {
        const start = process.hrtime.bigint();
        const batch = Timestamp48.generateBatch(size);
        const end = process.hrtime.bigint();
        
        const durationMs = Number(end - start) / 1_000_000;
        const idsPerSecond = (size / durationMs) * 1000;
        
        console.log(`Batch ${size.toLocaleString()}: ${durationMs.toFixed(2)}ms, ${Math.round(idsPerSecond).toLocaleString()} IDs/sec`);
        
        assert.strictEqual(batch.length, size);
        assert.ok(idsPerSecond > 500_000, `Batch ${size} too slow: ${Math.round(idsPerSecond)} IDs/sec`);
      }
    });
    
    test('batch generation scales linearly', () => {
      const sizes = [10000, 20000, 50000, 100000];
      const timings = [];
      
      for (const size of sizes) {
        const start = process.hrtime.bigint();
        Timestamp48.generateBatch(size);
        const end = process.hrtime.bigint();
        
        const durationMs = Number(end - start) / 1_000_000;
        const timePerItem = durationMs / size;
        timings.push(timePerItem);
      }
      
      // Check that time per item is relatively consistent (linear scaling)
      const avgTimePerItem = timings.reduce((a, b) => a + b) / timings.length;
      const maxDeviation = Math.max(...timings.map(t => Math.abs(t - avgTimePerItem)));
      const deviationPercentage = (maxDeviation / avgTimePerItem) * 100;
      
      console.log(`Average time per item: ${(avgTimePerItem * 1_000_000).toFixed(0)}ns`);
      console.log(`Max deviation: ${deviationPercentage.toFixed(1)}%`);
      
      assert.ok(deviationPercentage < 50, 
        `Scaling not linear: ${deviationPercentage.toFixed(1)}% deviation (target: <50%)`);
    });
  });
  
  describe('Memory Performance', () => {
    test('minimal memory allocation per generation', () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const initialMemory = process.memoryUsage();
      const iterations = 100_000;
      
      for (let i = 0; i < iterations; i++) {
        Timestamp48.generate();
      }
      
      // Force GC again
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryPerGeneration = heapGrowth / iterations;
      
      console.log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Growth: ${(heapGrowth / 1024).toFixed(2)}KB`);
      console.log(`Per generation: ${memoryPerGeneration.toFixed(2)} bytes`);
      
      // Should use minimal memory per generation
      assert.ok(memoryPerGeneration < 100, 
        `Too much memory per generation: ${memoryPerGeneration.toFixed(2)} bytes (target: <100)`);
    });
    
    test('no memory leaks during extended operation', () => {
      if (!global.gc) {
        console.log('Skipping memory leak test (GC not available)');
        return;
      }
      
      const measurements = [];
      const iterations = 10000;
      const cycles = 10;
      
      for (let cycle = 0; cycle < cycles; cycle++) {
        global.gc();
        const beforeMemory = process.memoryUsage().heapUsed;
        
        for (let i = 0; i < iterations; i++) {
          Timestamp48.generate();
        }
        
        global.gc();
        const afterMemory = process.memoryUsage().heapUsed;
        measurements.push(afterMemory - beforeMemory);
      }
      
      // Check for increasing memory usage (potential leak)
      const firstHalf = measurements.slice(0, Math.floor(cycles / 2));
      const secondHalf = measurements.slice(Math.floor(cycles / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
      
      const memoryGrowth = secondAvg - firstAvg;
      const growthPercentage = (memoryGrowth / firstAvg) * 100;
      
      console.log(`First half avg: ${(firstAvg / 1024).toFixed(2)}KB`);
      console.log(`Second half avg: ${(secondAvg / 1024).toFixed(2)}KB`);
      console.log(`Growth: ${growthPercentage.toFixed(1)}%`);
      
      // Memory usage should not grow significantly over time
      assert.ok(growthPercentage < 50, 
        `Potential memory leak: ${growthPercentage.toFixed(1)}% growth (target: <50%)`);
    });
  });
  
  describe('Performance Metrics', () => {
    test('metrics tracking works correctly', () => {
      Timestamp48.resetMetrics();
      
      const count = 10000;
      for (let i = 0; i < count; i++) {
        Timestamp48.generate();
      }
      
      const metrics = Timestamp48.getPerformanceMetrics();
      
      assert.strictEqual(metrics.totalGenerations, count);
      assert.ok(metrics.generationsPerSecond > 0);
      assert.ok(metrics.averageLatencyNs > 0);
      assert.ok(Number.isInteger(metrics.generationsPerSecond));
      assert.ok(Number.isInteger(metrics.averageLatencyNs));
      
      console.log(`Metrics - Generations: ${metrics.totalGenerations.toLocaleString()}`);
      console.log(`Metrics - Performance: ${metrics.generationsPerSecond.toLocaleString()} IDs/sec`);
      console.log(`Metrics - Avg Latency: ${metrics.averageLatencyNs}ns`);
    });
    
    test('metrics reset correctly', () => {
      // Generate some data
      for (let i = 0; i < 100; i++) {
        Timestamp48.generate();
      }
      
      const beforeReset = Timestamp48.getPerformanceMetrics();
      assert.ok(beforeReset.totalGenerations > 0);
      
      Timestamp48.resetMetrics();
      const afterReset = Timestamp48.getPerformanceMetrics();
      
      assert.strictEqual(afterReset.totalGenerations, 0);
      assert.strictEqual(afterReset.generationsPerSecond, 0);
      assert.strictEqual(afterReset.averageLatencyNs, 0);
    });
    
    test('batch generation updates metrics correctly', () => {
      Timestamp48.resetMetrics();
      
      const batchSize = 5000;
      Timestamp48.generateBatch(batchSize);
      
      const metrics = Timestamp48.getPerformanceMetrics();
      assert.strictEqual(metrics.totalGenerations, batchSize);
      
      console.log(`Batch metrics - Generated: ${metrics.totalGenerations.toLocaleString()}`);
    });
  });
  
  describe('Stress Testing', () => {
    test('handles rapid concurrent-like generation', () => {
      const results = new Set();
      const iterations = 50000;
      
      const start = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        results.add(Timestamp48.generate());
      }
      
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      
      // All IDs should be unique
      assert.strictEqual(results.size, iterations);
      
      console.log(`Stress test: ${iterations.toLocaleString()} unique IDs in ${durationMs.toFixed(2)}ms`);
      console.log(`Rate: ${Math.round((iterations / durationMs) * 1000).toLocaleString()} IDs/sec`);
    });
    
    test('performance under memory pressure', () => {
      // Create some memory pressure
      const memoryPressure = new Array(1000).fill(0).map(() => new Array(1000).fill('x'));
      
      const start = process.hrtime.bigint();
      const iterations = 10000;
      
      for (let i = 0; i < iterations; i++) {
        Timestamp48.generate();
      }
      
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      const idsPerSecond = (iterations / durationMs) * 1000;
      
      console.log(`Under memory pressure: ${Math.round(idsPerSecond).toLocaleString()} IDs/sec`);
      
      // Should still maintain reasonable performance
      assert.ok(idsPerSecond > 100_000, 
        `Performance degraded too much under memory pressure: ${Math.round(idsPerSecond)} IDs/sec`);
      
      // Clean up
      memoryPressure.length = 0;
    });
  });
});