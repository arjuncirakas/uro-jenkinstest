/**
 * Test for vitest.config.js to achieve 100% coverage
 * This file tests the vitest configuration itself
 */
import { describe, it, expect } from 'vitest';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the actual config
import config from '../../vitest.config.js';

describe('vitest.config.js', () => {
  it('should export a valid config object', () => {
    expect(config).toBeDefined();
    expect(config).toHaveProperty('plugins');
    expect(config).toHaveProperty('test');
    expect(config).toHaveProperty('resolve');
  });

  it('should have correct test configuration', () => {
    expect(config.test).toHaveProperty('globals', true);
    expect(config.test).toHaveProperty('environment', 'jsdom');
    expect(config.test).toHaveProperty('setupFiles', './src/test/setup.js');
    expect(config.test).toHaveProperty('passWithNoTests', true);
    expect(config.test).toHaveProperty('bail', false);
    expect(config.test).toHaveProperty('testTimeout', 30000);
  });

  it('should have correct coverage configuration', () => {
    expect(config.test.coverage).toHaveProperty('provider', 'v8');
    expect(config.test.coverage).toHaveProperty('reporter');
    expect(Array.isArray(config.test.coverage.reporter)).toBe(true);
    expect(config.test.coverage.reporter).toContain('text');
    expect(config.test.coverage.reporter).toContain('json');
    expect(config.test.coverage.reporter).toContain('html');
    expect(config.test.coverage.reporter).toContain('lcov');
    expect(config.test.coverage).toHaveProperty('include');
    expect(config.test.coverage).toHaveProperty('exclude');
    expect(config.test.coverage).toHaveProperty('reportsDirectory', './coverage');
    expect(config.test.coverage).toHaveProperty('all', true);
    expect(config.test.coverage).toHaveProperty('reportOnFailure', true);
  });

  it('should have correct resolve alias configuration', () => {
    expect(config.resolve).toHaveProperty('alias');
    expect(config.resolve.alias).toHaveProperty('@');
  });
});















