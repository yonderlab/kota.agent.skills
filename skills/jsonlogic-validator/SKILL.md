---
name: jsonlogic-validator
description: Implement, validate, and test JSONLogic rules for portable business logic. Use when working with JSONLogic syntax, creating rules for conditional logic, validating rule structures, testing rules against data, converting business requirements to JSONLogic, or using engine custom operations like today, match, phone_valid, iban_valid. Triggers on "write jsonlogic", "validate jsonlogic", "create a rule", "business logic as JSON", "conditional logic", "regex match", "iban validation", or any mention of JSONLogic rules.
---

# JSONLogic Validator

Implement and validate JSONLogic rules—portable, JSON-serializable business logic that works across JavaScript, Python, PHP, Ruby, Go, Java, .Net, and C++.

## Core Syntax

Every rule: `{ "operator": [arguments] }`

```json
{"==": [1, 1]}                              // comparison
{"var": "user.name"}                        // data access
{"and": [{">=": [{"var": "age"}, 18]}, {"var": "active"}]}  // compound
```

## Quick Reference

| Category    | Operators                                                       |
| ----------- | --------------------------------------------------------------- |
| **Data**    | `var`, `missing`, `missing_some`                                |
| **Logic**   | `if`, `==`, `===`, `!=`, `!==`, `!`, `!!`, `and`, `or`          |
| **Numeric** | `>`, `>=`, `<`, `<=`, `+`, `-`, `*`, `/`, `%`, `max`, `min`     |
| **Array**   | `map`, `filter`, `reduce`, `all`, `some`, `none`, `merge`, `in` |
| **String**  | `cat`, `substr`, `in`                                           |
| **Custom** | `today`, `match`, `phone_valid`, `iban_valid` |

## Engine Custom Operations

The `@kotaio/adaptive-requirements-engine` registers these operations on top of standard JSONLogic. **They must exist in the engine before they can be used in rules.** If you need a new custom operation, implement it in the engine first, then update this skill.

| Operation | Syntax | Returns |
|-----------|--------|---------|
| `today` | `{ "today": {} }` | Today's date as `"YYYY-MM-DD"` |
| `match` | `{ "match": [{ "var": "field" }, "^pattern$", "flags"] }` | Boolean regex test |
| `phone_valid` | `{ "phone_valid": [{ "var": "phone" }, "NL"] }` | Phone number validation via libphonenumber-js |
| `iban_valid` | `{ "iban_valid": [{ "var": "iban" }, "NL"] }` | IBAN validation via ibantools (ISO 13616 structure + mod-97 checksum) |

Date arithmetic (age, months-since, date-diff) is not a built-in: compose with `today` plus string `substr`/`-`/`if` against ISO `YYYY-MM-DD` values. Example "age in whole years from `dob`":

```json
{ "-": [
  { "-": [
    { "substr": [{ "today": {} }, 0, 4] },
    { "substr": [{ "var": "dob" }, 0, 4] }
  ]},
  { "if": [
    { ">=": [
      { "substr": [{ "today": {} }, 5] },
      { "substr": [{ "var": "dob" }, 5] }
    ]},
    0,
    1
  ]}
]}
```

### match

Regex pattern matching. Third argument (flags like `"i"`) is optional. Returns `false` on invalid patterns.

```json
{ "match": [{ "var": "diagnosis_code" }, "^[A-Z]\\d{2}(\\.\\d{1,2})?$"] }
```

### phone_valid

Phone number validation via `libphonenumber-js`. Second argument (ISO 3166-1 alpha-2 country code) is optional — if omitted, the number must be in E.164 format (e.g. `+31612345678`). Returns `false` for non-string/empty values.

```json
{ "phone_valid": [{ "var": "phone" }] }
{ "phone_valid": [{ "var": "phone" }, "NL"] }
{ "phone_valid": [{ "var": "phone" }, { "var": "country_code" }] }
```

### iban_valid

IBAN validation via `ibantools`. Checks ISO 13616 per-country length and structure, plus the ISO 7064 mod-97-10 checksum. Tolerates user-pasted spaces (`IE21 ANIB 0011 1111 11`). Second argument (ISO 3166-1 alpha-2 country code) is optional — when supplied, the IBAN must additionally start with that country code (case-insensitive). Returns `false` for non-string/empty values.

```json
{ "iban_valid": [{ "var": "iban" }] }
{ "iban_valid": [{ "var": "iban" }, "NL"] }
{ "iban_valid": [{ "var": "iban" }, { "var": "country_code" }] }
```

## Rule Contexts

Rules appear in 4 field definition contexts:

- **`validation.rules`** — Custom validation with error messages and optional `when` condition
- **`validation.requireWhen`** — Conditional required fields
- **`excludeWhen`** — Conditionally exclude fields
- **`compute`** — Derived/calculated field values

## Workflow

### 1. Gather Requirements

Clarify:

- What data fields are available?
- What conditions determine the outcome?
- What should the rule return (boolean, value, category)?

### 2. Write the Rule

Build incrementally from inner expressions outward:

```json
// Requirement: "Premium users over 25 get 20% discount, others get 10%"
{
  "if": [
    { "and": [{ "==": [{ "var": "tier" }, "premium"] }, { ">": [{ "var": "age" }, 25] }] },
    0.2,
    0.1
  ]
}
```

### 3. Validate

Run the validation script (no dependencies required):

```bash
node scripts/validate-jsonlogic.cjs '<rule>' '<data>'
```

Example:

```bash
node scripts/validate-jsonlogic.cjs '{">=": [{"var": "age"}, 18]}' '{"age": 25}'
```

### 4. Test with Cases

Requires: `npm install json-logic-js`

```bash
node scripts/test-jsonlogic.cjs '<rule>' --test-cases '[
  {"data": {"age": 25}, "expected": true},
  {"data": {"age": 15}, "expected": false}
]'
```

## Common Patterns

### Null-safe access with default

```json
{ "var": ["user.name", "Guest"] }
```

### Range check (between)

```json
{ "<=": [0, { "var": "value" }, 100] }
```

### Multi-condition (all must pass)

```json
{
  "and": [
    { ">=": [{ "var": "age" }, 18] },
    { "==": [{ "var": "status" }, "active"] },
    { "in": [{ "var": "role" }, ["admin", "editor"]] }
  ]
}
```

### Grade/tier classification

```json
{
  "if": [
    { ">=": [{ "var": "score" }, 90] },
    "A",
    { ">=": [{ "var": "score" }, 80] },
    "B",
    { ">=": [{ "var": "score" }, 70] },
    "C",
    "F"
  ]
}
```

### Array operations

```json
// Sum: reduce with +
{"reduce": [{"var": "items"}, {"+": [{"var": "accumulator"}, {"var": "current"}]}, 0]}

// Filter: keep matching
{"filter": [{"var": "items"}, {">": [{"var": ""}, 10]}]}

// Any match: some
{"some": [{"var": "items"}, {"==": [{"var": ".status"}, "error"]}]}
```

## Truthy/Falsy (differs from JavaScript)

**Falsy**: `0`, `[]`, `""`, `null`
**Truthy**: Everything else (including `"0"` and `[0]`)

## Validation Checklist

Before deploying a rule:

- [ ] Valid JSON syntax
- [ ] All operators spelled correctly
- [ ] Arguments in arrays where required
- [ ] Data paths match actual data structure
- [ ] Edge cases handled (null, empty, missing keys)
- [ ] Tested with representative data samples

## References

For complete operator documentation with all arguments and edge cases:

- See `references/jsonlogic-reference.md`
