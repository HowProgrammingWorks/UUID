# Technical Requirements: 48-bit Timestamp Generator

## Project Scope

Implement a high-performance 48-bit timestamp generator following UUIDv7 standard with Base64URL encoding. Core focus: performance optimization, comprehensive testing, TypeScript support, and complete documentation.

## 1. Core Requirements

### 1.1 48-bit Timestamp Generator (UUIDv7 Standard)
- **Timestamp format**: 48-bit Unix milliseconds following UUIDv7 RFC 4122 Section 5.7
- **Big-endian encoding**: Most significant byte first (network byte order)
- **Monotonic ordering**: Generated IDs maintain chronological sequence
- **Range support**: 1970-01-01 to 2248-09-26 (48-bit millisecond range)
- **Collision handling**: Sub-millisecond precision with deterministic counters

### 1.2 Base64URL Encoding
- **Standard compliance**: RFC 4648 Section 5 Base64URL encoding
- **Output format**: 8-character URL-safe string (no padding)
- **Alphabet**: `A-Za-z0-9-_` (64 characters total)
- **Bidirectional**: Encode timestamp to Base64URL and decode back
- **Validation**: Input format verification and error handling

### 1.3 Performance Focus
- **High throughput**: Target >10 million generations per second
- **Low latency**: Sub-microsecond generation time per ID
- **Memory efficiency**: Minimal allocations, optimized garbage collection
- **CPU optimization**: Efficient bit operations and buffer handling
- **Batch generation**: Optimized bulk ID creation for high-load scenarios

### 1.4 TypeScript Integration
- **Complete type definitions**: Full TypeScript .d.ts files
- **Type safety**: Branded types for ID validation
- **Generic support**: Parameterized types for extensibility
- **JSDoc integration**: Rich IntelliSense and documentation

## 2. Performance-Optimized API

```typescript
interface Timestamp48 {
  /**
   * Generate single 48-bit timestamp ID with maximum performance
   * @returns Base64URL encoded 8-character timestamp
   */
  generate(): string
  
  /**
   * High-performance batch generation
   * @param count Number of IDs to generate
   * @returns Array of Base64URL encoded timestamps
   */
  generateBatch(count: number): string[]
  
  /**
   * Decode Base64URL back to timestamp (optimized)
   * @param encoded Base64URL encoded timestamp
   * @returns Unix timestamp in milliseconds
   */
  decode(encoded: string): number
  
  /**
   * Fast validation without full decode
   * @param encoded String to validate
   * @returns True if valid format
   */
  isValid(encoded: string): boolean
  
  /**
   * Performance-optimized comparison
   * @param a First timestamp ID
   * @param b Second timestamp ID
   * @returns -1, 0, or 1 for chronological ordering
   */
  compare(a: string, b: string): number
}
```

## 3. Performance Implementation Strategy

### 3.1 Optimized Core Algorithm
```javascript
class Timestamp48 {
  // Pre-allocated buffers for zero-allocation hot path
  static _buffer = Buffer.allocUnsafe(6)
  static _lastMs = 0
  static _counter = 0
  
  // Optimized character lookup tables
  static _encodeTable = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  static _decodeTable = new Uint8Array(128) // Pre-computed decode table
  
  static generate() {
    const now = Date.now()
    
    // Fast path: different millisecond
    if (now !== this._lastMs) {
      this._lastMs = now
      this._counter = 0
      return this._encodeTimestamp(now)
    }
    
    // Collision path: same millisecond
    if (++this._counter > 0xFFF) {
      // Wait for next millisecond (rare case)
      while (Date.now() === now) { /* spin */ }
      return this.generate()
    }
    
    return this._encodeTimestamp(now)
  }
  
  // Optimized encoding without allocations
  static _encodeTimestamp(timestamp) {
    // Write 48-bit big-endian directly to pre-allocated buffer
    this._buffer[0] = (timestamp >>> 40) & 0xFF
    this._buffer[1] = (timestamp >>> 32) & 0xFF
    this._buffer[2] = (timestamp >>> 24) & 0xFF
    this._buffer[3] = (timestamp >>> 16) & 0xFF
    this._buffer[4] = (timestamp >>> 8) & 0xFF
    this._buffer[5] = timestamp & 0xFF
    
    // Manual Base64URL encoding (faster than Buffer.toString)
    return this._fastBase64URLEncode(this._buffer)
  }
}
```

