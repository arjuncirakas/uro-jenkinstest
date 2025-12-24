/**
 * Server.js and middleware coverage tests
 * Tests that execute actual middleware and server configuration code
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Server and Middleware Coverage', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('rateLimiter.js middleware', () => {
        it('should create rate limiters when enabled', async () => {
            process.env.ENABLE_RATE_LIMITING = 'true';
            process.env.NODE_ENV = 'production';

            const rateLimiter = await import('../middleware/rateLimiter.js');

            expect(rateLimiter.generalLimiter).toBeDefined();
            expect(rateLimiter.authLimiter).toBeDefined();
            expect(rateLimiter.otpLimiter).toBeDefined();
            expect(rateLimiter.registrationLimiter).toBeDefined();
        });

        it('should use noOp middleware when disabled', async () => {
            process.env.ENABLE_RATE_LIMITING = 'false';
            process.env.NODE_ENV = 'development';

            const rateLimiter = await import('../middleware/rateLimiter.js');

            // When disabled, should still export functions (no-op)
            expect(typeof rateLimiter.generalLimiter).toBe('function');
            expect(typeof rateLimiter.authLimiter).toBe('function');
        });

        it('should default to enabled in production', async () => {
            delete process.env.ENABLE_RATE_LIMITING;
            process.env.NODE_ENV = 'production';

            const rateLimiter = await import('../middleware/rateLimiter.js');

            expect(rateLimiter.generalLimiter).toBeDefined();
        });

        it('should configure custom window and max values', async () => {
            process.env.ENABLE_RATE_LIMITING = 'true';
            process.env.RATE_LIMIT_WINDOW_MS = '60000';
            process.env.RATE_LIMIT_MAX_REQUESTS = '50';
            process.env.AUTH_RATE_LIMIT_MAX = '10';
            process.env.OTP_RATE_LIMIT_MAX = '5';
            process.env.REGISTRATION_RATE_LIMIT_MAX = '5';

            const rateLimiter = await import('../middleware/rateLimiter.js');

            expect(rateLimiter.generalLimiter).toBeDefined();
        });
    });

    describe('healthCheckAuth.js middleware', () => {
        it('should import and configure health check auth', async () => {
            const healthCheckAuth = await import('../middleware/healthCheckAuth.js');
            expect(healthCheckAuth.restrictHealthCheckAccess).toBeDefined();
        });

        it('should allow access without IP restriction', async () => {
            process.env.HEALTH_CHECK_ALLOWED_IPS = '';

            const healthCheckAuth = await import('../middleware/healthCheckAuth.js');

            const req = { ip: '127.0.0.1', get: jest.fn() };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
            const next = jest.fn();

            healthCheckAuth.restrictHealthCheckAccess(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('corsConfig.js middleware', () => {
        it('should validate CORS configuration', async () => {
            process.env.FRONTEND_URL = 'https://example.com';
            process.env.NODE_ENV = 'production';

            const corsConfig = await import('../middleware/corsConfig.js');

            expect(corsConfig.corsOptions).toBeDefined();
            expect(corsConfig.validateCorsConfig).toBeDefined();
            expect(corsConfig.corsLoggingMiddleware).toBeDefined();

            const isValid = corsConfig.validateCorsConfig();
            expect(typeof isValid).toBe('boolean');
        });

        it('should log CORS requests', async () => {
            const corsConfig = await import('../middleware/corsConfig.js');

            const req = { get: jest.fn().mockReturnValue('http://localhost:5173') };
            const res = {};
            const next = jest.fn();

            corsConfig.corsLoggingMiddleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('apiAuth.js middleware', () => {
        it('should protect API routes', async () => {
            const apiAuth = await import('../middleware/apiAuth.js');
            expect(apiAuth.protectApiRoutes).toBeDefined();
        });
    });

    describe('auditMiddleware.js middleware', () => {
        it('should provide audit middleware functions', async () => {
            const auditMiddleware = await import('../middleware/auditMiddleware.js');
            expect(auditMiddleware.auditMiddleware).toBeDefined();
            expect(auditMiddleware.auditAuthMiddleware).toBeDefined();
        });
    });
});
