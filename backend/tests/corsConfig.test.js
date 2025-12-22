import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('CORS Configuration', () => {
  let originalEnv;
  let corsConfig;

  beforeEach(async () => {
    originalEnv = process.env;
    corsConfig = await import('../middleware/corsConfig.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('getAllowedOrigins', () => {
    it('should return development origins in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://localhost:5173';

      const origins = corsConfig.getAllowedOrigins();

      expect(Array.isArray(origins)).toBe(true);
      expect(origins).toContain('http://localhost:5173');
      expect(origins).toContain('http://localhost:3000');
    });

    it('should return production origins from FRONTEND_URL', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://example.com';

      const origins = corsConfig.getAllowedOrigins();

      expect(origins).toEqual(['https://example.com']);
    });

    it('should handle multiple origins separated by comma', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://example.com,https://app.example.com';

      const origins = corsConfig.getAllowedOrigins();

      expect(origins).toEqual(['https://example.com', 'https://app.example.com']);
    });

    it('should return false when FRONTEND_URL is not set in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;

      const origins = corsConfig.getAllowedOrigins();

      expect(origins).toBe(false);
    });
  });

  describe('corsOptions.origin', () => {
    it('should allow requests with no origin', (done) => {
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://localhost:5173';

      corsConfig.corsOptions.origin(null, (error, allowed) => {
        expect(error).toBeNull();
        expect(allowed).toBe(true);
        done();
      });
    });

    it('should allow origin in allowed list', (done) => {
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://localhost:5173';

      corsConfig.corsOptions.origin('http://localhost:5173', (error, allowed) => {
        expect(error).toBeNull();
        expect(allowed).toBe('http://localhost:5173');
        done();
      });
    });

    it('should reject origin not in allowed list', (done) => {
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://localhost:5173';

      corsConfig.corsOptions.origin('http://malicious.com', (error, allowed) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Not allowed by CORS');
        done();
      });
    });

    it('should reject when no allowed origins configured', (done) => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;

      corsConfig.corsOptions.origin('http://example.com', (error, allowed) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Not allowed by CORS');
        done();
      });
    });
  });

  describe('validateCorsConfig', () => {
    it('should validate configuration in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.FRONTEND_URL = 'http://localhost:5173';

      const result = corsConfig.validateCorsConfig();

      expect(result).toBe(true);
    });

    it('should validate configuration in production with FRONTEND_URL', () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://example.com';

      const result = corsConfig.validateCorsConfig();

      expect(result).toBe(true);
    });

    it('should return false when FRONTEND_URL is missing in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;

      const result = corsConfig.validateCorsConfig();

      expect(result).toBe(false);
    });
  });

  describe('corsLoggingMiddleware', () => {
    it('should log CORS requests in development', () => {
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const req = {
        headers: { origin: 'http://localhost:5173' },
        method: 'GET',
        path: '/api/test'
      };
      const res = {};
      const next = jest.fn();

      corsConfig.corsLoggingMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not log in production unless DEBUG_CORS is set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DEBUG_CORS;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const req = {
        headers: { origin: 'http://example.com' },
        method: 'GET',
        path: '/api/test'
      };
      const res = {};
      const next = jest.fn();

      corsConfig.corsLoggingMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