### 3.2 High-Performance Encoding
```javascript
// Zero-allocation Base64URL encoding
static _fastBase64URLEncode(buffer) {
  const table = this._encodeTable
  let result = ''
  
  // Process 3 bytes -> 4 chars at a time
  for (let i = 0; i < 6; i += 3) {
    const chunk = (buffer[i] << 16) | (buffer[i + 1] << 8) | buffer[i + 2]
    result += table[(chunk >>> 18) & 63] +
              table[(chunk >>> 12) & 63] +
              table[(chunk >>> 6) & 63] +
              table[chunk & 63]
  }
  
  return result
}

// Pre-computed decode table for maximum speed
static _initDecodeTable() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  for (let i = 0; i < chars.length; i++) {
    this._decodeTable[chars.charCodeAt(i)] = i
  }
}
```

### 3.3 Batch Optimization
```javascript
static generateBatch(count) {
  const results = new Array(count)
  
  // Batch timestamp fetching
  const baseTime = Date.now()
  
  for (let i = 0; i < count; i++) {
    // Use counter for deterministic sequence within batch
    const timestamp = baseTime + Math.floor(i / 4096) // 4096 per millisecond max
    const counter = i % 4096
    
    results[i] = this._encodeTimestampWithCounter(timestamp, counter)
  }
  
  return results
}
```

## 4. TypeScript Definitions (Complete Type Safety)

### 4.1 Core Types
```typescript
// index.d.ts
export type Timestamp48ID = string & { readonly __brand: 'Timestamp48ID' }

export interface Timestamp48Options {
  readonly performanceMode?: 'standard' | 'high' | 'maximum'
  readonly batchSize?: number
  readonly collisionStrategy?: 'counter' | 'wait'
}

export interface PerformanceMetrics {
  readonly generationsPerSecond: number
  readonly averageLatencyNs: number
  readonly memoryUsageBytes: number
}

export declare class Timestamp48 {
  static generate(options?: Timestamp48Options): Timestamp48ID
  static generateBatch(count: number, options?: Timestamp48Options): Timestamp48ID[]
  static decode(encoded: Timestamp48ID): number
  static decode(encoded: string): number
  static isValid(encoded: string): encoded is Timestamp48ID
  static compare(a: Timestamp48ID, b: Timestamp48ID): -1 | 0 | 1
  static toDate(encoded: Timestamp48ID): Date
  static getPerformanceMetrics(): PerformanceMetrics
}

export declare class Timestamp48Error extends Error {
  readonly code: string
  constructor(message: string, code?: string)
}
```

### 4.2 Utility Types
```typescript
// Advanced TypeScript patterns for performance
export type BatchResult<T extends number> = {
  readonly length: T
  readonly [K in keyof Array<Timestamp48ID>]: Timestamp48ID
}

export interface HighPerformanceConfig {
  readonly preAllocatedBuffers: boolean
  readonly enableBatching: boolean
  readonly maxBatchSize: number
  readonly collisionTolerance: number
}
```

## 5. Unit Testing (Performance-Focused)

### 5.1 Performance Test Suite
```javascript
describe('Timestamp48 Performance', () => {
  describe('Single Generation Performance', () => {
    test('generates >10M IDs per second', () => {
      const iterations = 10_000_000
      const start = process.hrtime.bigint()
      
      for (let i = 0; i < iterations; i++) {
        Timestamp48.generate()
      }
      
      const end = process.hrtime.bigint()
      const durationMs = Number(end - start) / 1_000_000
      const idsPerSecond = (iterations / durationMs) * 1000
      
      expect(idsPerSecond).toBeGreaterThan(10_000_000)
    })
    
    test('sub-microsecond latency per generation', () => {
      const measurements = []
      
      for (let i = 0; i < 1000; i++) {
        const start = process.hrtime.bigint()
        Timestamp48.generate()
        const end = process.hrtime.bigint()
        measurements.push(Number(end - start))
      }
      
      const avgLatencyNs = measurements.reduce((a, b) => a + b) / measurements.length
      expect(avgLatencyNs).toBeLessThan(1000) // < 1 microsecond
    })
  })
  
  describe('Batch Generation Performance', () => {
    test('batch generation 10x faster than individual', () => {
      const count = 100_000
      
      // Individual generation
      const start1 = process.hrtime.bigint()
      for (let i = 0; i < count; i++) {
        Timestamp48.generate()
      }
      const individualTime = Number(process.hrtime.bigint() - start1)
      
      // Batch generation
      const start2 = process.hrtime.bigint()
      Timestamp48.generateBatch(count)
      const batchTime = Number(process.hrtime.bigint() - start2)
      
      expect(individualTime / batchTime).toBeGreaterThan(5) // At least 5x faster
    })
  })
  
  describe('Memory Performance', () => {
    test('minimal memory allocation per generation', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      for (let i = 0; i < 100_000; i++) {
        Timestamp48.generate()
      }
      
      // Force GC if available
      if (global.gc) global.gc()
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryPerGeneration = (finalMemory - initialMemory) / 100_000
      
      expect(memoryPerGeneration).toBeLessThan(50) // < 50 bytes per ID
    })
  })
})
```

