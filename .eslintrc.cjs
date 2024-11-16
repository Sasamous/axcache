module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
    browser: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    quotes: ['error', 'single'],
    indent: ['error', 2],
    'no-unused-vars': ['warn', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }],
    'no-undef': 'error',
    'no-constant-condition': 'warn',
    'no-unsafe-finally': 'off',
    'no-func-assign': 'off'
  },
  ignorePatterns: ['dist/**', 'lib/cjs/**', 'lib/esm/**'],
  globals: {
    fail: 'readonly'
  }
}; 