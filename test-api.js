#!/usr/bin/env node

/**
 * REST API Test Suite
 * Tests all endpoints of the Thai Food REST API
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function test(name, testFn) {
  totalTests++;
  process.stdout.write(`${colors.blue}Testing:${colors.reset} ${name}... `);

  try {
    await testFn();
    passedTests++;
    console.log(`${colors.green}✓ PASSED${colors.reset}`);
    return true;
  } catch (error) {
    failedTests++;
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Thai Food REST API Test Suite${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // ========================================================================
  // ROOT & HEALTH TESTS
  // ========================================================================

  console.log(`\n${colors.yellow}=== Root & Health Tests ===${colors.reset}\n`);

  await test('GET / - API Documentation', async () => {
    const data = await fetchJSON(`${BASE_URL}/`);
    assert(data.name === 'Thai Food API', 'Should return API name');
    assert(data.endpoints, 'Should have endpoints documentation');
  });

  await test('GET /health - Health Check', async () => {
    const data = await fetchJSON(`${BASE_URL}/health`);
    assert(data.status === 'ok', 'Health status should be ok');
    assert(data.timestamp, 'Should have timestamp');
  });

  // ========================================================================
  // DICTIONARY TESTS
  // ========================================================================

  console.log(`\n${colors.yellow}=== Dictionary Tests ===${colors.reset}\n`);

  await test('GET /api/dictionary/categories - List categories', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/dictionary/categories`);
    assert(Array.isArray(data), 'Should return array');
    assert(data.length > 0, 'Should have categories');
    assert(data[0].key, 'Category should have key');
    assert(data[0].count, 'Category should have count');
  });

  await test('GET /api/dictionary/search?q=rice - Search dictionary', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/dictionary/search?q=rice`);
    assert(data.query === 'rice', 'Should return search query');
    assert(data.count >= 0, 'Should have result count');
    assert(Array.isArray(data.results), 'Should have results array');
  });

  await test('GET /api/dictionary/category/gemuese - Get category', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/dictionary/category/gemuese`);
    assert(data.category === 'gemuese', 'Should return category name');
    assert(data.count > 0, 'Should have items');
    assert(Array.isArray(data.items), 'Should have items array');
  });

  // ========================================================================
  // BOOK INFO TESTS
  // ========================================================================

  console.log(`\n${colors.yellow}=== Book Info Tests ===${colors.reset}\n`);

  await test('GET /api/books - List all books', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/books`);
    assert(data.count > 0, 'Should have books');
    assert(Array.isArray(data.books), 'Should have books array');
    assert(data.books[0].title, 'Book should have title');
    assert(data.books[0].author, 'Book should have author');
  });

  await test('GET /api/books/search?language=de - Search books', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/books/search?language=de`);
    assert(data.count > 0, 'Should have German books');
    assert(Array.isArray(data.books), 'Should have books array');
  });

  await test('GET /api/books/stats - Get statistics', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/books/stats`);
    assert(data.total_books > 0, 'Should have total books count');
    assert(data.languages, 'Should have languages breakdown');
    assert(data.authors, 'Should have authors breakdown');
  });

  // ========================================================================
  // LIBRARY TESTS
  // ========================================================================

  console.log(`\n${colors.yellow}=== Library Tests ===${colors.reset}\n`);

  let firstCookbook = null;

  await test('GET /api/library/cookbooks - List cookbooks', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/library/cookbooks`);
    assert(data.count > 0, 'Should have cookbooks');
    assert(Array.isArray(data.cookbooks), 'Should have cookbooks array');
    assert(data.cookbooks[0].name, 'Cookbook should have name');
    assert(data.cookbooks[0].recipe_count > 0, 'Cookbook should have recipes');
    firstCookbook = data.cookbooks[0].name;
  });

  if (firstCookbook) {
    await test(`GET /api/library/cookbook/${firstCookbook} - Get cookbook recipes`, async () => {
      const data = await fetchJSON(`${BASE_URL}/api/library/cookbook/${firstCookbook}`);
      assert(data.cookbook === firstCookbook, 'Should return cookbook name');
      assert(data.count > 0, 'Should have recipes');
      assert(data.recipes, 'Should have recipes object');
    });
  }

  await test('GET /api/library/search?query=curry - Search recipes', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/library/search?query=curry`);
    assert(data.total_results >= 0, 'Should have results count');
    assert(Array.isArray(data.recipes), 'Should have recipes array');
  });

  await test('GET /api/library/stats - Get library statistics', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/library/stats`);
    assert(data.total_cookbooks > 0, 'Should have cookbooks count');
    assert(data.total_recipes > 0, 'Should have recipes count');
    assert(Array.isArray(data.regions), 'Should have regions array');
  });

  // ========================================================================
  // ENCYCLOPEDIA TESTS
  // ========================================================================

  console.log(`\n${colors.yellow}=== Encyclopedia Tests ===${colors.reset}\n`);

  await test('GET /api/encyclopedia/search?q=pad+thai - Search encyclopedia', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/encyclopedia/search?q=pad+thai`);
    assert(data.query === 'pad thai', 'Should return search query');
    assert(data.count >= 0, 'Should have results count');
    assert(Array.isArray(data.results), 'Should have results array');
  });

  await test('GET /api/encyclopedia/entries?limit=10 - Get entries', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/encyclopedia/entries?limit=10`);
    assert(data.count > 0, 'Should have entries');
    assert(Array.isArray(data.entries), 'Should have entries array');
    assert(data.entries.length <= 10, 'Should respect limit');
  });

  await test('GET /api/encyclopedia/regions - Get all regions', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/encyclopedia/regions`);
    assert(data.central, 'Should have central region');
    assert(data.north, 'Should have north region');
    assert(data.isaan, 'Should have isaan region');
    assert(data.south, 'Should have south region');
  });

  await test('GET /api/encyclopedia/relationships - Get relationship types', async () => {
    const data = await fetchJSON(`${BASE_URL}/api/encyclopedia/relationships`);
    assert(data.uses, 'Should have uses relationship');
    assert(data.usedBy, 'Should have usedBy relationship');
    assert(data.fits, 'Should have fits relationship');
  });

  // ========================================================================
  // ERROR HANDLING TESTS
  // ========================================================================

  console.log(`\n${colors.yellow}=== Error Handling Tests ===${colors.reset}\n`);

  await test('GET /api/invalid - 404 Not Found', async () => {
    const response = await fetch(`${BASE_URL}/api/invalid`);
    assert(response.status === 404, 'Should return 404');
  });

  await test('GET /api/dictionary/search (missing query) - 400 Bad Request', async () => {
    const response = await fetch(`${BASE_URL}/api/dictionary/search`);
    assert(response.status === 400, 'Should return 400 for missing query');
  });

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.log(`\n${colors.blue}========================================${colors.reset}`);
  console.log(`${colors.blue}Test Results${colors.reset}`);
  console.log(`${colors.blue}========================================${colors.reset}`);
  console.log(`Total:  ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);

  if (failedTests === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed${colors.reset}\n`);
    process.exit(1);
  }
}

// Check if server is running before starting tests
async function checkServer() {
  try {
    await fetch(`${BASE_URL}/health`);
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
console.log(`\n${colors.yellow}Checking if server is running...${colors.reset}`);
checkServer().then(isRunning => {
  if (!isRunning) {
    console.log(`${colors.red}Error: Server is not running at ${BASE_URL}${colors.reset}`);
    console.log(`${colors.yellow}Please start the server first:${colors.reset}`);
    console.log(`  npm run start:rest\n`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Server is running${colors.reset}`);
  runTests().catch(error => {
    console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
});
