#!/usr/bin/env node
/**
 * JSONLogic Validator - Validates JSONLogic rules for syntax and semantic correctness.
 *
 * Usage:
 *   node validate-jsonlogic.js '<json_rule>'
 *   node validate-jsonlogic.js '<json_rule>' '<json_data>'
 *   node validate-jsonlogic.js --file rule.json
 *   node validate-jsonlogic.js --file rule.json --data data.json
 *
 * Examples:
 *   node validate-jsonlogic.js '{"==": [1, 1]}'
 *   node validate-jsonlogic.js '{"var": "name"}' '{"name": "Alice"}'
 */

// All valid JSONLogic operators
const VALID_OPERATORS = new Set([
  // Data access
  'var', 'missing', 'missing_some',
  // Logic
  'if', '?:', '==', '===', '!=', '!==', '!', '!!', 'or', 'and',
  // Numeric
  '>', '>=', '<', '<=', 'max', 'min', '+', '-', '*', '/', '%',
  // Array
  'map', 'filter', 'reduce', 'all', 'some', 'none', 'merge', 'in',
  // String
  'cat', 'substr',
  // Misc
  'log'
]);

// Operators that require specific argument counts: [min, max] (null = no limit)
const OPERATOR_ARITY = {
  'var': [0, 2],
  'missing': [1, null],
  'missing_some': [2, 2],
  'if': [3, null],
  '?:': [3, null],
  '!': [1, 1],
  '!!': [1, 1],
  '==': [2, 2],
  '===': [2, 2],
  '!=': [2, 2],
  '!==': [2, 2],
  '>': [2, 3],
  '>=': [2, 3],
  '<': [2, 3],
  '<=': [2, 3],
  'max': [1, null],
  'min': [1, null],
  '+': [1, null],
  '-': [1, 2],
  '*': [2, null],
  '/': [2, 2],
  '%': [2, 2],
  'map': [2, 2],
  'filter': [2, 2],
  'reduce': [3, 3],
  'all': [2, 2],
  'some': [2, 2],
  'none': [2, 2],
  'merge': [1, null],
  'in': [2, 2],
  'cat': [1, null],
  'substr': [2, 3],
  'log': [1, 1],
  'or': [1, null],
  'and': [1, null],
};

class ValidationError {
  constructor(message, path = '', severity = 'error') {
    this.message = message;
    this.path = path;
    this.severity = severity;
  }

  toString() {
    const prefix = `[${this.severity.toUpperCase()}]`;
    if (this.path) {
      return `${prefix} At '${this.path}': ${this.message}`;
    }
    return `${prefix} ${this.message}`;
  }
}

class JSONLogicValidator {
  constructor(customOperators = null) {
    this.errors = [];
    this.warnings = [];
    this.validOperators = new Set(VALID_OPERATORS);
    if (customOperators) {
      customOperators.forEach(op => this.validOperators.add(op));
    }
  }

  validate(rule, path = 'root') {
    this.errors = [];
    this.warnings = [];
    this._validateRule(rule, path);
    return this.errors.length === 0;
  }

  _validateRule(rule, path) {
    // Primitives are always valid as values
    if (rule === null || typeof rule === 'boolean' || typeof rule === 'number' || typeof rule === 'string') {
      return;
    }

    // Arrays are valid - validate each element
    if (Array.isArray(rule)) {
      rule.forEach((item, i) => {
        this._validateRule(item, `${path}[${i}]`);
      });
      return;
    }

    // Must be an object (operation) at this point
    if (typeof rule !== 'object') {
      this.errors.push(new ValidationError(
        `Expected object, array, or primitive, got ${typeof rule}`,
        path
      ));
      return;
    }

    const keys = Object.keys(rule);

    // Empty object is valid (returns {})
    if (keys.length === 0) {
      return;
    }

    // JSONLogic rules should have exactly one key (the operator)
    if (keys.length > 1) {
      this.warnings.push(new ValidationError(
        `Multiple keys in rule object. Only first key '${keys[0]}' will be used as operator`,
        path,
        'warning'
      ));
    }

    const operator = keys[0];
    const args = rule[operator];

    // Validate operator
    if (!this.validOperators.has(operator)) {
      this.errors.push(new ValidationError(
        `Unknown operator '${operator}'. Valid operators: ${[...this.validOperators].sort().join(', ')}`,
        path
      ));
      return;
    }

    // Normalize arguments to array for arity checking
    const argsList = Array.isArray(args) ? args : [args];

    // Check arity
    if (OPERATOR_ARITY[operator]) {
      const [minArgs, maxArgs] = OPERATOR_ARITY[operator];
      const argCount = argsList.length;

      if (minArgs !== null && argCount < minArgs) {
        this.errors.push(new ValidationError(
          `Operator '${operator}' requires at least ${minArgs} argument(s), got ${argCount}`,
          path
        ));
      }

      if (maxArgs !== null && argCount > maxArgs) {
        this.errors.push(new ValidationError(
          `Operator '${operator}' accepts at most ${maxArgs} argument(s), got ${argCount}`,
          path
        ));
      }
    }

    // Operator-specific validation
    this._validateOperatorSpecific(operator, args, path);

    // Recursively validate arguments
    if (Array.isArray(args)) {
      args.forEach((arg, i) => {
        this._validateRule(arg, `${path}.${operator}[${i}]`);
      });
    } else {
      this._validateRule(args, `${path}.${operator}`);
    }
  }

