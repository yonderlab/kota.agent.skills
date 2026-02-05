# JSONLogic Complete Reference

## Overview

JSONLogic is a system for creating shareable, portable rules as JSON data. It enables:

- **Sharing logic** between front-end and back-end code
- **Storing rules** in databases
- **Transmitting rules** between systems
- **Dynamic construction** from user input

### Key Characteristics

| Property | Description |
|----------|-------------|
| **Terse** | Minimal syntax overhead |
| **Consistent** | Uniform structure across all operations |
| **Secure** | No `eval()`, read-only access to data |
| **Deterministic** | No loops, functions, or side effects |
| **Portable** | Implementations in JS, PHP, Python, Ruby, Go, Java, .Net, C++ |

---

## Basic Syntax

Every JSONLogic rule follows the pattern: `{ "operator": [arguments] }`

```json
// Simple comparison
{ "==": [1, 1] }  // returns true

// Compound logic
{ "and": [{ ">": [3, 1] }, { "<": [1, 3] }] }  // returns true

// Data access
{ "var": "a" }  // with data { "a": 1 } returns 1

// Nested data access
{ "var": "user.profile.name" }  // dot notation for nested objects
```

---

## Supported Operations

### Data Access

#### `var` - Retrieve data
```json
// Basic access
{ "var": "propertyName" }

// Nested access (dot notation)
{ "var": "user.address.city" }

// Array indexing
{ "var": "items.0" }

// Default value (second argument)
{ "var": ["propertyName", "default_value"] }

// Get entire data object
{ "var": "" }
```

#### `missing` - Check for missing keys
```json
// Returns array of missing keys, or empty array if all present
{ "missing": ["key1", "key2", "key3"] }
```

#### `missing_some` - Require minimum keys
```json
// First arg = minimum required, second arg = keys to check
// Returns empty array if minimum met, otherwise missing keys
{ "missing_some": [2, ["a", "b", "c"]] }
```

---

### Logic & Boolean Operations

#### `if` - Conditional
```json
// Basic if/then/else
{ "if": [condition, then_value, else_value] }

// Multiple conditions (if/elseif/else)
{ "if": [
    condition1, value1,
    condition2, value2,
    condition3, value3,
    else_value
]}

// Example: Grade classification
{ "if": [
    { ">=": [{ "var": "score" }, 90] }, "A",
    { ">=": [{ "var": "score" }, 80] }, "B",
    { ">=": [{ "var": "score" }, 70] }, "C",
    "F"
]}
```

#### Comparison Operators
```json
// Loose equality (type coercion)
{ "==": [1, "1"] }   // true

// Strict equality (no coercion)
{ "===": [1, "1"] }  // false

// Inequality
{ "!=": [1, 2] }     // true
{ "!==": [1, "1"] }  // true
```

#### Logical Operators
```json
// Negation
{ "!": [true] }      // false

// Double negation (cast to boolean)
{ "!!": ["string"] } // true

// OR - returns first truthy or last value
{ "or": [false, 0, "hello"] }  // "hello"

// AND - returns first falsy or last value
{ "and": [true, 1, "hello"] }  // "hello"
{ "and": [true, 0, "hello"] }  // 0
```

---

### Numeric Operations

#### Comparison
```json
{ ">": [3, 1] }   // true
{ ">=": [3, 3] }  // true
{ "<": [1, 3] }   // true
{ "<=": [3, 3] }  // true

// Between (3-argument form) - value between bounds
{ "<": [1, { "var": "temp" }, 100] }   // exclusive
{ "<=": [1, { "var": "temp" }, 100] }  // inclusive
```

#### Arithmetic
```json
// Addition (multiple arguments)
{ "+": [1, 2, 3] }     // 6

// Cast to number (single argument)
{ "+": "5" }           // 5

// Subtraction
{ "-": [10, 5] }       // 5

// Negation (single argument)
{ "-": 5 }             // -5

// Multiplication (multiple arguments)
{ "*": [2, 3, 4] }     // 24

// Division
{ "/": [10, 2] }       // 5

// Modulo (remainder)
{ "%": [11, 3] }       // 2
```

#### Min/Max
```json
{ "max": [1, 5, 3] }   // 5
{ "min": [1, 5, 3] }   // 1
```

---

### Array Operations

#### `map` - Transform each element
```json
// Double each number
{
  "map": [
    { "var": "numbers" },
    { "*": [{ "var": "" }, 2] }
  ]
}
// Data: { "numbers": [1, 2, 3] }
// Result: [2, 4, 6]
```

#### `filter` - Keep matching elements
```json
// Keep numbers > 2
{
  "filter": [
    { "var": "numbers" },
    { ">": [{ "var": "" }, 2] }
  ]
}
// Data: { "numbers": [1, 2, 3, 4] }
// Result: [3, 4]
```

#### `reduce` - Combine into single value
```json
// Sum all numbers
{
  "reduce": [
    { "var": "numbers" },
    { "+": [{ "var": "accumulator" }, { "var": "current" }] },
    0  // initial value
  ]
}
// Data: { "numbers": [1, 2, 3, 4] }
// Result: 10
```

