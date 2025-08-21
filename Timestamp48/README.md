# Timestamp48: High-Performance 48-bit Timestamps

Timestamp48 is a lightweight, high-performance library for generating 48-bit, lexicographically sortable timestamps. It adheres to the UUIDv7 timestamp specification and encodes the output in Base64URL for URL-safe, compact, and efficient identifiers.

The library is designed for scenarios where you need fast, unique, and chronologically ordered IDs, such as in distributed systems, databases, and logging. It includes built-in collision handling to ensure monotonicity even in high-throughput environments.

## Features

-   **48-bit Timestamps:** Generates timestamps with millisecond precision, compliant with the UUIDv7 standard.
-   **Base64URL Encoding:** Produces compact, 8-character, URL-safe strings (`A-Z`, `a-z`, `0-9`, `-`, `_`).
-   **Lexicographical Sorting:** Encoded timestamps can be sorted chronologically as strings, which is efficient for database indexing.
-   **Collision Handling:** Automatically increments timestamps to prevent collisions and ensure uniqueness, even when called multiple times within the same millisecond.
-   **High Performance:** Optimized for speed, capable of generating millions of IDs per second with minimal overhead.
-   **Zero Dependencies:** Written in pure JavaScript with no external dependencies.

## Installation

Install the package using npm:

```bash
npm install timestamp48
```

## Usage

Timestamp48 can be used in both CommonJS and ES Modules environments.

### ES Modules (`import`)

```javascript
import { Timestamp48 } from 'timestamp48';

// Generate a single timestamp ID
const id = Timestamp48.generate();
console.log(id); // e.g., "AYx_GkAH"

// Generate a batch of 10 IDs
const batch = Timestamp48.generateBatch(10);
console.log(batch); // [ 'AYx_GkAI', 'AYx_GkAJ', ... ]

// Decode a timestamp back to its Unix millisecond value
const timestamp = Timestamp48.decode(id);
console.log(new Date(timestamp)); // e.g., 2024-01-15T10:30:45.123Z

// Compare two timestamps
const id2 = Timestamp48.generate();
console.log(Timestamp48.compare(id, id2)); // -1 (id is older)
```

### CommonJS (`require`)

```javascript
const { Timestamp48 } = require('timestamp48');

// Generate a single timestamp ID
const id = Timestamp48.generate();
console.log(id); // e.g., "AYx_GkAH"

// Generate a batch of 10 IDs
const batch = Timestamp48.generateBatch(10);
console.log(batch); // [ 'AYx_GkAI', 'AYx_GkAJ', ... ]

// Decode a timestamp back to its Unix millisecond value
const timestamp = Timestamp48.decode(id);
console.log(new Date(timestamp)); // e.g., 2024-01-15T10:30:45.123Z

// Compare two timestamps
const id2 = Timestamp48.generate();
console.log(Timestamp48.compare(id, id2)); // -1 (id is older)
```

## API Reference

All methods are static and available on the `Timestamp48` class.

### `Timestamp48.generate()`

Generates a single, high-resolution 48-bit timestamp. This method is optimized for performance and guarantees monotonicity.

-   **Returns:** `string` - An 8-character, Base64URL-encoded timestamp.

### `Timestamp48.generateBatch(count)`

Generates a batch of unique timestamps with high performance. This is more efficient than calling `generate()` in a loop.

-   **Parameters:**
    -   `count` (`number`): The number of timestamps to generate.
-   **Returns:** `string[]` - An array of 8-character, Base64URL-encoded timestamps.

### `Timestamp48.decode(encoded)`

Decodes a Base64URL-encoded timestamp back into a Unix timestamp in milliseconds.

-   **Parameters:**
    -   `encoded` (`string`): The 8-character, Base64URL-encoded timestamp.
-   **Returns:** `number` - The Unix timestamp in milliseconds.
-   **Throws:** `Timestamp48Error` if the encoded format is invalid.

### `Timestamp48.compare(a, b)`

Compares two timestamps to determine their chronological order using a fast lexicographical comparison.

-   **Parameters:**
    -   `a` (`string`): The first Base64URL-encoded timestamp.
    -   `b` (`string`): The second Base64URL-encoded timestamp.
-   **Returns:** `number` - Returns `-1` if `a < b`, `1` if `a > b`, and `0` if they are equal.

