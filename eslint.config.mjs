// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Lo que no se lintea en ningún workspace.
  {
    ignores: ['**/dist/**', '**/coverage/**'],
  },

  // Base compartida: aplica al TypeScript de todo el monorepo.
  // projectService encuentra el tsconfig de cada workspace y habilita
  // las reglas que necesitan información de tipos.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Frontend: navegador + reglas de React.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
  },

  // Backend: Node + globals de Jest para los tests.
  {
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },

  // Apaga las reglas de ESLint que chocarían con Prettier,
  // para que el formato lo maneje solo Prettier.
  eslintConfigPrettier,
);
