const mridangPlugin = require('@mridang/eslint-defaults');

module.exports = [
  ...mridangPlugin.configs.recommended,
  {
    ignores: ['src/services/sample/express.ts'], // Exclude this file
  },
];
