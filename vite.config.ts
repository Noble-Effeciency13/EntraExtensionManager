/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('@fluentui/react-icons')) return 'vendor-fluent-icons';
            if (id.includes('@fluentui')) return 'vendor-fluent';
            if (id.includes('@azure/msal') || id.includes('msal-react'))
              return 'vendor-msal';
            if (id.includes('@microsoft/microsoft-graph-client'))
              return 'vendor-graph';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            if (
              id.includes('react-hook-form') ||
              id.includes('@hookform') ||
              id.includes('zod')
            )
              return 'vendor-forms';
            if (
              id.includes('react/') ||
              id.includes('react-dom') ||
              id.includes('react-router')
            )
              return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
