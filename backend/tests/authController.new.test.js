import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';

// Mock dependencies
const mockPool = {
    connect: jest.fn()
};

const mockJwt = {
    generateTokens: jest.fn(),
    verifyRefreshToken: jest.fn(),
    getCookieOptions: jest.fn()
};

const mockOtpService = {
    storeOTP: jest.fn(),
    verifyOTP: jest.fn(),
    incrementOTPAttempts: jest.fn()
};

const mockAuditLogger = {
    logFailedAccess: jest.fn(),
    logAuthEvent: jest.fn()
};

const mockAccountLockout = {
    checkAccountLockout: jest.fn((req, res, next) => next()),
    incrementFailedAttempts: jest.fn(),
    resetFailedAttempts: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
    default: mockPool
}));

jest.unstable_mockModule('../utils/jwt.js', () => mockJwt);
jest.unstable_mockModule('../services/otpService.js', () => mockOtpService);
jest.unstable_mockModule('../services/auditLogger.js', () => mockAuditLogger);
jest.unstable_mockModule('../middleware/accountLockout.js', () => mockAccountLockout);

describe('Auth Controller', () => {
    let authController;
    let mockClient;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        mockPool.connect.mockResolvedValue(mockClient);

        authController = await import('../controllers/authController.js');
    });

    describe('register', () => {
        it('should register a new user successfully', async () => {
            const req = {
                body: {
                    email: 'new@example.com',
                    password: 'password123',
                    firstName: 'New',
                    lastName: 'User'
                }
            };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // Check email
                .mockResolvedValueOnce({
                    rows: [{ id: 1, email: 'new@example.com' }]
                }); // Insert user

            mockOtpService.storeOTP.mockResolvedValue({ emailSent: true });

            await authController.register(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ userId: 1 })
            }));
        });
    });

    describe('verifyRegistrationOTP', () => {
        it('should verify OTP and activate user', async () => {
            const req = {
                body: { email: 'test@example.com', otp: '123456' }
            };
            const res = {
                cookie: jest.fn(),
                json: jest.fn()
            };

            mockOtpService.verifyOTP.mockResolvedValue({ success: true, data: { userId: 1 } });

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // Update user
                .mockResolvedValueOnce({
                    rows: [{ id: 1, email: 'test@example.com', is_active: true }]
                }) // Get user
                .mockResolvedValueOnce({ rows: [] }); // Insert refresh token

            mockJwt.generateTokens.mockReturnValue({ accessToken: 'at', refreshToken: 'rt' });

            await authController.verifyRegistrationOTP(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ accessToken: 'at' })
            }));
        });
    });

    describe('login', () => {
        it('should return 401 for invalid credentials', async () => {
            const req = { body: { email: 'test@example.com', password: 'wrong' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, password_hash: 'hash', is_active: true, is_verified: true }]
            });
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

            await authController.login(req, res);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should initiate OTP flow for valid credentials', async () => {
            const req = { body: { email: 'test@example.com', password: 'correct' } };
            const jsonMock = jest.fn();
            const res = { json: jsonMock };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, password_hash: 'hash', is_active: true, is_verified: true, role: 'urologist' }]
            });
            jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
            mockOtpService.storeOTP.mockResolvedValue({ emailSent: true });

            await authController.login(req, res);

            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ requiresOTPVerification: true })
            }));
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            const req = { body: { refreshToken: 'valid' } };
            const res = { json: jest.fn() };

            mockJwt.verifyRefreshToken.mockReturnValue({ id: 1 });
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [{ id: 1, email: 'test@example.com', is_active: true }]
                }) // Check token
                .mockResolvedValueOnce({ rows: [] }) // Revoke old
                .mockResolvedValueOnce({ rows: [] }); // Insert new

            mockJwt.generateTokens.mockReturnValue({ accessToken: 'new_at', refreshToken: 'new_rt' });

            await authController.refreshToken(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ accessToken: 'new_at' })
            }));
        });
    });

    describe('verifyLoginOTP', () => {
        it('should verify OTP and complete login', async () => {
            const req = { body: { email: 'test@example.com', otp: '123456' } };
            const res = { cookie: jest.fn(), json: jest.fn() };

            mockOtpService.verifyOTP.mockResolvedValue({ success: true, data: { userId: 1 } });
            mockClient.query
                .mockResolvedValueOnce({
                    rows: [{
                        id: 1, email: 'test@example.com', first_name: 'John', last_name: 'Doe',
                        role: 'urologist', is_active: true, is_verified: true, created_at: new Date()
                    }]
                }) // Get user
                .mockResolvedValueOnce({ rows: [] }); // Insert refresh token

            mockJwt.generateTokens.mockReturnValue({ accessToken: 'at', refreshToken: 'rt' });

            await authController.verifyLoginOTP(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Login completed successfully'
            }));
            expect(res.cookie).toHaveBeenCalled();
        });

        it('should return 400 for invalid OTP', async () => {
            const req = { body: { email: 'test@example.com', otp: 'wrong' } };
            const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

            mockOtpService.verifyOTP.mockResolvedValue({ success: false, message: 'Invalid OTP' });

            await authController.verifyLoginOTP(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockOtpService.incrementOTPAttempts).toHaveBeenCalled();
        });
    });

    describe('resendLoginOTP', () => {
        it('should resend OTP successfully', async () => {
            const req = { body: { email: 'test@example.com' } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, is_verified: true, is_active: true }]
            });
            mockOtpService.storeOTP.mockResolvedValue({ emailSent: true });

            await authController.resendLoginOTP(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                emailSent: true
            }));
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            const req = { body: { refreshToken: 'token' } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({ rows: [] });

            await authController.logout(req, res);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Logout successful'
            });
        });
    });

    describe('getProfile', () => {
        it('should return user profile', async () => {
            const req = { user: { id: 1, email: 'test@example.com', password_hash: 'hash' } };
            const res = { json: jest.fn() };

            await authController.getProfile(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ user: { id: 1, email: 'test@example.com' } })
            }));
        });
    });

    describe('requestPasswordReset', () => {
        it('should send OTP for valid user', async () => {
            const req = { body: { email: 'test@example.com' } };
            const res = { json: jest.fn() };

            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, email: 'test@example.com', is_active: true, is_verified: true }]
            });
            mockOtpService.storeOTP.mockResolvedValue({});

            await authController.requestPasswordReset(req, res);

            expect(mockOtpService.storeOTP).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });
    });

    describe('verifyPasswordResetOTP', () => {
        it('should verify OTP and return reset token', async () => {
            const req = { body: { email: 'test@example.com', otp: '123456' } };
            const res = { json: jest.fn() };

            mockOtpService.verifyOTP.mockResolvedValue({ success: true, data: { userId: 1 } });
            mockClient.query.mockResolvedValue({ rows: [] }); // Insert token

            await authController.verifyPasswordResetOTP(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({ resetToken: expect.any(String) })
            }));
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            const req = { body: { resetToken: 'token', newPassword: 'StrongPassword1!' } };
            const res = { json: jest.fn() };

            mockClient.query
                .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, is_used: false }] }) // Token check
                .mockResolvedValueOnce({ rows: [] }) // Password history
                .mockResolvedValueOnce({ rows: [] }) // Update user
                .mockResolvedValueOnce({ rows: [] }) // Add history
                .mockResolvedValueOnce({ rows: [] }) // Trim history
                .mockResolvedValueOnce({ rows: [] }); // Mark token used

            jest.spyOn(bcrypt, 'hash').mockResolvedValue('new_hash');

            await authController.resetPassword(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: expect.stringContaining('Password reset successfully')
            }));
        });
    });
});
