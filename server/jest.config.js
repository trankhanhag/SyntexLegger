/**
 * Jest Configuration
 * SyntexHCSN - Unit Tests
 */

module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    collectCoverageFrom: [
        '**/*.js',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!jest.config.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
    testTimeout: 10000,
    setupFilesAfterEnv: ['./__tests__/setup.js'],
    // Ignore legacy files during test
    testPathIgnorePatterns: ['/node_modules/'],
    modulePathIgnorePatterns: ['<rootDir>/node_modules/']
};
