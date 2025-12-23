/**
 * Comprehensive tests for Health Check Access Control
 * Covering all lines for SonarQube coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Health Check Auth - Complete Coverage', () => {
    let originalEnv;

    beforeEach(() => {
        originalEnv = { ...process.env };
        jest.resetModules();
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    describe('IP Range Matching (CIDR)', () => {
        it('should match IP in CIDR range', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '10.0.0.0/8';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '10.1.2.3' },
                ip: '10.1.2.3'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should reject IP outside CIDR range', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '10.0.0.0/8';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '192.168.1.1' },
                ip: '192.168.1.1'
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

        it('should handle IPv6 localhost', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '::1';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '::1' },
                ip: '::1'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should handle IPv4-mapped IPv6 localhost', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '::1,127.0.0.1';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '::ffff:127.0.0.1' },
                ip: '::ffff:127.0.0.1'
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

    describe('Client IP Detection', () => {
        it('should use X-Forwarded-For header', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '203.0.113.50';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: { 'x-forwarded-for': '203.0.113.50, 192.168.1.1' },
                connection: { remoteAddress: '192.168.1.1' },
                ip: '192.168.1.1'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            // Should use the first IP from X-Forwarded-For
            expect(next).toHaveBeenCalled();
        });

        it('should use X-Real-IP header when X-Forwarded-For is not present', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '203.0.113.100';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: { 'x-real-ip': '203.0.113.100' },
                connection: { remoteAddress: '192.168.1.1' },
                ip: '192.168.1.1'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should fall back to socket remoteAddress', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '192.168.1.100';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                socket: { remoteAddress: '192.168.1.100' },
                ip: '192.168.1.1'
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

    describe('Edge Cases', () => {
        it('should handle exact IP match without CIDR', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '192.168.1.50';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '192.168.1.50' },
                ip: '192.168.1.50'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should handle invalid CIDR notation gracefully', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = 'invalid/99,127.0.0.1';

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

        it('should handle malformed IP addresses', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '127.0.0.1';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: 'not-an-ip' },
                ip: 'not-an-ip'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should respect HEALTH_CHECK_RESTRICT_ACCESS=true in development', async () => {
            process.env.NODE_ENV = 'development';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';

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
        });

        it('should handle invalid prefix in CIDR (prefix > 32)', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '10.0.0.0/40';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '10.0.0.0' },
                ip: '10.0.0.0'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            // Should fall back to exact match - this won't match
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should handle invalid octet in IP address', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '10.0.0.0/8';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '10.999.0.1' }, // Invalid octet
                ip: '10.999.0.1'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            // ipToNumber returns null for invalid octet
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should handle IPs with wrong number of parts', async () => {
            process.env.NODE_ENV = 'production';
            process.env.HEALTH_CHECK_RESTRICT_ACCESS = 'true';
            process.env.HEALTH_CHECK_ALLOWED_IPS = '10.0.0.0/8';

            const { restrictHealthCheckAccess } = await import('../middleware/healthCheckAuth.js');

            const req = {
                headers: {},
                connection: { remoteAddress: '10.0.0' }, // Only 3 parts
                ip: '10.0.0'
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            restrictHealthCheckAccess(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
