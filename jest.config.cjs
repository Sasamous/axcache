module.exports = {
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.cjs' }]
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['js'],
  testMatch: ['**/tests/**/*.test.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(axios)/)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs']
};
