import { describe, it, expect } from 'vitest';
import config from '../../vitest.config.js';

describe('vitest.config.js', () => {
  it('should export a valid Vitest configuration', () => {
    expect(config).toBeDefined();
    expect(config.test).toBeDefined();
    expect(config.test.environment).toBe('jsdom');
    expect(config.test.globals).toBe(true);
  });

  it('should have coverage configuration', () => {
    expect(config.test.coverage).toBeDefined();
    expect(config.test.coverage.provider).toBe('v8');
    expect(config.test.coverage.reporter).toContain('lcov');
  });
});
