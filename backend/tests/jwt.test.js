/**
 * Comprehensive tests for JWT utilities
 * Tests all functions and code paths to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import jwt from 'jsonwebtoken';

describe('JWT Utilities', () => {
  let jwtUtils;
  let originalEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    
    jwtUtils = await import('../utils/jwt.js');
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate access token with user data', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'urologist'
      };

      const token = jwtUtils.generateAccessToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('urologist');
    });

    it('should use custom expiration from env', () => {
      process.env.JWT_EXPIRES_IN = '1h';
      const user = { id: 1, email: 'test@example.com', role: 'urologist' };
      
      const token = jwtUtils.generateAccessToken(user);
      const decoded = jwt.decode(token);
      
      expect(decoded).toBeDefined();
    });

    it('should use default expiration when env not set', () => {
      delete process.env.JWT_EXPIRES_IN;
      const user = { id: 1, email: 'test@example.com', role: 'urologist' };
      
      const token = jwtUtils.generateAccessToken(user);
      expect(token).toBeDefined();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with user id and type', () => {
      const user = { id: 1 };

      const token = jwtUtils.generateRefreshToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify token can be decoded
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      expect(decoded.userId).toBe(1);
      expect(decoded.type).toBe('refresh');
    });

    it('should use custom expiration from env', () => {
      process.env.JWT_REFRESH_EXPIRES_IN = '30d';
      const user = { id: 1 };
      
      const token = jwtUtils.generateRefreshToken(user);
      expect(token).toBeDefined();
    });

    it('should use default expiration when env not set', () => {
      delete process.env.JWT_REFRESH_EXPIRES_IN;
      const user = { id: 1 };
      
      const token = jwtUtils.generateRefreshToken(user);
      expect(token).toBeDefined();
    });
  });

  describe('generateTokens', () => {
    it('should generate both access and refresh tokens', () => {
      const user = {
        id: 1,
        email: 'test@example.com',
        role: 'urologist'
      };

      const tokens = jwtUtils.generateTokens(user);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      
      // Verify both tokens are valid
      const accessDecoded = jwt.verify(tokens.accessToken, process.env.JWT_SECRET);
      const refreshDecoded = jwt.verify(tokens.refreshToken, process.env.JWT_REFRESH_SECRET);
      
      expect(accessDecoded.userId).toBe(1);
      expect(refreshDecoded.userId).toBe(1);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const user = { id: 1, email: 'test@example.com', role: 'urologist' };
      const token = jwtUtils.generateAccessToken(user);

      const decoded = jwtUtils.verifyAccessToken(token);

      expect(decoded.userId).toBe(1);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('urologist');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        jwtUtils.verifyAccessToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      process.env.JWT_EXPIRES_IN = '1ms';
      const user = { id: 1, email: 'test@example.com', role: 'urologist' };
      const token = jwtUtils.generateAccessToken(user);

      // Wait for token to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => {
            jwtUtils.verifyAccessToken(token);
          }).toThrow();
          resolve();
        }, 10);
      });
    });

    it('should throw error for token signed with wrong secret', () => {
      const wrongToken = jwt.sign({ userId: 1 }, 'wrong-secret');

      expect(() => {
        jwtUtils.verifyAccessToken(wrongToken);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const user = { id: 1 };
      const token = jwtUtils.generateRefreshToken(user);

      const decoded = jwtUtils.verifyRefreshToken(token);

      expect(decoded.userId).toBe(1);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => {
        jwtUtils.verifyRefreshToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for expired token', () => {
      process.env.JWT_REFRESH_EXPIRES_IN = '1ms';
      const user = { id: 1 };
      const token = jwtUtils.generateRefreshToken(user);

      // Wait for token to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(() => {
            jwtUtils.verifyRefreshToken(token);
          }).toThrow();
          resolve();
        }, 10);
      });
    });

    it('should throw error for token signed with wrong secret', () => {
      const wrongToken = jwt.sign({ userId: 1, type: 'refresh' }, 'wrong-secret');

      expect(() => {
        jwtUtils.verifyRefreshToken(wrongToken);
      }).toThrow();
    });
  });

  describe('getCookieOptions', () => {
    it('should return cookie options for development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.COOKIE_DOMAIN;

      const options = jwtUtils.getCookieOptions();

      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    });

    it('should return cookie options for production', () => {
      process.env.NODE_ENV = 'production';
      process.env.COOKIE_DOMAIN = '.example.com';

      const options = jwtUtils.getCookieOptions();

      expect(options).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
        domain: '.example.com'
      });
    });

    it('should not include domain when not set in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.COOKIE_DOMAIN;

      const options = jwtUtils.getCookieOptions();

      expect(options.secure).toBe(true);
      expect(options.domain).toBeUndefined();
    });

    it('should handle missing NODE_ENV', () => {
      delete process.env.NODE_ENV;

      const options = jwtUtils.getCookieOptions();

      expect(options.secure).toBe(false);
    });
  });
});

