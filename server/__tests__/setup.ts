/**
 * Jest Test Setup
 * Configures test environment for SyntexLegger
 */

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock console.log in tests to reduce noise
// Uncomment if needed:
// global.console.log = jest.fn();

// Clean up after all tests
afterAll(async () => {
  // Close any open connections
});