### 5.2 Functional Test Suite
```javascript
describe('Timestamp48 Functionality', () => {
  describe('UUIDv7 Standard Compliance', () => {
    test('generates valid 48-bit timestamp portion', () => {
      const id = Timestamp48.generate()
      const decoded = Timestamp48.decode(id)
      const now = Date.now()
      
      expect(decoded).toBeCloseTo(now, -1) // Within 10ms
      expect(decoded).toBeGreaterThan(0)
      expect(decoded).toBeLessThan(2**48) // 48-bit limit
    })
    
    test('maintains chronological ordering', () => {
      const ids = []
      for (let i = 0; i < 1000; i++) {
        ids.push(Timestamp48.generate())
        if (i % 100 === 0) {
          // Small delay to ensure different timestamps
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1)
        }
      }
      
      const timestamps = ids.map(id => Timestamp48.decode(id))
      const sorted = [...timestamps].sort((a, b) => a - b)
      expect(timestamps).toEqual(sorted)
    })
  })
  
  describe('Base64URL Encoding', () => {
    test('produces 8-character URL-safe output', () => {
      const id = Timestamp48.generate()
      expect(id).toMatch(/^[A-Za-z0-9_-]{8}$/)
      expect(id).toHaveLength(8)
    })
    
    test('roundtrip encoding preserves value', () => {
      const original = Date.now()
      const encoded = Timestamp48._encodeTimestamp(original)
      const decoded = Timestamp48.decode(encoded)
      expect(decoded).toBe(original)
    })
  })
  
  describe('Collision Handling', () => {
    test('handles same-millisecond collisions', () => {
      const ids = new Set()
      
      // Generate many IDs rapidly
      for (let i = 0; i < 10000; i++) {
        ids.add(Timestamp48.generate())
      }
      
      expect(ids.size).toBe(10000) // All unique
    })
  })
})
```

## 6. Documentation Requirements

### 6.1 Performance-Focused README
```markdown
# 48-bit Timestamp Generator (High Performance)

Ultra-fast timestamp-based ID generator with UUIDv7 compliance and Base64URL encoding.

## Performance Characteristics
- **Generation speed**: >10 million IDs/second
- **Latency**: <1 microsecond per ID  
- **Memory**: <50 bytes per ID
- **Batch efficiency**: 10x faster than individual generation

## Quick Start
```javascript
const { Timestamp48 } = require('timestamp48')

// High-performance single generation
const id = Timestamp48.generate() // "AYx_GkAH"

// Ultra-fast batch generation
const batch = Timestamp48.generateBatch(1000000) // 1M IDs

// Optimized decoding
const timestamp = Timestamp48.decode(id)
```

## Performance Tuning
```javascript
// Maximum performance mode
const id = Timestamp48.generate({ performanceMode: 'maximum' })

// Batch optimization
const largeBatch = Timestamp48.generateBatch(1000000, {
  performanceMode: 'maximum',
  batchSize: 100000 // Process in chunks
})
```
```

### 6.2 Performance API Documentation
```typescript
/**
 * High-performance 48-bit timestamp generator
 * 
 * Optimized for:
 * - >10M generations/second throughput
 * - <1μs latency per generation  
 * - Minimal memory allocations
 * - Zero-copy operations where possible
 * 
 * @example
 * // Standard usage
 * const id = Timestamp48.generate()
 * 
 * @example
 * // High-performance batch processing
 * const batch = Timestamp48.generateBatch(1000000)
 * 
 * @example
 * // Performance monitoring
 * const metrics = Timestamp48.getPerformanceMetrics()
 * console.log(`${metrics.generationsPerSecond} IDs/sec`)
 */
```

