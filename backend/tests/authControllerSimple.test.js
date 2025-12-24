/**
 * Tests for authControllerSimple
 * Tests all functions to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import bcrypt from 'bcryptjs';

// Mock dependencies
const mockPool = {
  connect: jest.fn()
};

const mockJwt = {
  generateTokens: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

jest.unstable_mockModule('../utils/jwt.js', () => ({
  generateTokens: mockJwt.generateTokens
}));

describe('Auth Controller Simple', () => {
  let authControllerSimple;
  let mockClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };
    mockPool.connect.mockResolvedValue(mockClient);
    
    authControllerSimple = await import('../controllers/authControllerSimple.js');
  });

  describe('loginSimple', () => {
    it('should return 401 when user is not found', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValueOnce({ rows: [] });

      await authControllerSimple.loginSimple(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 401 when account is deactivated', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'urologist',
          is_active: false,
          is_verified: true
        }]
      });

      await authControllerSimple.loginSimple(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account is deactivated'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 401 when account is not verified', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'urologist',
          is_active: true,
          is_verified: false
        }]
      });

      await authControllerSimple.loginSimple(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account not verified. Please verify your email first.'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 401 when password is invalid', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'wrong_password'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          password_hash: 'hashed_password',
          first_name: 'John',
          last_name: 'Doe',
          role: 'urologist',
          is_active: true,
          is_verified: true
        }]
      });

      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false);

      await authControllerSimple.loginSimple(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should login successfully with valid credentials', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };
      const res = {
        json: jest.fn()
      };

      const user = {
        id: 1,
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'urologist',
        is_active: true,
        is_verified: true
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [user] })
        .mockResolvedValueOnce({ rows: [] }); // INSERT refresh token

      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true);
      mockJwt.generateTokens.mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token'
      });

      await authControllerSimple.loginSimple(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashed_password');
      // generateTokens is called with the full user object (including password_hash)
      expect(mockJwt.generateTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'urologist',
          is_active: true,
          is_verified: true,
          password_hash: 'hashed_password'
        })
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        expect.arrayContaining([1, 'refresh_token'])
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 1,
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'urologist',
            is_active: true,
            is_verified: true
          },
          accessToken: 'access_token',
          refreshToken: 'refresh_token'
        }
      });
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle errors and return 500', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Setup new mock for this test - connect will fail
      const originalConnect = mockPool.connect;
      mockPool.connect = jest.fn().mockRejectedValueOnce(new Error('Database error'));

      await authControllerSimple.loginSimple(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });

      // Restore original mock
      mockPool.connect = originalConnect;
    });

    it('should handle errors during query execution', async () => {
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Mock client.query to throw an error
      mockClient.query.mockRejectedValueOnce(new Error('Query execution error'));

      await authControllerSimple.loginSimple(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

