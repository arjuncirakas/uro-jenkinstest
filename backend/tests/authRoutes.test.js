import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create mock functions
const mockRegister = jest.fn();
const mockVerifyRegistrationOTP = jest.fn();
const mockResendRegistrationOTP = jest.fn();
const mockLogin = jest.fn();
const mockVerifyLoginOTP = jest.fn();
const mockResendLoginOTP = jest.fn();
const mockRefreshToken = jest.fn();
const mockLogout = jest.fn();
const mockGetProfile = jest.fn();
const mockRequestPasswordReset = jest.fn();
const mockVerifyPasswordResetOTP = jest.fn();
const mockResetPassword = jest.fn();

// Mock authController
jest.unstable_mockModule('../controllers/authController.js', () => ({
    register: mockRegister,
    verifyRegistrationOTP: mockVerifyRegistrationOTP,
    resendRegistrationOTP: mockResendRegistrationOTP,
    login: mockLogin,
    verifyLoginOTP: mockVerifyLoginOTP,
    resendLoginOTP: mockResendLoginOTP,
    refreshToken: mockRefreshToken,
    logout: mockLogout,
    getProfile: mockGetProfile,
    requestPasswordReset: mockRequestPasswordReset,
    verifyPasswordResetOTP: mockVerifyPasswordResetOTP,
    resetPassword: mockResetPassword
}));

// Mock middleware
jest.unstable_mockModule('../middleware/auth.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, email: 'test@example.com', role: 'urologist' };
        next();
    },
    verifyRefreshToken: (req, res, next) => next()
}));

jest.unstable_mockModule('../middleware/rateLimiter.js', () => ({
    generalLimiter: (req, res, next) => next(),
    authLimiter: (req, res, next) => next(),
    otpLimiter: (req, res, next) => next(),
    registrationLimiter: (req, res, next) => next()
}));

jest.unstable_mockModule('../middleware/sanitizer.js', () => ({
    validateRegistrationInput: (req, res, next) => next(),
    validateLoginInput: (req, res, next) => next(),
    validateOTPInput: (req, res, next) => next(),
    xssProtection: (req, res, next) => next()
}));

jest.unstable_mockModule('../utils/validation.js', () => ({
    validateRequest: () => (req, res, next) => next(),
    registerSchema: {},
    loginSchema: {},
    refreshTokenSchema: {},
    otpVerificationSchema: {}
}));

// Mock database
jest.unstable_mockModule('../config/database.js', () => ({
    default: {
        connect: jest.fn().mockResolvedValue({
            query: jest.fn(),
            release: jest.fn()
        })
    }
}));

const authRouter = (await import('../routes/auth.js')).default;

