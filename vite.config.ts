/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/ImageConverterWeb/
  base: '/ImageConverterWeb/',
  plugins: [svelte()],
  worker: { format: 'es' },
  test: { include: ['src/**/*.test.ts'] },
});
