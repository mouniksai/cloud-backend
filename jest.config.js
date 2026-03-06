module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/config/db.js', // Exclude database connection
        '!testing/mocks/**', // Exclude mocks
        '!**/node_modules/**'
    ],
    testMatch: [
        '**/testing/**/*.test.js'
    ],
    setupFilesAfterEnv: ['<rootDir>/testing/setup.js'],
    coverageThreshold: {
        global: {
            branches: 10,
            functions: 10,
            lines: 10,
            statements: 10
        }
    },
    // moduleDirectories: ['node_modules', 'src'], // Commented out to allow manual mocks to work properly
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    verbose: true
};
