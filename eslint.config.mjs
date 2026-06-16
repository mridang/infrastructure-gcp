import { includeIgnoreFile } from '@eslint/compat';
import { fileURLToPath } from 'node:url';
import mridangPlugin from '@mridang/eslint-defaults';

export default [
  includeIgnoreFile(fileURLToPath(new URL('.gitignore', import.meta.url))),
  ...mridangPlugin.configs.recommended,
  {
    files: ['**/package-lock.json'],
    rules: { 'json/no-empty-keys': 'off' },
  },
];
