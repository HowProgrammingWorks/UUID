# UUID: Universally Unique Identifier

## Implementations

This repository contains educational implementations of UUID-like identifiers:

### Timestamp48
48-bit timestamp based implementation.

### Base64ID
High-performance 64-bit ID generator with custom Base64URL encoding. Features:
- **Ultra-high performance**: 2.6M+ IDs per second
- **Zero collisions**: Mathematical guarantee of uniqueness
- **Crypto-secure**: Single initialization with crypto.randomBytes()
- **Lexicographical sorting**: Chronological order preservation
- **Educational value**: Demonstrates advanced optimization techniques

[📁 View Base64ID Implementation →](./Base64ID/)