#### `all` / `some` / `none` - Test array elements
```json
// All elements pass test
{ "all": [{ "var": "numbers" }, { ">": [{ "var": "" }, 0] }] }

// At least one element passes
{ "some": [{ "var": "numbers" }, { ">": [{ "var": "" }, 5] }] }

// No elements pass (true for empty arrays)
{ "none": [{ "var": "numbers" }, { "<": [{ "var": "" }, 0] }] }
```

#### `merge` - Combine arrays
```json
{ "merge": [[1, 2], [3, 4], 5] }  // [1, 2, 3, 4, 5]
```

#### `in` - Array membership
```json
{ "in": ["needle", ["hay", "needle", "stack"]] }  // true
```

---

### String Operations

#### `in` - Substring check
```json
{ "in": ["find", "find me in this string"] }  // true
```

#### `cat` - Concatenation
```json
{ "cat": ["Hello", " ", "World"] }  // "Hello World"
```

#### `substr` - Extract substring
```json
// substr(string, start, length)
{ "substr": ["jsonlogic", 0, 4] }   // "json"
{ "substr": ["jsonlogic", 4] }      // "logic"
{ "substr": ["jsonlogic", -5] }     // "logic" (from end)
{ "substr": ["jsonlogic", 0, -5] }  // "json" (exclude last 5)
```

---

### Debugging

#### `log` - Console output
```json
// Logs value and returns it unchanged
{ "log": { "var": "debug_value" } }
```

---

## Truthy / Falsy Rules

JSONLogic has its **own specification** for truthiness that differs from JavaScript:

### Falsy Values
- `0` (zero)
- `[]` (empty array)
- `""` (empty string)
- `null`

### Truthy Values
- Any non-zero number (`1`, `-1`, `0.5`)
- Any non-empty array (`[1]`, `[0]`, `[[]]`)
- Any non-empty string (`"hello"`, `"0"`, `"false"`)

### Key Differences from JavaScript

| Value | JavaScript | JSONLogic |
|-------|------------|-----------|
| `[]` (empty array) | truthy | **falsy** |
| `"0"` (string zero) | falsy | **truthy** |

---

## Adding Custom Operations

### JavaScript API (v1.0.9+)

```javascript
// Add single operation
jsonLogic.add_operation("operationName", functionReference);

// Add built-in function
jsonLogic.add_operation("sqrt", Math.sqrt);

// Add library of operations
jsonLogic.add_operation("Math", Math);
// Use as: { "Math.abs": -42 }  // returns 42

// Custom function example
jsonLogic.add_operation("plus", function(a, b) {
  return a + b;
});
// Use as: { "plus": [2, 3] }  // returns 5
```

### Important Limitations

1. **Security**: Arbitrary method calls removed in json-logic-js 2.0.0 due to prototype pollution. Convert OOP calls to simple functions.

2. **No Custom Control Flow**: Custom operations cannot create conditionals. All arguments are evaluated before the operation executes (depth-first recursion).

---

## Real-World Example: Fizz Buzz

```json
{
  "if": [
    { "==": [{ "%": [{ "var": "i" }, 15] }, 0] }, "fizzbuzz",
    { "==": [{ "%": [{ "var": "i" }, 3] }, 0] }, "fizz",
    { "==": [{ "%": [{ "var": "i" }, 5] }, 0] }, "buzz",
    { "var": "i" }
  ]
}
```

Usage:
```javascript
for (var i = 1; i <= 30; i++) {
  console.log(jsonLogic.apply(fizzbuzz_rule, { i: i }));
}
```

---

## Common Patterns

### Null-safe property access
```json
{ "var": ["user.name", "Anonymous"] }
```

### Range validation
```json
{ "<=": [0, { "var": "value" }, 100] }
```

### Multiple condition check
```json
{
  "and": [
    { ">=": [{ "var": "age" }, 18] },
    { "==": [{ "var": "status" }, "active"] },
    { "in": [{ "var": "role" }, ["admin", "editor"]] }
  ]
}
```

### Dynamic field access
```json
{ "var": { "cat": ["items.", { "var": "index" }] } }
```

### Conditional default
```json
{
  "if": [
    { "var": "premium" },
    { "var": "premiumPrice" },
    { "var": "standardPrice" }
  ]
}
```

---

## Validation Checklist

When implementing JSONLogic rules, verify:

- [ ] All JSON is valid (parseable)
- [ ] Operators are spelled correctly
- [ ] Arguments are in arrays where required
- [ ] Data paths match actual data structure
- [ ] Truthy/falsy behavior is as expected
- [ ] Edge cases handled (null, empty arrays, missing keys)
- [ ] No circular references
- [ ] Custom operations registered before use

---

## Resources

- **Official Site**: https://jsonlogic.com
- **Playground**: https://jsonlogic.com/play.html
- **Operations Reference**: https://jsonlogic.com/operations.html
- **Custom Operations**: https://jsonlogic.com/add_operation.html
- **GitHub (JS)**: https://github.com/jwadhams/json-logic-js
