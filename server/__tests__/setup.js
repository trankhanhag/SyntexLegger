/**
 * Jest Test Setup
 * SyntexLegger - Unit Tests
 */

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock console.log and console.error to reduce noise during tests
// Comment out if you need to debug
// global.console = {
//     ...console,
//     log: jest.fn(),
//     error: jest.fn(),
//     warn: jest.fn()
// };

// Global test utilities
global.testUtils = {
    /**
     * Generate a unique test ID
     */
    generateId: (prefix = 'test') => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

    /**
     * Wait for a specified time
     */
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

// Cleanup after all tests
afterAll(async () => {
    // Add any global cleanup here
});
