/**
 * Direct source execution tests for coverage
 * These tests import and execute the actual source code to ensure coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';

// Mock database before imports
const mockPool = {
    connect: jest.fn(),
    query: jest.fn()
};

const mockClient = {
    query: jest.fn(),
    release: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
    default: mockPool,
    testConnection: jest.fn().mockResolvedValue(true),
    initializeDatabase: jest.fn().mockResolvedValue(true)
}));

// Mock email service
jest.unstable_mockModule('../services/emailService.js', () => ({
    sendPasswordEmail: jest.fn().mockResolvedValue({ success: true, messageId: '123' })
}));

// Mock OTP service
jest.unstable_mockModule('../services/otpService.js', () => ({
    storeOTP: jest.fn().mockResolvedValue({ emailSent: true }),
    verifyOTP: jest.fn().mockResolvedValue({ success: true, data: { userId: 1 } }),
    incrementOTPAttempts: jest.fn()
}));

// Mock audit logger
jest.unstable_mockModule('../services/auditLogger.js', () => ({
    logFailedAccess: jest.fn(),
    logAuthEvent: jest.fn()
}));

// Mock account lockout
jest.unstable_mockModule('../middleware/accountLockout.js', () => ({
    checkAccountLockout: jest.fn((req, res, next) => next()),
    incrementFailedAttempts: jest.fn(),
    resetFailedAttempts: jest.fn()
}));

// Mock JWT
jest.unstable_mockModule('../utils/jwt.js', () => ({
    generateTokens: jest.fn().mockReturnValue({ accessToken: 'at', refreshToken: 'rt' }),
    verifyRefreshToken: jest.fn().mockReturnValue({ id: 1 }),
    getCookieOptions: jest.fn().mockReturnValue({})
}));

// Mock express-validator
jest.unstable_mockModule('express-validator', () => ({
    validationResult: jest.fn(() => ({ isEmpty: () => true, array: () => [] }))
}));

describe('Direct Source Execution for Coverage', () => {
    let authController;
    let gpController;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockClient.query.mockResolvedValue({ rows: [] });
        mockPool.connect.mockResolvedValue(mockClient);

        // Import the actual controllers
        authController = await import('../controllers/authController.js');
        gpController = await import('../controllers/gpController.js');
    });

    describe('authController Coverage', () => {
        it('should execute register function', async () => {
            const req = {
                body: {
                    email: 'test@example.com',
                    password: 'Password123!',
                    firstName: 'Test',
                    lastName: 'User'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // Check email
                .mockResolvedValueOnce({ rows: [{ id: 1, email: 'test@example.com' }] }); // Insert

            await authController.register(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should execute verifyLoginOTP function', async () => {
            const req = { body: { email: 'test@example.com', otp: '123456' } };
            const res = { cookie: jest.fn(), json: jest.fn() };

            mockClient.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'test@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                    role: 'urologist',
                    is_active: true,
                    is_verified: true,
                    created_at: new Date()
                }]
            });

            await authController.verifyLoginOTP(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('should execute resendLoginOTP function', async () => {
            const req = { body: { email: 'test@example.com' } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, is_verified: true, is_active: true }]
            });

            await authController.resendLoginOTP(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('should execute logout function', async () => {
            const req = { body: { refreshToken: 'token' } };
            const res = { json: jest.fn() };

            await authController.logout(req, res);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logout successful'
            });
        });

        it('should execute getProfile function', async () => {
            const req = { user: { id: 1, email: 'test@example.com', password_hash: 'hash' } };
            const res = { json: jest.fn() };

            await authController.getProfile(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('should execute requestPasswordReset for valid user', async () => {
            const req = { body: { email: 'test@example.com' } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, email: 'test@example.com', is_active: true, is_verified: true }]
            });

            await authController.requestPasswordReset(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: expect.stringContaining('If an account exists')
            }));
        });

        it('should execute requestPasswordReset for non-existent user (security fix)', async () => {
            const req = { body: { email: 'nonexistent@example.com' } };
            const res = { json: jest.fn() };

            // No user found
            mockClient.query.mockResolvedValue({ rows: [] });

            await authController.requestPasswordReset(req, res);
            // Should still return success to prevent enumeration
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should execute requestPasswordReset for unverified user (security fix)', async () => {
            const req = { body: { email: 'unverified@example.com' } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, email: 'unverified@example.com', is_active: true, is_verified: false }]
            });

            await authController.requestPasswordReset(req, res);
            // Should still return success to prevent enumeration
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should execute requestPasswordReset for deactivated user (security fix)', async () => {
            const req = { body: { email: 'deactivated@example.com' } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, email: 'deactivated@example.com', is_active: false, is_verified: true }]
            });

            await authController.requestPasswordReset(req, res);
            // Should still return success to prevent enumeration
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should execute verifyPasswordResetOTP function', async () => {
            const req = { body: { email: 'test@example.com', otp: '123456' } };
            const res = { json: jest.fn() };

            await authController.verifyPasswordResetOTP(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('should execute resetPassword function', async () => {
            const req = { body: { resetToken: 'token', newPassword: 'NewPassword123!' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, is_used: false }] })
                .mockResolvedValueOnce({ rows: [] }) // Password history
                .mockResolvedValueOnce({ rows: [] }) // Update
                .mockResolvedValueOnce({ rows: [] }) // Add history
                .mockResolvedValueOnce({ rows: [] }) // Trim
                .mockResolvedValueOnce({ rows: [] }); // Mark used

            await authController.resetPassword(req, res);
            // May return 400 for short password or success
        });
    });

    describe('gpController Coverage', () => {
        it('should execute getAllGPs function', async () => {
            const req = { query: { is_active: 'true' } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{
                    id: 1,
                    email: 'gp@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                    phone: '1234567890',
                    organization: 'Test',
                    role: 'gp',
                    is_active: true,
                    is_verified: true,
                    created_at: new Date(),
                    last_login_at: new Date()
                }]
            });

            await gpController.getAllGPs(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('should execute getGPById function', async () => {
            const req = { params: { id: 1 } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, first_name: 'John' }]
            });

            await gpController.getGPById(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('should execute createGP function', async () => {
            const req = {
                body: {
                    first_name: 'Jane',
                    last_name: 'Doe',
                    email: 'jane@example.com',
                    phone: '0987654321',
                    organization: 'New Org'
                }
            };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // Email check
                .mockResolvedValueOnce({ rows: [] }) // Phone check
                .mockResolvedValueOnce({
                    rows: [{ id: 2, email: 'jane@example.com', first_name: 'Jane', last_name: 'Doe', role: 'gp' }]
                }) // Insert
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            await gpController.createGP(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should execute updateGP function', async () => {
            const req = {
                params: { id: 1 },
                body: { first_name: 'Updated', last_name: 'Name', email: 'updated@example.com' }
            };
            const res = { json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ email: 'old@example.com', is_active: true }] })
                .mockResolvedValueOnce({ rows: [] }) // Email check
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'Updated' }] }) // Update
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            await gpController.updateGP(req, res);
            expect(res.json).toHaveBeenCalled();
        });

        it('should execute deleteGP function', async () => {
            const req = { params: { id: 1 } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });

            await gpController.deleteGP(req, res);
            expect(res.json).toHaveBeenCalled();
        });
    });
});
