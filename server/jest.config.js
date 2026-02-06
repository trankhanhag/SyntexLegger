/**
 * Jest Configuration
 * SyntexLegger - Unit Tests with hybrid JS/TS support
 * Primary runtime: JavaScript (index.js)
 * TypeScript: Used for type-safe modules and future migration
 */

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@db/(.*)$': '<rootDir>/src/db/$1',
  },
  collectCoverageFrom: [
    // Include both JS and TS source files
    '*.js',
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/types/**/*.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/*.config.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  modulePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
};
