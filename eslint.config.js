import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import jest from 'eslint-plugin-jest';

export default [
  {
    ignores: ['eslint.config.js'],
  },
  js.configs.recommended,
  prettier, // Disable ESLint rules that conflict with Prettier
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        require: 'readonly',
        module: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error', // Enforce Prettier formatting rules
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-console': 'warn',
      eqeqeq: 'error',
      curly: 'error',
    },
  },
  {
    files: ['tests/**/*.test.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        describe: 'readonly',
        it: 'readonly',
        beforeEach: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        setTimeout: 'readonly',
      },
    },
    plugins: {
      jest,
    },
    rules: {
      'jest/consistent-test-it': ['error', { fn: 'it' }],
      'jest/no-disabled-tests': 'warn',
      'jest/no-focused-tests': 'error',
      'jest/no-identical-title': 'error',
      'jest/prefer-to-have-length': 'warn',
      'jest/valid-expect': 'error',
    },
  },
];
