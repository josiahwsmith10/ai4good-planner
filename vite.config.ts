import { defineConfig } from 'vite';

// Project site lives at josiahwsmith10.github.io/ai4good-planner, so production
// assets must resolve under that base path. Dev serves from root.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/ai4good-planner/' : '/',
  build: {
    target: 'es2022',
    sourcemap: true,
  },
}));
