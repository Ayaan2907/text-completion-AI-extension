import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'extension/dist/**',
      'extension/latest git dist/**',
      'build/**',
      // CJS build configuration, not application code.
      'extension/src/webpack.config.js',
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Security invariant: form content and key material must never be
      // logged. console.error is allowed for pre-mapped failure messages.
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    // Node CLI helpers where stdout IS the interface (check runners, mock
    // provider, e2e prep). Not shipped in the extension bundle.
    files: ['scripts/**/*.mjs', 'test/e2e/**/*.mjs'],
    rules: {
      'no-console': 'off',
    },
  },
);