  _validateOperatorSpecific(operator, args, path) {
    if (operator === 'var') {
      let firstArg = Array.isArray(args) && args.length > 0 ? args[0] : args;

      if (firstArg !== null && firstArg !== '' && typeof firstArg !== 'string' && typeof firstArg !== 'number') {
        if (typeof firstArg !== 'object') {
          this.warnings.push(new ValidationError(
            `'var' typically expects a string path or number index, got ${typeof firstArg}`,
            path,
            'warning'
          ));
        }
      }
    } else if (operator === 'missing_some') {
      if (Array.isArray(args) && args.length >= 2) {
        const minRequired = args[0];
        if (typeof minRequired !== 'number') {
          this.errors.push(new ValidationError(
            `'missing_some' first argument must be a number (minimum required), got ${typeof minRequired}`,
            path
          ));
        }
        const keys = args[1];
        if (!Array.isArray(keys)) {
          this.errors.push(new ValidationError(
            `'missing_some' second argument must be an array of keys`,
            path
          ));
        }
      }
    } else if (operator === 'if' || operator === '?:') {
      const argsList = Array.isArray(args) ? args : [args];
      if (argsList.length >= 3 && argsList.length % 2 === 0) {
        this.warnings.push(new ValidationError(
          `'if' with even number of arguments (${argsList.length}) has no else clause`,
          path,
          'warning'
        ));
      }
    } else if (operator === 'reduce') {
      if (Array.isArray(args) && args.length >= 3) {
        const reducer = args[1];
        if (typeof reducer === 'object' && reducer !== null) {
          const reducerStr = JSON.stringify(reducer);
          if (!reducerStr.includes('accumulator') && !reducerStr.includes('current')) {
            this.warnings.push(new ValidationError(
              `'reduce' logic should reference 'accumulator' and/or 'current' via var`,
              path,
              'warning'
            ));
          }
        }
      }
    }
  }

