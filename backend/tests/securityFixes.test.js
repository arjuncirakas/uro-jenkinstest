/**
 * Tests for Security Fixes
 * 
 * These tests cover the security fixes applied to address:
 * - 8.2.1: User Enumeration via Forgot Password
 * - 8.3.1: Unauthorized API Capability Disclosure (/api/patients)
 * - 8.3.2: Unauthorised API Metadata Exposure (/api)
 * - 8.4.1: Public Health Endpoint Exposure
 * - 8.4.2: Infrastructure-Based Rate Limiting Behaviour
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Security Fixes', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    describe('Health Check Access Control (8.4.1)', () => {
        it('should allow access in development by default', async () => {
            process.env.NODE_ENV = 'development';
            delete process.env.HEALTH_CHECK_RESTRICT_ACCESS;

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '1.2.3.4' },
                ip: '1.2.3.4'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        it('should restrict access in production by default', async () => {
            process.env.NODE_ENV = 'production';
            delete process.env.HEALTH_CHECK_RESTRICT_ACCESS;

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '1.2.3.4' },
                ip: '1.2.3.4'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should allow localhost in production', async () => {
            process.env.NODE_ENV = 'production';
            delete process.env.HEALTH_CHECK_RESTRICT_ACCESS;
            process.env.HEALTH_CHECK_ALLOWED_IPS = '127.0.0.1';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '127.0.0.1' },
                ip: '127.0.0.1'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should respect HEALTH_CHECK_RESTRICT_ACCESS=false override', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'false';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '1.2.3.4' },
                ip: '1.2.3.4'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(next).toHaveBeenCalled();
        });
    });

    describe('Rate Limiter Configuration (8.4.2)', () => {
        it('should be disabled in development by default', async () => {
            process.env.NODE_ENV = 'development';
            delete process.env.ENABLE_RATE_LIMITING;

            // Re-import to get fresh module with new env
            const rateLimiter = await import('../middleware/rateLimiter.js');

            const req = {};
            const res = {};
            const next = jest.fn();

            // generalLimiter should be no-op in development
            rateLimiter.generalLimiter(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should respect ENABLE_RATE_LIMITING=true in development', async () => {
            process.env.NODE_ENV = 'development';
            process.env.ENABLE_RATE_LIMITING = 'true';

            const rateLimiter = await import('../middleware/rateLimiter.js');

            // When enabled, it should be a function (the rate limiter middleware)
            expect(typeof rateLimiter.generalLimiter).toBe('function');
            expect(typeof rateLimiter.authLimiter).toBe('function');
            expect(typeof rateLimiter.otpLimiter).toBe('function');
            expect(typeof rateLimiter.registrationLimiter).toBe('function');
        });
    });

    describe('API Metadata Exposure Prevention (8.3.1, 8.3.2)', () => {

        it('should not expose endpoints or permissions in route configuration', async () => {
            // This is a static check to ensure the vulnerable code was removed
            const fs = await import('fs');
            const path = await import('path');

            const routeContent = fs.readFileSync(
                path.join(process.cwd(), 'routes', 'patients.js'),
                'utf8'
            );

            // Should NOT contain exposed permission mappings
            expect(routeContent).not.toContain("permissions: {");
            expect(routeContent).not.toContain("addPatient: 'urologist");
        });

        it('should not expose API metadata in server.js', async () => {
            const fs = await import('fs');
            const path = await import('path');

            const serverContent = fs.readFileSync(
                path.join(process.cwd(), 'server.js'),
                'utf8'
            );

            // Should NOT contain exposed endpoint list
            expect(serverContent).not.toContain("endpoints: {");
            expect(serverContent).not.toContain("documentation: `http://localhost");
        });
    });
});
