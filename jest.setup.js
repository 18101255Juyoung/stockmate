// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom')

// Load test environment variables
// This ensures tests use stockmate_test database instead of production stockmate database
const dotenv = require('dotenv')
const path = require('path')

// Load .env.test file for test environment
dotenv.config({ path: path.resolve(__dirname, '.env.test') })
