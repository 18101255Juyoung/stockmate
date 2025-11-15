/**
 * Database Test Helpers
 * Shared utilities for integration tests
 */

/**
 * Verifies that tests are using the test database (stockmate_test)
 * Throws an error if production database is detected
 *
 * MUST be called in beforeAll() hook of integration tests
 */
export function verifyTestDatabase() {
  const dbUrl = process.env.DATABASE_URL || ''

  if (!dbUrl.includes('stockmate_test')) {
    throw new Error(
      '🚨 FATAL: Tests MUST use stockmate_test database!\n' +
      `Current DATABASE_URL: ${dbUrl}\n` +
      'This prevents accidental deletion of production data.\n' +
      'Run tests with: npm test\n' +
      '\n' +
      'If you see this error:\n' +
      '1. Make sure you run: npm test (not jest directly)\n' +
      '2. Check that jest.setup.js is loading correctly\n' +
      '3. Check that .env.test has DATABASE_URL with stockmate_test'
    )
  }

  console.log('✅ Database safety check passed: stockmate_test')
}