describe('Auth Routes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/api/auth', authRouter);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('GET /api/auth/', () => {
        it('should return API info', async () => {
            const response = await request(app).get('/api/auth/');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.endpoints).toBeDefined();
        });

        it('should list all available endpoints', async () => {
            const response = await request(app).get('/api/auth/');

            expect(response.body.endpoints.register).toBeDefined();
            expect(response.body.endpoints.login).toBeDefined();
            expect(response.body.endpoints.logout).toBeDefined();
        });
    });

    describe('POST /api/auth/register', () => {
        it('should call register controller', async () => {
            mockRegister.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'Test123!',
                    first_name: 'John',
                    last_name: 'Doe'
                });

            expect(mockRegister).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/verify-registration-otp', () => {
        it('should call verifyRegistrationOTP controller', async () => {
            mockVerifyRegistrationOTP.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/auth/verify-registration-otp')
                .send({ email: 'test@example.com', otp: '123456' });

            expect(mockVerifyRegistrationOTP).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/resend-registration-otp', () => {
        it('should call resendRegistrationOTP controller', async () => {
            mockResendRegistrationOTP.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/auth/resend-registration-otp')
                .send({ email: 'test@example.com' });

            expect(mockResendRegistrationOTP).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/login', () => {
        it('should call login controller', async () => {
            mockLogin.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'Test123!' });

            expect(mockLogin).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/verify-login-otp', () => {
        it('should call verifyLoginOTP controller', async () => {
            mockVerifyLoginOTP.mockImplementation((req, res) => {
                res.status(200).json({ success: true, token: 'jwt-token' });
            });

            await request(app)
                .post('/api/auth/verify-login-otp')
                .send({ email: 'test@example.com', otp: '123456' });

            expect(mockVerifyLoginOTP).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/resend-login-otp', () => {
        it('should call resendLoginOTP controller', async () => {
            mockResendLoginOTP.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/auth/resend-login-otp')
                .send({ email: 'test@example.com' });

            expect(mockResendLoginOTP).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/refresh-token', () => {
        it('should call refreshToken controller', async () => {
            mockRefreshToken.mockImplementation((req, res) => {
                res.status(200).json({ success: true, token: 'new-jwt-token' });
            });

            await request(app)
                .post('/api/auth/refresh-token')
                .send({ refreshToken: 'refresh-token' });

            expect(mockRefreshToken).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should call logout controller', async () => {
            mockLogout.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/auth/logout')
                .send({ refreshToken: 'refresh-token' });

            expect(mockLogout).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/forgot-password', () => {
        it('should call requestPasswordReset controller', async () => {
            mockRequestPasswordReset.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/auth/forgot-password')
                .send({ email: 'test@example.com' });

            expect(mockRequestPasswordReset).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/verify-reset-otp', () => {
        it('should call verifyPasswordResetOTP controller', async () => {
            mockVerifyPasswordResetOTP.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/auth/verify-reset-otp')
                .send({ email: 'test@example.com', otp: '123456' });

            expect(mockVerifyPasswordResetOTP).toHaveBeenCalled();
        });
    });

    describe('POST /api/auth/reset-password', () => {
        it('should call resetPassword controller', async () => {
            mockResetPassword.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .post('/api/auth/reset-password')
                .send({
                    email: 'test@example.com',
                    otp: '123456',
                    newPassword: 'NewPass123!'
                });

            expect(mockResetPassword).toHaveBeenCalled();
        });
    });

    describe('GET /api/auth/profile', () => {
        it('should call getProfile controller', async () => {
            mockGetProfile.mockImplementation((req, res) => {
                res.status(200).json({
                    success: true,
                    data: { id: 1, email: 'test@example.com' }
                });
            });

            await request(app)
                .get('/api/auth/profile')
                .set('Authorization', 'Bearer test-token');

            expect(mockGetProfile).toHaveBeenCalled();
        });
    });

    describe('GET /api/auth/test/get-otp/:email', () => {
        it('should return OTP for testing', async () => {
            const pool = (await import('../config/database.js')).default;
            const mockClient = {
                query: jest.fn().mockResolvedValue({
                    rows: [{
                        otp_code: '123456',
                        expires_at: new Date(),
                        created_at: new Date()
                    }]
                }),
                release: jest.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const response = await request(app)
                .get('/api/auth/test/get-otp/test@example.com');

            expect(response.body.success).toBe(true);
            expect(response.body.otp).toBe('123456');
        });

        it('should return error when no OTP found', async () => {
            const pool = (await import('../config/database.js')).default;
            const mockClient = {
                query: jest.fn().mockResolvedValue({ rows: [] }),
                release: jest.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const response = await request(app)
                .get('/api/auth/test/get-otp/unknown@example.com');

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('No valid OTP');
        });

        it('should handle database errors', async () => {
            const pool = (await import('../config/database.js')).default;
            const mockClient = {
                query: jest.fn().mockRejectedValue(new Error('Database error')),
                release: jest.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const response = await request(app)
                .get('/api/auth/test/get-otp/test@example.com');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });

        it('should handle different OTP types via query parameter', async () => {
            const pool = (await import('../config/database.js')).default;
            const mockClient = {
                query: jest.fn().mockResolvedValue({
                    rows: [{
                        otp_code: '654321',
                        expires_at: new Date(),
                        created_at: new Date()
                    }]
                }),
                release: jest.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const response = await request(app)
                .get('/api/auth/test/get-otp/test@example.com?type=registration');

            expect(response.body.success).toBe(true);
            expect(response.body.otp).toBe('654321');
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE email = $1 AND type = $2'),
                ['test@example.com', 'registration']
            );
        });

        it('should use default type when query parameter is not provided', async () => {
            const pool = (await import('../config/database.js')).default;
            const mockClient = {
                query: jest.fn().mockResolvedValue({
                    rows: [{
                        otp_code: '123456',
                        expires_at: new Date(),
                        created_at: new Date()
                    }]
                }),
                release: jest.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            const response = await request(app)
                .get('/api/auth/test/get-otp/test@example.com');

            expect(response.body.success).toBe(true);
            expect(mockClient.query).toHaveBeenCalledWith(
                expect.any(String),
                ['test@example.com', 'login_verification']
            );
        });

        it('should release client connection even on error', async () => {
            const pool = (await import('../config/database.js')).default;
            const mockClient = {
                query: jest.fn().mockRejectedValue(new Error('Database error')),
                release: jest.fn()
            };
            pool.connect.mockResolvedValue(mockClient);

            await request(app)
                .get('/api/auth/test/get-otp/test@example.com');

            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});
