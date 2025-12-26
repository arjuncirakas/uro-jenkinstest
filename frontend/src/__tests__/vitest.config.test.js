import { describe, it, expect } from 'vitest';
import config from '../vitest.config.js';

describe('vitest.config.js', () => {
  it('should export a valid config object', () => {
    expect(config).toBeDefined();
    expect(config.default).toBeDefined();
  });

  it('should have test configuration', () => {
    const testConfig = config.default.test;
    expect(testConfig).toBeDefined();
    expect(testConfig.globals).toBe(true);
    expect(testConfig.environment).toBe('jsdom');
  });

  it('should have coverage configuration', () => {
    const coverageConfig = config.default.test.coverage;
    expect(coverageConfig).toBeDefined();
    expect(coverageConfig.provider).toBe('v8');
    expect(coverageConfig.reporter).toEqual(['text', 'json', 'html', 'lcov']);
    expect(coverageConfig.include).toEqual(['src/**/*.{js,jsx}']);
    expect(coverageConfig.exclude).toContain('node_modules/**');
    expect(coverageConfig.exclude).toContain('src/test/**');
    expect(coverageConfig.exclude).toContain('**/*.test.{js,jsx}');
    expect(coverageConfig.exclude).toContain('**/*.spec.{js,jsx}');
  });

  it('should have resolve alias configuration', () => {
    const resolveConfig = config.default.resolve;
    expect(resolveConfig).toBeDefined();
    expect(resolveConfig.alias).toBeDefined();
    expect(resolveConfig.alias['@']).toBeDefined();
  });

  it('should have plugins configuration', () => {
    const plugins = config.default.plugins;
    expect(plugins).toBeDefined();
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins.length).toBeGreaterThan(0);
  });

  it('should execute all config lines', () => {
    // This test ensures all lines in vitest.config.js are executed
    // Including the __dirname calculation and all config properties
    expect(config.default).toBeDefined();
    expect(config.default.test).toBeDefined();
    expect(config.default.test.setupFiles).toBe('./src/test/setup.js');
    expect(config.default.resolve).toBeDefined();
  });
});

