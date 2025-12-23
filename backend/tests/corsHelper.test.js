/**
 * Tests for Secure CORS Helper
 * 
 * These tests verify that the CORS helper properly validates origins
 * against a strict allowlist and does not reflect arbitrary origins.
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Secure CORS Helper', () => {
    let corsHelper;
    let originalEnv;

    beforeEach(async () => {
        originalEnv = { ...process.env };
        // Clear cache to ensure fresh module import
        jest.resetModules();
        corsHelper = await import('../utils/corsHelper.js');
    });

    afterEach(() => {
        process.env = originalEnv;
        jest.clearAllMocks();
    });

    describe('getAllowedOrigins', () => {
        it('should return localhost origins in development', () => {
            process.env.NODE_ENV = 'development';
            delete process.env.FRONTEND_URL;

            const origins = corsHelper.getAllowedOrigins();

            expect(Array.isArray(origins)).toBe(true);
            expect(origins).toContain('http://localhost:5173');
            expect(origins).toContain('http://localhost:3000');
        });

        it('should include FRONTEND_URL in allowed origins', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://uroprep.ahimsa.global';

            const origins = corsHelper.getAllowedOrigins();

            expect(origins).toContain('https://uroprep.ahimsa.global');
        });

        it('should support multiple origins in FRONTEND_URL', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://uroprep.ahimsa.global,https://app.example.com';

            const origins = corsHelper.getAllowedOrigins();

            expect(origins).toContain('https://uroprep.ahimsa.global');
            expect(origins).toContain('https://app.example.com');
        });
    });

    describe('isOriginAllowed', () => {
        it('should return false for null/undefined origin', () => {
            expect(corsHelper.isOriginAllowed(null)).toBe(false);
            expect(corsHelper.isOriginAllowed(undefined)).toBe(false);
        });

        it('should return true for allowed localhost origin in development', () => {
            process.env.NODE_ENV = 'development';

            expect(corsHelper.isOriginAllowed('http://localhost:5173')).toBe(true);
        });

        it('should reject malicious origin in production', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://uroprep.ahimsa.global';

            expect(corsHelper.isOriginAllowed('https://evil.com')).toBe(false);
        });

        it('should reject origin that is a substring match (not exact match)', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://uroprep.ahimsa.global';

            // These should NOT be allowed - they contain the allowed origin but are not exact matches
            expect(corsHelper.isOriginAllowed('https://evil.uroprep.ahimsa.global')).toBe(false);
            expect(corsHelper.isOriginAllowed('https://uroprep.ahimsa.global.evil.com')).toBe(false);
        });

        it('should allow exact match for production origin', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://uroprep.ahimsa.global';

            expect(corsHelper.isOriginAllowed('https://uroprep.ahimsa.global')).toBe(true);
        });
    });

    describe('setCorsHeaders', () => {
        it('should set CORS headers for allowed origin', () => {
            process.env.NODE_ENV = 'development';

            const req = { headers: { origin: 'http://localhost:5173' } };
            const res = {
                setHeader: jest.fn()
            };

            corsHelper.setCorsHeaders(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
        });

        it('should NOT set CORS headers for unauthorized origin', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://uroprep.ahimsa.global';

            const req = { headers: { origin: 'https://evil.com' } };
            const res = {
                setHeader: jest.fn()
            };

            corsHelper.setCorsHeaders(req, res);

            // Should NOT set any CORS headers for unauthorized origins
            expect(res.setHeader).not.toHaveBeenCalled();
        });

        it('should NOT set wildcard origin when no origin header is present', () => {
            const req = { headers: {} };
            const res = {
                setHeader: jest.fn()
            };

            corsHelper.setCorsHeaders(req, res);

            // Should NOT set Access-Control-Allow-Origin: '*' anymore (security fix)
            expect(res.setHeader).not.toHaveBeenCalled();
        });

        it('should prevent CORS misconfiguration attack - reflecting arbitrary origin with credentials', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://uroprep.ahimsa.global';

            // Simulate the attack from the security report
            const req = { headers: { origin: 'https://evil.com' } };
            const res = {
                setHeader: jest.fn()
            };

            corsHelper.setCorsHeaders(req, res);

            // The response should NOT echo back the attacker's origin
            expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://evil.com');
        });
    });

    describe('setPreflightCorsHeaders', () => {
        it('should return true and set headers for allowed origin', () => {
            process.env.NODE_ENV = 'development';

            const req = { headers: { origin: 'http://localhost:5173' } };
            const res = {
                setHeader: jest.fn()
            };

            const result = corsHelper.setPreflightCorsHeaders(req, res);

            expect(result).toBe(true);
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:5173');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
            expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
        });

        it('should return false and NOT set headers for unauthorized origin', () => {
            process.env.NODE_ENV = 'production';
            process.env.FRONTEND_URL = 'https://uroprep.ahimsa.global';

            const req = { headers: { origin: 'https://evil.com' } };
            const res = {
                setHeader: jest.fn()
            };

            const result = corsHelper.setPreflightCorsHeaders(req, res);

            expect(result).toBe(false);
            expect(res.setHeader).not.toHaveBeenCalled();
        });
    });
});
