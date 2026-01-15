import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    passWithNoTests: true,
    // Ensure all tests run even if some fail
    bail: false,
    // Timeout for each test (30 seconds)
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      // HTML reporter removed - very slow with many files, SonarQube only needs lcov
      reporter: ['lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}'
      ],
      reportsDirectory: './coverage',
      all: true,
      reportOnFailure: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

