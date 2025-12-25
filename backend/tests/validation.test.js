import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import Joi from 'joi';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  otpVerificationSchema,
  addPatientSchema,
  updatePatientSchema,
  validateRequest
} from '../utils/validation.js';

describe('validation.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        organization: 'Test Org',
        role: 'urologist'
      };

      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'TestPassword123!@#',
        firstName: 'John',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('email');
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Password');
    });

    it('should reject invalid role', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid_role'
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Role');
    });

    it('should reject short first name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'J',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should accept optional phone', () => {
      const validData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'John',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should accept optional organization', () => {
      const validData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'John',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword'
      };

      const { error } = loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'password'
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com'
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid',
        password: 'password'
      };

      const { error } = loginSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token', () => {
      const validData = {
        refreshToken: 'valid-token-string'
      };

      const { error } = refreshTokenSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing refresh token', () => {
      const invalidData = {};

      const { error } = refreshTokenSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('required');
    });
  });

  describe('otpVerificationSchema', () => {
    it('should validate valid OTP data', () => {
      const validData = {
        email: 'test@example.com',
        otp: '123456',
        type: 'registration'
      };

      const { error } = otpVerificationSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should use default type when not provided', () => {
      const validData = {
        email: 'test@example.com',
        otp: '123456'
      };

      const { error, value } = otpVerificationSchema.validate(validData);
      expect(error).toBeUndefined();
      expect(value.type).toBe('registration');
    });

    it('should reject invalid OTP length', () => {
      const invalidData = {
        email: 'test@example.com',
        otp: '12345'
      };

      const { error } = otpVerificationSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('6 digits');
    });

    it('should reject non-numeric OTP', () => {
      const invalidData = {
        email: 'test@example.com',
        otp: 'abcdef'
      };

      const { error } = otpVerificationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid type', () => {
      const invalidData = {
        email: 'test@example.com',
        otp: '123456',
        type: 'invalid'
      };

      const { error } = otpVerificationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('addPatientSchema', () => {
    it('should validate valid patient data with dateOfBirth', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phone: '+1234567890',
        address: '123 Main St'
      };

      const { error } = addPatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate valid patient data with age', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '+1234567890',
        address: '123 Main St'
      };

      const { error } = addPatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject when neither dateOfBirth nor age provided', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        address: '123 Main St'
      };

      const { error } = addPatientSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('date of birth or age');
    });

    it('should reject future dateOfBirth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: futureDate.toISOString(),
        phone: '+1234567890',
        address: '123 Main St'
      };

      const { error } = addPatientSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid age range', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 150,
        phone: '+1234567890',
        address: '123 Main St'
      };

      const { error } = addPatientSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should accept optional fields', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phone: '+1234567890',
        address: '123 Main St',
        email: 'test@example.com',
        postcode: '12345',
        city: 'City',
        state: 'State'
      };

      const { error } = addPatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });
  });

  describe('updatePatientSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      };

      const { error } = updatePatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should accept status field', () => {
      const validData = {
        firstName: 'John',
        status: 'Active'
      };

      const { error } = updatePatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid status', () => {
      const invalidData = {
        firstName: 'John',
        status: 'InvalidStatus'
      };

      const { error } = updatePatientSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should allow partial updates', () => {
      const validData = {
        firstName: 'Jane'
      };

      const { error } = updatePatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });
  });

  describe('validateRequest middleware', () => {
    it('should call next when validation passes', () => {
      const schema = Joi.object({
        name: Joi.string().required()
      });

      const middleware = validateRequest(schema);
      const req = {
        body: { name: 'Test' }
      };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.name).toBe('Test');
    });

    it('should return 400 when validation fails', () => {
      const schema = Joi.object({
        name: Joi.string().required()
      });

      const middleware = validateRequest(schema);
      const req = {
        body: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should include all validation errors', () => {
      const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required()
      });

      const middleware = validateRequest(schema);
      const req = {
        body: {}
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'name' }),
            expect.objectContaining({ field: 'email' })
          ])
        })
      );
    });
  });
});
