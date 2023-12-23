const { resolve } = require('node:path');

const project = resolve(__dirname, 'tsconfig.json');

/** @type { import('eslint').ESLint.ConfigData } */
module.exports = {
  root: true,
  env: {
    node: true,
  },
  plugins: ['prettier'],
  extends: [
    require.resolve('@vercel/style-guide/eslint/node'),
    require.resolve('@vercel/style-guide/eslint/typescript'),
  ],
  parserOptions: {
    project,
  },
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
    },
  },
  overrides: [
    {
      files: ['*.ts'],
      rules: {
        semi: ['error', 'always'],
        quotes: ['error', 'single'],
        'new-cap': 'off',
        'object-curly-spacing': ['error', 'always'],
        'array-bracket-spacing': 'off',
        'unicorn/filename-case': 'off',
        'import/no-named-as-default-member': 'off',
        'no-bitwise': 'off',
        'no-param-reassign': 'off',
        'eslint-comments/disable-enable-pair': 'off',
        'prettier/prettier': 'error',
        '@typescript-eslint/prefer-reduce-type-parameter': 'off',
        '@typescript-eslint/no-shadow': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-throw-literal': 'off',
        '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      },
    },
  ],
};
