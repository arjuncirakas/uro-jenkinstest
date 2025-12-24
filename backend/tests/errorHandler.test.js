/**
 * Comprehensive tests for Error Handler middleware
 * Tests all error types and code paths to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock corsHelper
const mockCorsHelper = {
  setCorsHeaders: jest.fn()
};

jest.unstable_mockModule('../utils/corsHelper.js', () => ({
  setCorsHeaders: mockCorsHelper.setCorsHeaders
}));

describe('Error Handler Middleware', () => {
  let errorHandler;
  let notFound;
  let originalEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
    
    const module = await import('../middleware/errorHandler.js');
    errorHandler = module.errorHandler;
    notFound = module.notFound;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('errorHandler', () => {
    it('should handle generic errors', () => {
      const err = new Error('Generic error');
      const req = { path: '/test', method: 'GET', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(mockCorsHelper.setCorsHeaders).toHaveBeenCalledWith(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error'
      });
    });

    it('should handle CORS errors', () => {
      const err = new Error('Not allowed by CORS');
      const req = { path: '/test', method: 'GET', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'CORS policy violation: Origin not allowed'
      });
    });

    it('should handle ValidationError with errors object', () => {
      const err = {
        name: 'ValidationError',
        errors: {
          email: { message: 'Email is required' },
          password: { message: 'Password is required' }
        }
      };
      const req = { path: '/test', method: 'POST', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Validation Error')
      });
    });

    it('should handle ValidationError without errors object', () => {
      const err = {
        name: 'ValidationError'
      };
      const req = { path: '/test', method: 'POST', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation Error'
      });
    });

    it('should handle JsonWebTokenError', () => {
      const err = {
        name: 'JsonWebTokenError',
        message: 'Invalid token'
      };
      const req = { path: '/test', method: 'GET', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid token'
      });
    });

    it('should handle TokenExpiredError', () => {
      const err = {
        name: 'TokenExpiredError',
        message: 'Token expired'
      };
      const req = { path: '/test', method: 'GET', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token expired'
      });
    });

    it('should handle PostgreSQL unique constraint error (23505)', () => {
      const err = {
        code: '23505',
        message: 'Duplicate key value'
      };
      const req = { path: '/test', method: 'POST', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Duplicate entry. This record already exists.'
      });
    });

    it('should handle PostgreSQL foreign key constraint error (23503)', () => {
      const err = {
        code: '23503',
        message: 'Foreign key violation'
      };
      const req = { path: '/test', method: 'POST', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Referenced record does not exist.'
      });
    });

    it('should handle PostgreSQL not null constraint error (23502)', () => {
      const err = {
        code: '23502',
        message: 'Not null violation'
      };
      const req = { path: '/test', method: 'POST', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Required field is missing.'
      });
    });

    it('should handle 404 Not Found error', () => {
      const err = {
        statusCode: 404,
        message: 'Resource not found'
      };
      const req = { path: '/test', method: 'GET', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Resource not found'
      });
    });

    it('should include stack trace in development mode', () => {
      process.env.NODE_ENV = 'development';
      const err = new Error('Test error');
      err.stack = 'Error stack trace';
      err.code = 'TEST_CODE';
      
      const req = { path: '/test', method: 'GET', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error',
        stack: 'Error stack trace',
        error: 'Test error',
        code: 'TEST_CODE'
      });
    });

    it('should not include stack trace in production mode', () => {
      process.env.NODE_ENV = 'production';
      const err = new Error('Test error');
      err.stack = 'Error stack trace';
      
      const req = { path: '/test', method: 'GET', headers: {} };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal Server Error'
      });
      expect(res.json.mock.calls[0][0]).not.toHaveProperty('stack');
    });

    it('should not send response if headers already sent', () => {
      const err = new Error('Test error');
      const req = { path: '/test', method: 'GET', headers: {} };
      const res = {
        headersSent: true,
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      errorHandler(err, req, res, next);

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('notFound', () => {
    it('should create 404 error and call next', () => {
      const req = {
        originalUrl: '/api/nonexistent'
      };
      const res = {};
      const next = jest.fn();

      notFound(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0];
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Not Found - /api/nonexistent');
    });
  });
});

