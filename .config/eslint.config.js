import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

// ESLint 9 flat config. Type-aware linting is intentionally off (keeps it fast and
// config-free); tsc --noEmit already provides full type checking. eslint-config-prettier
// last, to disable any stylistic rules that would fight Prettier.
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  prettier,
);
