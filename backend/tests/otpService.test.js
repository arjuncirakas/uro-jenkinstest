/**
 * Comprehensive tests for OTP Service
 * Tests all functions and code paths to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockPool = {
  connect: jest.fn()
};

const mockEmailService = {
  sendOTPEmail: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../services/emailService.js', () => ({
  sendOTPEmail: mockEmailService.sendOTPEmail
}));

describe('OTP Service', () => {
  let otpService;
  let mockClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);
    
    otpService = await import('../services/otpService.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = otpService.generateOTP();
      
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThan(999999);
    });

    it('should generate different OTPs on multiple calls', () => {
      const otp1 = otpService.generateOTP();
      const otp2 = otpService.generateOTP();
      
      // Very unlikely to be the same
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('storeOTP', () => {
    const userId = 1;
    const email = 'test@example.com';
    const type = 'registration';

    it('should store OTP and send email successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // DELETE query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // INSERT query
      
      mockEmailService.sendOTPEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      });

      const result = await otpService.storeOTP(userId, email, type);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM otp_verifications WHERE user_id = $1 AND type = $2',
        [userId, type]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO otp_verifications (user_id, email, otp_code, type, expires_at) VALUES ($1, $2, $3, $4, $5)',
        expect.arrayContaining([userId, email, expect.any(String), type])
      );
      expect(result.otpCode).toMatch(/^\d{6}$/);
      expect(result.emailSent).toBe(true);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });
      
      mockEmailService.sendOTPEmail.mockResolvedValue({
        success: false,
        error: 'SMTP error'
      });

      const result = await otpService.storeOTP(userId, email, type);

      expect(result.otpCode).toMatch(/^\d{6}$/);
      expect(result.emailSent).toBe(false);
      expect(result.emailError).toBe('SMTP error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle email sending exception', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });
      
      const emailError = new Error('Email service unavailable');
      mockEmailService.sendOTPEmail.mockRejectedValue(emailError);

      const result = await otpService.storeOTP(userId, email, type);

      expect(result.otpCode).toMatch(/^\d{6}$/);
      expect(result.emailSent).toBe(false);
      expect(result.emailError).toBe('Email service unavailable');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockClient.query.mockRejectedValue(dbError);

      await expect(otpService.storeOTP(userId, email, type)).rejects.toThrow('Database connection failed');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use default type if not provided', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] });
      
      mockEmailService.sendOTPEmail.mockResolvedValue({ success: true });

      await otpService.storeOTP(userId, email);

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM otp_verifications WHERE user_id = $1 AND type = $2',
        [userId, 'registration']
      );
    });
  });

  describe('verifyOTP', () => {
    const email = 'test@example.com';
    const otpCode = '123456';
    const type = 'registration';

    it('should verify valid OTP successfully', async () => {
      const mockOtpData = {
        id: 1,
        user_id: 1,
        email: email,
        first_name: 'John',
        last_name: 'Doe',
        role: 'urologist',
        is_active: true,
        attempts: 0
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockOtpData] })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE query

      const result = await otpService.verifyOTP(email, otpCode, type);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBe(1);
      expect(result.data.email).toBe(email);
      expect(result.data.user).toEqual({
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        role: 'urologist',
        is_active: true
      });
      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE otp_verifications SET is_used = true WHERE id = $1',
        [1]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return error for invalid or expired OTP', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await otpService.verifyOTP(email, otpCode, type);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired OTP');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return error when maximum attempts exceeded', async () => {
      const mockOtpData = {
        id: 1,
        user_id: 1,
        email: email,
        attempts: 3
      };

      mockClient.query.mockResolvedValueOnce({ rows: [mockOtpData] });

      const result = await otpService.verifyOTP(email, otpCode, type);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Maximum OTP attempts exceeded. Please request a new OTP.');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle OTP with no associated user', async () => {
      const mockOtpData = {
        id: 1,
        user_id: null,
        email: email,
        attempts: 0
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockOtpData] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await otpService.verifyOTP(email, otpCode, type);

      expect(result.success).toBe(true);
      expect(result.data.userId).toBeNull();
      expect(result.data.user).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(otpService.verifyOTP(email, otpCode, type)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('incrementOTPAttempts', () => {
    const email = 'test@example.com';
    const otpCode = '123456';
    const type = 'registration';

    it('should increment OTP attempts successfully', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await otpService.incrementOTPAttempts(email, otpCode, type);

      expect(mockClient.query).toHaveBeenCalledWith(
        'UPDATE otp_verifications SET attempts = attempts + 1 WHERE email = $1 AND otp_code = $2 AND type = $3',
        [email, otpCode, type]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      // Should not throw
      await otpService.incrementOTPAttempts(email, otpCode, type);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredOTPs', () => {
    it('should cleanup expired OTPs successfully', async () => {
      mockClient.query.mockResolvedValueOnce({ rowCount: 5 });

      const result = await otpService.cleanupExpiredOTPs();

      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM otp_verifications WHERE expires_at < NOW()'
      );
      expect(result).toBe(5);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      await expect(otpService.cleanupExpiredOTPs()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('sendOTPEmailToUser', () => {
    const email = 'test@example.com';
    const otpCode = '123456';
    const type = 'registration';

    it('should send OTP email successfully', async () => {
      mockEmailService.sendOTPEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123'
      });

      const result = await otpService.sendOTPEmailToUser(email, otpCode, type);

      expect(result.success).toBe(true);
      expect(result.message).toBe('OTP sent successfully');
      expect(result.messageId).toBe('msg-123');
      expect(mockEmailService.sendOTPEmail).toHaveBeenCalledWith(email, otpCode, type);
    });

    it('should handle email sending failure', async () => {
      mockEmailService.sendOTPEmail.mockResolvedValue({
        success: false,
        error: 'SMTP error'
      });

      const result = await otpService.sendOTPEmailToUser(email, otpCode, type);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send OTP email');
      expect(result.error).toBe('SMTP error');
    });

    it('should handle email sending exception', async () => {
      const emailError = new Error('Email service unavailable');
      mockEmailService.sendOTPEmail.mockRejectedValue(emailError);

      const result = await otpService.sendOTPEmailToUser(email, otpCode, type);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send OTP email');
      expect(result.error).toBe('Email service unavailable');
    });
  });
});

