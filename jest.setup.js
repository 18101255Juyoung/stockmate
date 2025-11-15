// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom')

// ⚠️ CRITICAL: Force test database to prevent production data loss
// This MUST be set before any database connections are established
process.env.DATABASE_URL = 'postgresql://postgres:wnthdud12@localhost:5432/stockmate_test'
process.env.NODE_ENV = 'test'

// Verify we're using the test database
const dbUrl = process.env.DATABASE_URL
if (!dbUrl.includes('stockmate_test')) {
  throw new Error(
    '🚨 FATAL: Tests must use stockmate_test database!\n' +
    `Current DATABASE_URL: ${dbUrl}\n` +
    'This prevents accidental deletion of production data.'
  )
}

console.log('✅ Test environment initialized')
console.log(`📦 Using database: stockmate_test`)

// Load remaining test environment variables
const dotenv = require('dotenv')
const path = require('path')
dotenv.config({ path: path.resolve(__dirname, '.env.test') })
