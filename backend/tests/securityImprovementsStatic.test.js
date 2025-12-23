/**
 * Static verification tests for GP Controller security improvements
 * These tests verify that crypto.randomInt is used instead of Math.random
 */
import { jest, describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('GP Controller Security Improvements', () => {
    const gpControllerPath = path.join(process.cwd(), 'controllers', 'gpController.js');
    const gpControllerContent = fs.readFileSync(gpControllerPath, 'utf8');

    it('should import crypto module', () => {
        expect(gpControllerContent).toContain("import crypto from 'crypto'");
    });

    it('should use crypto.randomInt for lowercase character selection', () => {
        expect(gpControllerContent).toContain('crypto.randomInt(lowercase.length)');
    });

    it('should use crypto.randomInt for uppercase character selection', () => {
        expect(gpControllerContent).toContain('crypto.randomInt(uppercase.length)');
    });

    it('should use crypto.randomInt for number character selection', () => {
        expect(gpControllerContent).toContain('crypto.randomInt(numbers.length)');
    });

    it('should use crypto.randomInt for special character selection', () => {
        expect(gpControllerContent).toContain('crypto.randomInt(special.length)');
    });

    it('should use crypto.randomInt for remaining password length', () => {
        expect(gpControllerContent).toContain('crypto.randomInt(6)');
    });

    it('should use crypto.randomInt for all random character selections', () => {
        expect(gpControllerContent).toContain('crypto.randomInt(allChars.length)');
    });

    it('should use crypto.randomInt in Fisher-Yates shuffle', () => {
        expect(gpControllerContent).toContain('crypto.randomInt(i + 1)');
    });

    it('should NOT use Math.random for password generation', () => {
        // Check that generateSecurePassword doesn't use Math.random
        const generatePasswordSection = gpControllerContent.slice(
            gpControllerContent.indexOf('const generateSecurePassword'),
            gpControllerContent.indexOf('const tempPassword = generateSecurePassword()')
        );
        expect(generatePasswordSection).not.toContain('Math.random');
    });

    it('should have comment about cryptographically secure random', () => {
        expect(gpControllerContent).toContain('cryptographically secure random');
    });
});

describe('Auth Controller User Enumeration Fix Verification', () => {
    const authControllerPath = path.join(process.cwd(), 'controllers', 'authController.js');
    const authControllerContent = fs.readFileSync(authControllerPath, 'utf8');

    it('should have genericSuccessResponse defined', () => {
        expect(authControllerContent).toContain('const genericSuccessResponse = {');
    });

    it('should return generic message for non-existent users', () => {
        expect(authControllerContent).toContain("return res.json(genericSuccessResponse)");
    });

    it('should NOT reveal if account exists', () => {
        expect(authControllerContent).not.toContain("'No account found with this email address'");
    });

    it('should NOT reveal verification status', () => {
        expect(authControllerContent).not.toContain("'Your account is not verified");
    });

    it('should NOT reveal deactivation status', () => {
        expect(authControllerContent).not.toContain("'Your account is deactivated");
    });

    it('should have security fix comment', () => {
        expect(authControllerContent).toContain('SECURITY FIX');
        expect(authControllerContent).toContain('prevent user enumeration');
    });

    it('should use same generic message for all scenarios', () => {
        const message = 'If an account exists with this email address, a password reset OTP will be sent.';
        expect(authControllerContent).toContain(message);
    });
});
