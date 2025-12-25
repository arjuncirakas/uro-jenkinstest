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
  });
});

