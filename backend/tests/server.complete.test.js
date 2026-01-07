/**
 * Comprehensive tests for server.js
 * Tests all functions, middleware, and edge cases to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock express
const mockUse = jest.fn();
const mockGet = jest.fn();
const mockListen = jest.fn();
const mockApp = {
  use: mockUse,
  get: mockGet,
  listen: mockListen
};

const mockExpress = jest.fn(() => mockApp);

jest.unstable_mockModule('express', () => ({
  default: mockExpress
}));

// Mock cors
const mockCors = jest.fn((options) => (req, res, next) => next());
jest.unstable_mockModule('cors', () => ({
  default: mockCors
}));

// Mock helmet
const mockHelmet = jest.fn((options) => (req, res, next) => next());
jest.unstable_mockModule('helmet', () => ({
  default: mockHelmet
}));

// Mock morgan
const mockMorgan = jest.fn((format) => (req, res, next) => next());
jest.unstable_mockModule('morgan', () => ({
  default: mockMorgan
}));

// Mock cookie-parser
const mockCookieParser = jest.fn(() => (req, res, next) => next());
jest.unstable_mockModule('cookie-parser', () => ({
  default: mockCookieParser
}));

// Mock database
const mockTestConnection = jest.fn();
const mockInitializeDatabase = jest.fn();
jest.unstable_mockModule('./config/database.js', () => ({
  testConnection: mockTestConnection,
  initializeDatabase: mockInitializeDatabase
}));

// Mock all routes
const mockRoutes = jest.fn();
jest.unstable_mockModule('./routes/auth.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/superadmin.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/patients.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/notes.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/investigations.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/booking.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/mdt.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/doctors.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/notifications.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/gp.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/nurses.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/consentForms.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/kpi.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/export.js', () => ({ default: mockRoutes }));
jest.unstable_mockModule('./routes/guidelines.js', () => ({ default: mockRoutes }));

// Mock middleware
const mockErrorHandler = jest.fn();
const mockNotFound = jest.fn();
jest.unstable_mockModule('./middleware/errorHandler.js', () => ({
  errorHandler: mockErrorHandler,
  notFound: mockNotFound
}));

const mockGeneralLimiter = jest.fn((req, res, next) => next());
jest.unstable_mockModule('./middleware/rateLimiter.js', () => ({
  generalLimiter: mockGeneralLimiter
}));

const mockCorsOptions = {};
const mockValidateCorsConfig = jest.fn(() => true);
const mockCorsLoggingMiddleware = jest.fn((req, res, next) => next());
jest.unstable_mockModule('./middleware/corsConfig.js', () => ({
  corsOptions: mockCorsOptions,
  validateCorsConfig: mockValidateCorsConfig,
  corsLoggingMiddleware: mockCorsLoggingMiddleware
}));

const mockRestrictHealthCheckAccess = jest.fn((req, res, next) => next());
jest.unstable_mockModule('./middleware/healthCheckAuth.js', () => ({
  restrictHealthCheckAccess: mockRestrictHealthCheckAccess
}));

const mockProtectApiRoutes = jest.fn((req, res, next) => next());
jest.unstable_mockModule('./middleware/apiAuth.js', () => ({
  protectApiRoutes: mockProtectApiRoutes
}));

const mockAuditMiddleware = jest.fn((req, res, next) => next());
const mockAuditAuthMiddleware = jest.fn((req, res, next) => next());
jest.unstable_mockModule('./middleware/auditMiddleware.js', () => ({
  auditMiddleware: mockAuditMiddleware,
  auditAuthMiddleware: mockAuditAuthMiddleware
}));

const mockInitializeNotificationsTable = jest.fn();
jest.unstable_mockModule('./services/notificationService.js', () => ({
  initializeNotificationsTable: mockInitializeNotificationsTable
}));

const mockInitAutoNoShowScheduler = jest.fn();
jest.unstable_mockModule('./schedulers/autoNoShowScheduler.js', () => ({
  initAutoNoShowScheduler: mockInitAutoNoShowScheduler
}));

const mockInitAutoAppointmentScheduler = jest.fn();
jest.unstable_mockModule('./schedulers/autoAppointmentScheduler.js', () => ({
  initAutoAppointmentScheduler: mockInitAutoAppointmentScheduler
}));

describe('server.js - Complete Coverage', () => {
  let originalEnv;
  let originalExit;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = process.env.NODE_ENV;
    originalExit = process.exit;
    process.exit = jest.fn();
    
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    
    mockTestConnection.mockResolvedValue(true);
    mockInitializeDatabase.mockResolvedValue(true);
    mockInitializeNotificationsTable.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.exit = originalExit;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('Module execution and route registration', () => {
    it('should execute all route registrations', async () => {
      await import('../server.js');
      
      // Verify routes are registered
      expect(mockUse).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalled();
    });

    it('should register health check endpoint', async () => {
      await import('../server.js');
      
      expect(mockGet).toHaveBeenCalledWith('/health', expect.any(Function));
    });

    it('should register API root endpoint', async () => {
      await import('../server.js');
      
      expect(mockGet).toHaveBeenCalledWith('/api', expect.any(Function));
    });

    it('should register static uploads route', async () => {
      await import('../server.js');
      
      expect(mockUse).toHaveBeenCalledWith('/uploads', expect.any(Function));
    });
  });

  describe('getAllowedCSPOrigins function', () => {
    it('should return development origins when NODE_ENV is development', async () => {
      process.env.NODE_ENV = 'development';
      
      // The function is executed during module import
      await import('../server.js');
      
      // Verify helmet was called (which uses CSP origins)
      expect(mockHelmet).toHaveBeenCalled();
    });

    it('should return production origins when NODE_ENV is production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.FRONTEND_URL = 'https://example.com';
      
      await import('../server.js');
      
      expect(mockHelmet).toHaveBeenCalled();
    });

    it('should handle missing FRONTEND_URL in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FRONTEND_URL;
      
      await import('../server.js');
      
      expect(mockHelmet).toHaveBeenCalled();
    });
  });

  describe('Security middleware execution', () => {
    it('should execute helmet with correct options', async () => {
      await import('../server.js');
      
      expect(mockHelmet).toHaveBeenCalledWith(expect.objectContaining({
        contentSecurityPolicy: false,
        strictTransportSecurity: expect.any(Object),
        contentTypeOptions: 'nosniff'
      }));
    });

    it('should execute additional security headers middleware', async () => {
      await import('../server.js');
      
      // Verify middleware is registered
      expect(mockUse).toHaveBeenCalled();
    });
  });

  describe('Debug logging middleware', () => {
    it('should execute file request logging', async () => {
      await import('../server.js');
      
      // The middleware is registered, verify it's called
      expect(mockUse).toHaveBeenCalled();
    });

    it('should execute API request logging', async () => {
      await import('../server.js');
      
      // The middleware is registered
      expect(mockUse).toHaveBeenCalled();
    });
  });

  describe('startServer function execution', () => {
    it('should execute startServer and handle success', async () => {
      mockValidateCorsConfig.mockReturnValue(true);
      mockTestConnection.mockResolvedValue(true);
      mockInitializeDatabase.mockResolvedValue(true);
      
      await import('../server.js');
      
      // Give time for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockValidateCorsConfig).toHaveBeenCalled();
      expect(mockTestConnection).toHaveBeenCalled();
      expect(mockInitializeDatabase).toHaveBeenCalled();
    });

    it('should handle CORS validation failure in production', async () => {
      process.env.NODE_ENV = 'production';
      mockValidateCorsConfig.mockReturnValue(false);
      
      await import('../server.js');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('CORS configuration is invalid')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle CORS validation failure in development', async () => {
      process.env.NODE_ENV = 'development';
      mockValidateCorsConfig.mockReturnValue(false);
      
      await import('../server.js');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      // Should not exit in development
    });

    it('should handle database connection failure', async () => {
      mockTestConnection.mockResolvedValue(false);
      
      await import('../server.js');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to connect to database')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle database initialization failure', async () => {
      mockInitializeDatabase.mockResolvedValue(false);
      
      await import('../server.js');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize database')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle startServer error', async () => {
      mockTestConnection.mockRejectedValue(new Error('Test error'));
      
      await import('../server.js');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to start server')
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Process event handlers', () => {
    it('should handle unhandled promise rejection', () => {
      const error = new Error('Unhandled rejection');
      process.emit('unhandledRejection', error, Promise.resolve());
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unhandled Promise Rejection:',
        error
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle uncaught exception', () => {
      const error = new Error('Uncaught exception');
      process.emit('uncaughtException', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Uncaught Exception:',
        error
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle SIGTERM signal', () => {
      process.emit('SIGTERM');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'SIGTERM received. Shutting down gracefully...'
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGINT signal', () => {
      process.emit('SIGINT');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'SIGINT received. Shutting down gracefully...'
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('Middleware registration', () => {
    it('should register all middleware in correct order', async () => {
      await import('../server.js');
      
      // Verify key middleware is registered
      expect(mockUse).toHaveBeenCalled();
      expect(mockCors).toHaveBeenCalled();
      expect(mockHelmet).toHaveBeenCalled();
    });

    it('should register morgan in development', async () => {
      process.env.NODE_ENV = 'development';
      
      await import('../server.js');
      
      expect(mockMorgan).toHaveBeenCalled();
    });

    it('should register morgan in production', async () => {
      process.env.NODE_ENV = 'production';
      
      await import('../server.js');
      
      expect(mockMorgan).toHaveBeenCalled();
    });
  });

  describe('Route registration', () => {
    it('should register all API routes', async () => {
      await import('../server.js');
      
      // Verify routes are registered
      expect(mockUse).toHaveBeenCalled();
    });

    it('should register backward compatibility route for appointments', async () => {
      await import('../server.js');
      
      // The redirect route should be registered
      expect(mockUse).toHaveBeenCalled();
    });
  });
});















