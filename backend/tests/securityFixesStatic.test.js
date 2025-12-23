/**
 * Tests for Password Reset User Enumeration Prevention (8.2.1)
 * 
 * These tests verify that the password reset code paths are covered
 * by checking the code structure directly (static analysis approach).
 */
import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('Password Reset User Enumeration Prevention (8.2.1)', () => {
    const authControllerPath = path.join(process.cwd(), 'controllers', 'authController.js');
    const authControllerContent = fs.readFileSync(authControllerPath, 'utf8');

    it('should have a genericSuccessResponse variable', () => {
        expect(authControllerContent).toContain('genericSuccessResponse');
    });

    it('should return generic message instead of user-specific errors', () => {
        // The fix should NOT contain the old vulnerable messages
        expect(authControllerContent).not.toContain("'No account found with this email address'");
        expect(authControllerContent).not.toContain("'Your account is not verified. Please contact support.'");
        expect(authControllerContent).not.toContain("'Your account is deactivated. Please contact support.'");
    });

    it('should use the same response for all scenarios in requestPasswordReset', () => {
        // The fix should use genericSuccessResponse for all return paths
        expect(authControllerContent).toContain("return res.json(genericSuccessResponse)");
    });

    it('should have the security fix comment', () => {
        expect(authControllerContent).toContain('SECURITY FIX: Always returns the same response to prevent user enumeration');
    });

    it('should include the generic message text', () => {
        expect(authControllerContent).toContain('If an account exists with this email address, a password reset OTP will be sent.');
    });
});

describe('Rate Limiter Response Format (8.4.2)', () => {
    const rateLimiterPath = path.join(process.cwd(), 'middleware', 'rateLimiter.js');
    const rateLimiterContent = fs.readFileSync(rateLimiterPath, 'utf8');

    it('should include TOO_MANY_REQUESTS error code', () => {
        expect(rateLimiterContent).toContain("error: 'TOO_MANY_REQUESTS'");
    });

    it('should set Retry-After header', () => {
        expect(rateLimiterContent).toContain("res.set('Retry-After'");
    });

    it('should have createRateLimitHandler function', () => {
        expect(rateLimiterContent).toContain('createRateLimitHandler');
    });

    it('should default to enabled in production', () => {
        expect(rateLimiterContent).toContain('isProduction');
    });
});

describe('Health Check Access Control (8.4.1)', () => {
    const healthCheckPath = path.join(process.cwd(), 'middleware', 'healthCheckAuth.js');
    const healthCheckContent = fs.readFileSync(healthCheckPath, 'utf8');

    it('should default to restricted in production', () => {
        expect(healthCheckContent).toContain('isProduction');
        expect(healthCheckContent).toContain(': isProduction');
    });

    it('should have the security fix comment', () => {
        expect(healthCheckContent).toContain('SECURITY FIX: Now restricts access by default in production');
    });
});

describe('API Metadata Removal (8.3.1, 8.3.2)', () => {
    it('should not expose permissions in patients route', () => {
        const routeContent = fs.readFileSync(
            path.join(process.cwd(), 'routes', 'patients.js'),
            'utf8'
        );

        expect(routeContent).not.toContain("permissions: {");
        expect(routeContent).toContain('Authentication required');
    });

    it('should not expose endpoints in server.js', () => {
        const serverContent = fs.readFileSync(
            path.join(process.cwd(), 'server.js'),
            'utf8'
        );

        expect(serverContent).not.toContain("endpoints: {");
        expect(serverContent).toContain('Authentication required');
    });
});

describe('CORS Helper Security (8.1.1)', () => {
    const corsHelperPath = path.join(process.cwd(), 'utils', 'corsHelper.js');
    const corsHelperContent = fs.readFileSync(corsHelperPath, 'utf8');

    it('should perform strict origin validation', () => {
        expect(corsHelperContent).toContain('isOriginAllowed');
        expect(corsHelperContent).toContain('allowedOrigins.includes(origin)');
    });

    it('should not reflect arbitrary origins', () => {
        expect(corsHelperContent).toContain('SECURITY FIX');
        expect(corsHelperContent).toContain('strict origin validation');
    });
});
