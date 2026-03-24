---
name: jsonlogic-validator
description: Implement, validate, and test JSONLogic rules for portable business logic. Use when working with JSONLogic syntax, creating rules for conditional logic, validating rule structures, testing rules against data, converting business requirements to JSONLogic, or using engine custom operations like today, age_from_date, months_since, date_diff, abs, match. Triggers on "write jsonlogic", "validate jsonlogic", "create a rule", "business logic as JSON", "conditional logic", "date calculation", "regex match", or any mention of JSONLogic rules.
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

| Category | Operators |
|----------|-----------|
| **Data** | `var`, `missing`, `missing_some` |
| **Logic** | `if`, `==`, `===`, `!=`, `!==`, `!`, `!!`, `and`, `or` |
| **Numeric** | `>`, `>=`, `<`, `<=`, `+`, `-`, `*`, `/`, `%`, `max`, `min` |
| **Array** | `map`, `filter`, `reduce`, `all`, `some`, `none`, `merge`, `in` |
| **String** | `cat`, `substr`, `in` |
| **Custom** | `today`, `age_from_date`, `months_since`, `date_diff`, `abs`, `match` |

## Engine Custom Operations

The `@kotaio/adaptive-requirements-engine` registers these operations on top of standard JSONLogic. **They must exist in the engine before they can be used in rules.** If you need a new custom operation, implement it in the engine first, then update this skill.

| Operation | Syntax | Returns |
|-----------|--------|---------|
| `today` | `{ "today": {} }` | Today's date as `"YYYY-MM-DD"` |
| `age_from_date` | `{ "age_from_date": { "var": "birthdate" } }` | Age in whole years |
| `months_since` | `{ "months_since": { "var": "hire_date" } }` | Months elapsed |
| `date_diff` | `{ "date_diff": [from, to, "days"\|"months"\|"years"] }` | Difference in unit |
| `abs` | `{ "abs": { "var": "value" } }` | Absolute value |
| `match` | `{ "match": [{ "var": "field" }, "^pattern$", "flags"] }` | Boolean regex test |

### date_diff

Accepts both object and array form. Object form `{ "from": ..., "to": ..., "unit": "days" }` is normalized to array form `[from, to, unit]` by the engine. Unit must be `"days"`, `"months"`, or `"years"`.

### match

Regex pattern matching. Third argument (flags like `"i"`) is optional. Returns `false` on invalid patterns.

```json
{ "match": [{ "var": "diagnosis_code" }, "^[A-Z]\\d{2}(\\.\\d{1,2})?$"] }
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
    {"and": [
      {"==": [{"var": "tier"}, "premium"]},
      {">": [{"var": "age"}, 25]}
    ]},
    0.20,
    0.10
  ]
}
```

### 3. Validate

Run the validation script (no dependencies required):

```bash
node scripts/validate-jsonlogic.js '<rule>' '<data>'
```

Example:
```bash
node scripts/validate-jsonlogic.js '{">=": [{"var": "age"}, 18]}' '{"age": 25}'
```

### 4. Test with Cases

Requires: `npm install json-logic-js`

```bash
node scripts/test-jsonlogic.js '<rule>' --test-cases '[
  {"data": {"age": 25}, "expected": true},
  {"data": {"age": 15}, "expected": false}
]'
```

## Common Patterns

### Null-safe access with default
```json
{"var": ["user.name", "Guest"]}
```

### Range check (between)
```json
{"<=": [0, {"var": "value"}, 100]}
```

### Multi-condition (all must pass)
```json
{"and": [
  {">=": [{"var": "age"}, 18]},
  {"==": [{"var": "status"}, "active"]},
  {"in": [{"var": "role"}, ["admin", "editor"]]}
]}
```

### Grade/tier classification
```json
{"if": [
  {">=": [{"var": "score"}, 90]}, "A",
  {">=": [{"var": "score"}, 80]}, "B",
  {">=": [{"var": "score"}, 70]}, "C",
  "F"
]}
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
