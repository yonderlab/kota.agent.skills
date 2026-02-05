#!/usr/bin/env node
/**
 * JSONLogic Test Runner - Execute JSONLogic rules against test data.
 *
 * Usage:
 *   node test-jsonlogic.js '<rule>' '<data>'
 *   node test-jsonlogic.js --file rule.json --data data.json
 *   node test-jsonlogic.js '<rule>' --test-cases '[{"data": {...}, "expected": ...}, ...]'
 *
 * Requires: npm install json-logic-js
 */

let jsonLogic;
try {
  jsonLogic = require('json-logic-js');
} catch (e) {
  console.error('❌ json-logic-js library not installed.');
  console.error('   Install with: npm install json-logic-js');
  process.exit(1);
}

function applyRule(rule, data = {}) {
  return jsonLogic.apply(rule, data);
}

function runTestCases(rule, testCases) {
  let allPassed = true;

  console.log(`\n🧪 Running ${testCases.length} test case(s):\n`);

  testCases.forEach((test, i) => {
    const data = test.data || {};
    const expected = test.expected;
    const description = test.description || `Test case ${i + 1}`;

    try {
      const result = applyRule(rule, data);
      const passed = JSON.stringify(result) === JSON.stringify(expected);

      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${description}`);

      if (!passed) {
        allPassed = false;
        console.log(`       Data:     ${JSON.stringify(data)}`);
        console.log(`       Expected: ${JSON.stringify(expected)}`);
        console.log(`       Got:      ${JSON.stringify(result)}`);
      }
    } catch (e) {
      allPassed = false;
      console.log(`❌ ERROR - ${description}`);
      console.log(`       Error: ${e.message}`);
    }
  });

  console.log();
  if (allPassed) {
    console.log(`✅ All ${testCases.length} test(s) passed!`);
  } else {
    console.log(`❌ Some tests failed`);
  }

  return allPassed;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    rule: null,
    data: null,
    file: null,
    dataFile: null,
    testCases: null,
    testFile: null,
  };

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--file' || args[i] === '-f') {
      result.file = args[++i];
    } else if (args[i] === '--data' || args[i] === '-d' || args[i] === '--data-file') {
      result.dataFile = args[++i];
    } else if (args[i] === '--test-cases' || args[i] === '-t') {
      result.testCases = args[++i];
    } else if (args[i] === '--test-file') {
      result.testFile = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
JSONLogic Test Runner

Usage:
  node test-jsonlogic.js '<rule>' '<data>'
  node test-jsonlogic.js --file rule.json --data data.json
  node test-jsonlogic.js '<rule>' --test-cases '[{"data": {...}, "expected": ...}]'

Options:
  --file, -f       Read rule from JSON file
  --data, -d       Read data from JSON file
  --test-cases, -t JSON array of test cases with 'data' and 'expected' keys
  --test-file      Read test cases from JSON file
  --help, -h       Show this help message

Test Case Format:
  [
    {"data": {"age": 25}, "expected": true, "description": "Adult user"},
    {"data": {"age": 15}, "expected": false, "description": "Minor user"}
  ]

Examples:
  node test-jsonlogic.js '{"==": [1, 1]}' '{}'
  node test-jsonlogic.js '{"var": "name"}' '{"name": "Alice"}'
  node test-jsonlogic.js '{">=": [{"var": "age"}, 18]}' --test-cases '[{"data": {"age": 25}, "expected": true}]'
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
    console.error('Usage: node test-jsonlogic.js <rule> <data>');
    console.error('       node test-jsonlogic.js --file rule.json --data data.json');
    process.exit(1);
  }

  // Handle test cases mode
  if (args.testCases || args.testFile) {
    let testCases;
    if (args.testFile) {
      try {
        const content = fs.readFileSync(args.testFile, 'utf8');
        testCases = JSON.parse(content);
      } catch (e) {
        console.error(`❌ Error loading test file: ${e.message}`);
        process.exit(1);
      }
    } else {
      try {
        testCases = JSON.parse(args.testCases);
      } catch (e) {
        console.error(`❌ Invalid JSON in test cases: ${e.message}`);
        process.exit(1);
      }
    }

    console.log('📝 Rule:');
    console.log(JSON.stringify(rule, null, 2));

    const success = runTestCases(rule, testCases);
    process.exit(success ? 0 : 1);
  }

  // Single execution mode
  let data = {};
  if (args.dataFile) {
    try {
      const content = fs.readFileSync(args.dataFile, 'utf8');
      data = JSON.parse(content);
    } catch (e) {
      console.error(`❌ Error loading data file: ${e.message}`);
      process.exit(1);
    }
  } else if (args.data) {
    try {
      data = JSON.parse(args.data);
    } catch (e) {
      console.error(`❌ Invalid JSON in data: ${e.message}`);
      process.exit(1);
    }
  }

  console.log('📝 Rule:');
  console.log(JSON.stringify(rule, null, 2));
  console.log('\n📊 Data:');
  console.log(JSON.stringify(data, null, 2));

  try {
    const result = applyRule(rule, data);
    console.log('\n✅ Result:');
    console.log(result !== undefined ? JSON.stringify(result, null, 2) : 'undefined');
  } catch (e) {
    console.error(`\n❌ Execution error: ${e.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { applyRule, runTestCases };

// Run if called directly
if (require.main === module) {
  main();
}