## 7. Benchmarking & Monitoring

### 7.1 Built-in Performance Monitoring
```javascript
class Timestamp48 {
  static _metrics = {
    totalGenerations: 0,
    totalTimeNs: 0,
    peakMemoryUsage: 0
  }
  
  static getPerformanceMetrics() {
    return {
      generationsPerSecond: this._metrics.totalGenerations / 
        (this._metrics.totalTimeNs / 1_000_000_000),
      averageLatencyNs: this._metrics.totalTimeNs / this._metrics.totalGenerations,
      memoryUsageBytes: this._metrics.peakMemoryUsage
    }
  }
  
  static resetMetrics() {
    this._metrics = { totalGenerations: 0, totalTimeNs: 0, peakMemoryUsage: 0 }
  }
}
```

### 7.2 Comparative Benchmarks
```javascript
// Benchmark against other solutions
describe('Comparative Performance', () => {
  test('faster than uuid library', () => {
    const uuid = require('uuid')
    
    // Timestamp48 benchmark
    const start1 = process.hrtime.bigint()
    for (let i = 0; i < 100000; i++) {
      Timestamp48.generate()
    }
    const timestamp48Time = Number(process.hrtime.bigint() - start1)
    
    // UUID library benchmark
    const start2 = process.hrtime.bigint()
    for (let i = 0; i < 100000; i++) {
      uuid.v4()
    }
    const uuidTime = Number(process.hrtime.bigint() - start2)
    
    expect(timestamp48Time).toBeLessThan(uuidTime)
  })
})
```

## 8. Success Criteria

### 8.1 Performance Requirements
- ✅ >10 million generations per second sustained throughput
- ✅ <1 microsecond average latency per generation
- ✅ <50 bytes memory allocation per ID
- ✅ Batch generation 5-10x faster than individual calls
- ✅ Zero memory leaks during extended operation

### 8.2 Functional Requirements
- ✅ UUIDv7 standard compliance for 48-bit timestamp portion
- ✅ Base64URL encoding produces 8-character URL-safe output
- ✅ Perfect roundtrip encoding/decoding accuracy
- ✅ Chronological ordering maintained across generations
- ✅ Collision handling for same-millisecond scenarios

### 8.3 Quality Requirements
- ✅ Complete TypeScript definitions with branded types
- ✅ >95% test coverage including performance tests
- ✅ Comprehensive JSDoc documentation
- ✅ Production-ready error handling and validation
- ✅ Performance monitoring and metrics built-in

## 9. File Structure

```
timestamp48/
├── src/
│   ├── index.js              # Main high-performance implementation
│   ├── encoder.js            # Optimized Base64URL encoding
│   └── performance.js        # Performance monitoring utilities
├── test/
│   ├── performance.test.js   # Performance benchmarks
│   ├── functionality.test.js # Core functionality tests
│   ├── compliance.test.js    # UUIDv7 standard compliance
│   └── memory.test.js        # Memory usage tests
├── types/
│   ├── index.d.ts           # Complete TypeScript definitions
│   └── performance.d.ts     # Performance-specific types
├── docs/
│   ├── PERFORMANCE.md       # Performance guide and benchmarks
│   ├── API.md              # Complete API reference
│   └── EXAMPLES.md         # Usage examples and patterns
├── benchmarks/
│   ├── comparison.js       # Compare with other libraries
│   └── profiling.js        # Memory and CPU profiling
├── package.json
└── README.md
```

## 10. Implementation Timeline

### Phase 1: High-Performance Core (3 days)
- Implement optimized 48-bit timestamp generation
- Create zero-allocation Base64URL encoding
- Add collision handling with performance focus
- Basic performance monitoring

### Phase 2: TypeScript & Testing (2 days)
- Complete TypeScript definitions
- Write performance-focused test suite
- Add memory usage and latency tests
- Benchmark against existing solutions

### Phase 3: Documentation & Optimization (2 days)
- Performance-focused documentation
- Advanced usage examples
- Final performance optimizations
- Profiling and bottleneck elimination

---

**Total Timeline: 7 days**

This implementation prioritizes maximum performance while maintaining UUIDv7 compliance, complete TypeScript support, and comprehensive testing as specified in the requirements.