  getReport() {
    const lines = [];

    if (this.errors.length === 0 && this.warnings.length === 0) {
      lines.push('✅ JSONLogic rule is valid!');
      return lines.join('\n');
    }

    if (this.errors.length > 0) {
      lines.push(`❌ Found ${this.errors.length} error(s):`);
      this.errors.forEach(error => {
        lines.push(`  • ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      lines.push(`⚠️  Found ${this.warnings.length} warning(s):`);
      this.warnings.forEach(warning => {
        lines.push(`  • ${warning}`);
      });
    }

    return lines.join('\n');
  }
}

function checkDataPaths(rule, data, path = 'root') {
  const warnings = [];

  if (typeof rule === 'object' && rule !== null && !Array.isArray(rule)) {
    if ('var' in rule) {
      let varPath = rule.var;
      if (Array.isArray(varPath)) {
        varPath = varPath[0] || '';
      }

      if (typeof varPath === 'string' && varPath) {
        const parts = varPath.split('.');
        let current = data;

        for (const part of parts) {
          if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
            if (!(part in current)) {
              warnings.push(`Data path '${varPath}' not found in provided data`);
              break;
            }
            current = current[part];
          } else if (Array.isArray(current)) {
            const idx = parseInt(part, 10);
            if (isNaN(idx)) {
              warnings.push(`Cannot access property '${part}' on array in path '${varPath}'`);
              break;
            }
            if (idx >= current.length) {
              warnings.push(`Array index ${idx} out of bounds for path '${varPath}'`);
              break;
            }
            current = current[idx];
          } else {
            warnings.push(`Cannot access property '${part}' on primitive in path '${varPath}'`);
            break;
          }
        }
      }
    }

    // Recursively check nested rules
    for (const [key, value] of Object.entries(rule)) {
      warnings.push(...checkDataPaths(value, data, `${path}.${key}`));
    }
  } else if (Array.isArray(rule)) {
    rule.forEach((item, i) => {
      warnings.push(...checkDataPaths(item, data, `${path}[${i}]`));
    });
  }

  return warnings;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    rule: null,
    data: null,
    file: null,
    dataFile: null,
    customOps: null,
  };

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--file' || args[i] === '-f') {
      result.file = args[++i];
    } else if (args[i] === '--data' || args[i] === '-d' || args[i] === '--data-file') {
      result.dataFile = args[++i];
    } else if (args[i] === '--custom-ops' || args[i] === '-c') {
      result.customOps = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
JSONLogic Validator

Usage:
  node validate-jsonlogic.js '<json_rule>'
  node validate-jsonlogic.js '<json_rule>' '<json_data>'
  node validate-jsonlogic.js --file rule.json
  node validate-jsonlogic.js --file rule.json --data data.json

Options:
  --file, -f       Read rule from JSON file
  --data, -d       Read data from JSON file
  --custom-ops, -c Comma-separated list of custom operators to allow
  --help, -h       Show this help message

Examples:
  node validate-jsonlogic.js '{"==": [1, 1]}'
  node validate-jsonlogic.js '{"var": "name"}' '{"name": "Alice"}'
`);
      process.exit(0);
    } else if (!result.rule) {
      result.rule = args[i];
    } else if (!result.data) {
      result.data = args[i];
    }
    i++;
  }

  return result;
}

function main() {
  const args = parseArgs();
  const fs = require('fs');

  // Get rule
  let rule;
  if (args.file) {
    try {
      const content = fs.readFileSync(args.file, 'utf8');
      rule = JSON.parse(content);
    } catch (e) {
      console.error(`❌ Error loading rule file: ${e.message}`);
      process.exit(1);
    }
  } else if (args.rule) {
    try {
      rule = JSON.parse(args.rule);
    } catch (e) {
      console.error(`❌ Invalid JSON in rule: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.error('Usage: node validate-jsonlogic.js <rule> [data]');
    console.error('       node validate-jsonlogic.js --file rule.json [--data data.json]');
    process.exit(1);
  }

  // Get data (optional)
  let data = null;
  if (args.dataFile) {
    try {
      const content = fs.readFileSync(args.dataFile, 'utf8');
      data = JSON.parse(content);
    } catch (e) {
      console.warn(`⚠️  Could not load data file: ${e.message}`);
    }
  } else if (args.data) {
    try {
      data = JSON.parse(args.data);
    } catch (e) {
      console.warn(`⚠️  Invalid JSON in data: ${e.message}`);
    }
  }

  // Parse custom operators
  let customOps = null;
  if (args.customOps) {
    customOps = args.customOps.split(',').map(op => op.trim());
  }

  // Validate
  const validator = new JSONLogicValidator(customOps);
  const isValid = validator.validate(rule);

  console.log(validator.getReport());

  // Check data paths if data provided
  if (data !== null && isValid) {
    console.log('\n📊 Data path analysis:');
    const pathWarnings = checkDataPaths(rule, data);
    if (pathWarnings.length > 0) {
      pathWarnings.forEach(warning => {
        console.log(`  ⚠️  ${warning}`);
      });
    } else {
      console.log('  ✅ All var paths found in data');
    }
  }

  // Pretty print the rule
  console.log('\n📝 Formatted rule:');
  console.log(JSON.stringify(rule, null, 2));

  process.exit(isValid ? 0 : 1);
}

// Export for use as module
module.exports = { JSONLogicValidator, checkDataPaths, VALID_OPERATORS, OPERATOR_ARITY };

// Run if called directly
if (require.main === module) {
  main();
}
