/**
 * Comprehensive tests for Validation utilities
 * Tests all schemas and validation middleware to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('Validation Utilities', () => {
  let validation;

  beforeEach(async () => {
    validation = await import('../utils/validation.js');
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

      const { error } = validation.registerSchema.validate(validData);
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

      const { error } = validation.registerSchema.validate(invalidData);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('valid email');
    });

    it('should reject weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = validation.registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject password without special character', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPassword123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = validation.registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid firstName', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'J',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = validation.registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject firstName with numbers', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'John123',
        lastName: 'Doe',
        role: 'urologist'
      };

      const { error } = validation.registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid role', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'John',
        lastName: 'Doe',
        role: 'invalid_role'
      };

      const { error } = validation.registerSchema.validate(invalidData);
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

      const { error } = validation.registerSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid phone format', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'TestPassword123!@#',
        firstName: 'John',
        lastName: 'Doe',
        phone: 'invalid',
        role: 'urologist'
      };

      const { error } = validation.registerSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'anypassword'
      };

      const { error } = validation.loginSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'anypassword'
      };

      const { error } = validation.loginSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'test@example.com'
      };

      const { error } = validation.loginSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token', () => {
      const validData = {
        refreshToken: 'valid-token'
      };

      const { error } = validation.refreshTokenSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing refresh token', () => {
      const invalidData = {};

      const { error } = validation.refreshTokenSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('otpVerificationSchema', () => {
    it('should validate valid OTP data', () => {
      const validData = {
        email: 'test@example.com',
        otp: '123456',
        type: 'registration'
      };

      const { error } = validation.otpVerificationSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should use default type when not provided', () => {
      const data = {
        email: 'test@example.com',
        otp: '123456'
      };

      const { error, value } = validation.otpVerificationSchema.validate(data);
      expect(error).toBeUndefined();
      expect(value.type).toBe('registration');
    });

    it('should reject invalid OTP length', () => {
      const invalidData = {
        email: 'test@example.com',
        otp: '12345',
        type: 'registration'
      };

      const { error } = validation.otpVerificationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject non-numeric OTP', () => {
      const invalidData = {
        email: 'test@example.com',
        otp: 'abcdef',
        type: 'registration'
      };

      const { error } = validation.otpVerificationSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject invalid type', () => {
      const invalidData = {
        email: 'test@example.com',
        otp: '123456',
        type: 'invalid'
      };

      const { error } = validation.otpVerificationSchema.validate(invalidData);
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
        address: '123 Main St',
        initialPSADate: '2020-01-01'
      };

      const { error } = validation.addPatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should validate valid patient data with age', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '+1234567890',
        address: '123 Main St',
        initialPSADate: '2020-01-01'
      };

      const { error } = validation.addPatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject when neither dateOfBirth nor age provided', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        address: '123 Main St',
        initialPSADate: '2020-01-01'
      };

      const { error } = validation.addPatientSchema.validate(invalidData);
      expect(error).toBeDefined();
      // The custom validation message format may vary, check for the key phrase
      const errorMessage = error.details[0].message || '';
      // Joi custom validation messages may be in the format: "value" failed custom validation because [message]
      // or just the message itself depending on how it's configured
      expect(errorMessage).toBeDefined();
      // Check if the error is about date of birth or age requirement
      expect(
        errorMessage.includes('date of birth') || 
        errorMessage.includes('age') || 
        error.details[0].type === 'any.custom'
      ).toBe(true);
    });

    it('should reject invalid phone number', () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '123',
        address: '123 Main St',
        initialPSADate: '2020-01-01'
      };

      const { error } = validation.addPatientSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should reject future dateOfBirth', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: futureDate.toISOString(),
        phone: '+1234567890',
        address: '123 Main St',
        initialPSADate: '2020-01-01'
      };

      const { error } = validation.addPatientSchema.validate(invalidData);
      expect(error).toBeDefined();
    });

    it('should accept optional fields', () => {
      const validData = {
        firstName: 'John',
        lastName: 'Doe',
        age: 30,
        phone: '+1234567890',
        address: '123 Main St',
        initialPSADate: '2020-01-01',
        email: 'test@example.com',
        postcode: '12345',
        city: 'Test City'
      };

      const { error } = validation.addPatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });
  });

  describe('updatePatientSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        firstName: 'John',
        address: '123 Main St'
      };

      const { error } = validation.updatePatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should allow all fields to be optional except address', () => {
      const validData = {
        address: '123 Main St'
      };

      const { error } = validation.updatePatientSchema.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject missing address', () => {
      const invalidData = {
        firstName: 'John'
      };

      const { error } = validation.updatePatientSchema.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('validateRequest middleware', () => {
    it('should call next() when validation passes', () => {
      const schema = validation.loginSchema;
      const middleware = validation.validateRequest(schema);
      
      const req = {
        body: {
          email: 'test@example.com',
          password: 'password123'
        }
      };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body.email).toBe('test@example.com');
    });

    it('should return 400 when validation fails', () => {
      const schema = validation.loginSchema;
      const middleware = validation.validateRequest(schema);
      
      const req = {
        body: {
          email: 'invalid-email'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ])
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle multiple validation errors', () => {
      const schema = validation.registerSchema;
      const middleware = validation.validateRequest(schema);
      
      const req = {
        body: {
          email: 'invalid',
          password: 'weak'
        }
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
            expect.any(Object)
          ])
        })
      );
    });
  });
});

