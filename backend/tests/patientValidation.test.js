import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import {
  validatePhoneDigits,
  validateNotFutureDate,
  validateJsonArray,
  validateTriageSymptom,
  validateDreFindings,
  sanitizePatientInput,
  validatePatientInput,
  validatePatientUpdateInput
} from '../middleware/patientValidation.js';

describe('patientValidation.js', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
  });

  describe('validatePhoneDigits', () => {
    it('should validate phone with 8 digits', () => {
      expect(() => validatePhoneDigits('12345678', false)).not.toThrow();
    });

    it('should validate phone with 12 digits', () => {
      expect(() => validatePhoneDigits('123456789012', false)).not.toThrow();
    });

    it('should reject phone with less than 8 digits', () => {
      expect(() => validatePhoneDigits('1234567', false)).toThrow('at least 8 digits');
    });

    it('should reject phone with more than 12 digits', () => {
      expect(() => validatePhoneDigits('1234567890123', false)).toThrow('exceed 12 digits');
    });

    it('should allow empty phone when optional', () => {
      expect(() => validatePhoneDigits('', true)).not.toThrow();
    });

    it('should reject empty phone when required', () => {
      expect(() => validatePhoneDigits('', false)).toThrow();
    });
  });

  describe('validateNotFutureDate', () => {
    it('should validate past date', () => {
      const pastDate = new Date('2020-01-01');
      expect(() => validateNotFutureDate(pastDate.toISOString())).not.toThrow();
    });

    it('should validate today date', () => {
      const today = new Date().toISOString();
      expect(() => validateNotFutureDate(today)).not.toThrow();
    });

    it('should reject future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(() => validateNotFutureDate(futureDate.toISOString(), 'Test')).toThrow('cannot be in the future');
    });

    it('should allow empty date', () => {
      expect(() => validateNotFutureDate(null)).not.toThrow();
      expect(() => validateNotFutureDate(undefined)).not.toThrow();
    });
  });

  describe('validateJsonArray', () => {
    it('should validate valid JSON array string', () => {
      const validArray = JSON.stringify([{ name: 'test' }]);
      expect(() => validateJsonArray(validArray, 'testField')).not.toThrow();
    });

    it('should validate array object', () => {
      const validArray = [{ name: 'test' }];
      expect(() => validateJsonArray(validArray, 'testField')).not.toThrow();
    });

    it('should reject non-array JSON', () => {
      const invalidJson = JSON.stringify({ name: 'test' });
      expect(() => validateJsonArray(invalidJson, 'testField')).toThrow('must be an array');
    });

    it('should allow empty value', () => {
      expect(() => validateJsonArray('', 'testField')).not.toThrow();
      expect(() => validateJsonArray(null, 'testField')).not.toThrow();
    });

    it('should validate array items with validator', () => {
      const validArray = [{ name: 'test' }];
      const itemValidator = jest.fn();
      expect(() => validateJsonArray(validArray, 'testField', itemValidator)).not.toThrow();
      expect(itemValidator).toHaveBeenCalled();
    });

    it('should reject invalid array items', () => {
      const invalidArray = [{ invalid: 'test' }];
      const itemValidator = (item) => {
        if (!item.name) throw new Error('Item must have name');
      };
      expect(() => validateJsonArray(invalidArray, 'testField', itemValidator)).toThrow();
    });
  });

  describe('validateTriageSymptom', () => {
    it('should validate valid symptom', () => {
      const validSymptom = {
        name: 'LUTS',
        duration: '2',
        durationUnit: 'weeks',
        ipssScore: '10'
      };
      expect(() => validateTriageSymptom(validSymptom)).not.toThrow();
    });

    it('should reject symptom without name', () => {
      const invalidSymptom = {
        duration: '2',
        durationUnit: 'weeks'
      };
      expect(() => validateTriageSymptom(invalidSymptom)).toThrow('name');
    });

    it('should reject symptom without duration', () => {
      const invalidSymptom = {
        name: 'LUTS',
        durationUnit: 'weeks'
      };
      expect(() => validateTriageSymptom(invalidSymptom)).toThrow('duration');
    });

    it('should reject symptom without durationUnit', () => {
      const invalidSymptom = {
        name: 'LUTS',
        duration: '2'
      };
      expect(() => validateTriageSymptom(invalidSymptom)).toThrow('durationUnit');
    });

    it('should require ipssScore for LUTS', () => {
      const invalidSymptom = {
        name: 'LUTS',
        duration: '2',
        durationUnit: 'weeks'
      };
      expect(() => validateTriageSymptom(invalidSymptom)).toThrow('IPSS score');
    });

    it('should require ipssScore for Nocturia', () => {
      const invalidSymptom = {
        name: 'Nocturia',
        duration: '2',
        durationUnit: 'weeks'
      };
      expect(() => validateTriageSymptom(invalidSymptom)).toThrow('IPSS score');
    });

    it('should reject invalid frequency type', () => {
      const invalidSymptom = {
        name: 'Test',
        duration: '2',
        durationUnit: 'weeks',
        frequency: 123
      };
      expect(() => validateTriageSymptom(invalidSymptom)).toThrow('string');
    });

    it('should reject invalid notes type', () => {
      const invalidSymptom = {
        name: 'Test',
        duration: '2',
        durationUnit: 'weeks',
        notes: 123
      };
      expect(() => validateTriageSymptom(invalidSymptom)).toThrow('string');
    });
  });

  describe('validateDreFindings', () => {
    it('should validate valid DRE findings', () => {
      expect(() => validateDreFindings('Normal')).not.toThrow();
      expect(() => validateDreFindings('Enlarged')).not.toThrow();
      expect(() => validateDreFindings('Nodule')).not.toThrow();
      expect(() => validateDreFindings('Suspicious')).not.toThrow();
    });

    it('should validate multiple findings', () => {
      expect(() => validateDreFindings('Normal,Enlarged')).not.toThrow();
    });

    it('should validate findings with spaces', () => {
      expect(() => validateDreFindings('Normal, Enlarged')).not.toThrow();
    });

    it('should reject invalid finding', () => {
      expect(() => validateDreFindings('Invalid')).toThrow('Invalid DRE finding');
    });

    it('should allow empty value', () => {
      expect(() => validateDreFindings('')).not.toThrow();
      expect(() => validateDreFindings(null)).not.toThrow();
    });

    it('should reject non-string value', () => {
      expect(() => validateDreFindings(123)).toThrow('string');
    });

    it('should reject findings exceeding 255 characters', () => {
      const longFinding = 'A'.repeat(256);
      expect(() => validateDreFindings(longFinding)).toThrow('255 characters');
    });
  });

  describe('sanitizePatientInput', () => {
    it('should sanitize string fields', () => {
      mockReq.body = {
        firstName: '<script>alert("xss")</script>John',
        lastName: 'Doe',
        email: 'test@example.com'
      };

      sanitizePatientInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.firstName).not.toContain('<script>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim string fields', () => {
      mockReq.body = {
        firstName: '  John  ',
        lastName: '  Doe  '
      };

      sanitizePatientInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.firstName).toBe('John');
      expect(mockReq.body.lastName).toBe('Doe');
    });

    it('should not modify non-string fields', () => {
      mockReq.body = {
        age: 30,
        initialPSA: 3.5
      };

      sanitizePatientInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.age).toBe(30);
      expect(mockReq.body.initialPSA).toBe(3.5);
    });

    it('should handle missing body', () => {
      mockReq.body = null;

      sanitizePatientInput(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize all string fields', () => {
      mockReq.body = {
        firstName: '<script>test</script>',
        lastName: '<script>test</script>',
        email: '<script>test</script>',
        phone: '<script>test</script>',
        address: '<script>test</script>',
        postcode: '<script>test</script>',
        city: '<script>test</script>',
        state: '<script>test</script>',
        referringDepartment: '<script>test</script>',
        medicalHistory: '<script>test</script>',
        currentMedications: '<script>test</script>',
        allergies: '<script>test</script>',
        assignedUrologist: '<script>test</script>',
        emergencyContactName: '<script>test</script>',
        emergencyContactPhone: '<script>test</script>',
        emergencyContactRelationship: '<script>test</script>',
        notes: '<script>test</script>',
        dreFindings: '<script>test</script>',
        gleasonScore: '<script>test</script>'
      };

      sanitizePatientInput(mockReq, mockRes, mockNext);

      Object.values(mockReq.body).forEach(value => {
        if (typeof value === 'string') {
          expect(value).not.toContain('<script>');
        }
      });
    });
  });

  describe('validatePatientInput', () => {
    it('should be an array of validators', () => {
      expect(Array.isArray(validatePatientInput)).toBe(true);
      expect(validatePatientInput.length).toBeGreaterThan(0);
    });

    it('should include sanitizePatientInput', () => {
      expect(validatePatientInput[0]).toBe(sanitizePatientInput);
    });
  });

  describe('validatePatientUpdateInput', () => {
    it('should be an array of validators', () => {
      expect(Array.isArray(validatePatientUpdateInput)).toBe(true);
      expect(validatePatientUpdateInput.length).toBeGreaterThan(0);
    });

    it('should include sanitizePatientInput', () => {
      expect(validatePatientUpdateInput[0]).toBe(sanitizePatientInput);
    });
  });

  describe('validateTriageSymptom edge cases', () => {
    it('should validate symptom without ipssScore when not LUTS or Nocturia', () => {
      const validSymptom = {
        name: 'Other',
        duration: '2',
        durationUnit: 'weeks'
      };
      expect(() => validateTriageSymptom(validSymptom)).not.toThrow();
    });

    it('should validate symptom with valid frequency', () => {
      const validSymptom = {
        name: 'Test',
        duration: '2',
        durationUnit: 'weeks',
        frequency: 'daily'
      };
      expect(() => validateTriageSymptom(validSymptom)).not.toThrow();
    });

    it('should validate symptom with valid notes', () => {
      const validSymptom = {
        name: 'Test',
        duration: '2',
        durationUnit: 'weeks',
        notes: 'Some notes'
      };
      expect(() => validateTriageSymptom(validSymptom)).not.toThrow();
    });

    it('should validate symptom with null frequency', () => {
      const validSymptom = {
        name: 'Test',
        duration: '2',
        durationUnit: 'weeks',
        frequency: null
      };
      expect(() => validateTriageSymptom(validSymptom)).not.toThrow();
    });

    it('should validate symptom with undefined notes', () => {
      const validSymptom = {
        name: 'Test',
        duration: '2',
        durationUnit: 'weeks',
        notes: undefined
      };
      expect(() => validateTriageSymptom(validSymptom)).not.toThrow();
    });
  });

  describe('validateJsonArray edge cases', () => {
    it('should handle invalid JSON string', () => {
      expect(() => validateJsonArray('invalid json', 'testField')).toThrow();
    });

    it('should handle array with null items', () => {
      const arrayWithNull = [null, { name: 'test' }];
      expect(() => validateJsonArray(arrayWithNull, 'testField')).not.toThrow();
    });

    it('should handle empty array', () => {
      expect(() => validateJsonArray([], 'testField')).not.toThrow();
    });
  });

  describe('validatePhoneDigits edge cases', () => {
    it('should handle phone with whitespace when optional', () => {
      expect(() => validatePhoneDigits('   ', true)).not.toThrow();
    });

    it('should handle phone with exactly 8 digits', () => {
      expect(() => validatePhoneDigits('12345678', false)).not.toThrow();
    });

    it('should handle phone with exactly 12 digits', () => {
      expect(() => validatePhoneDigits('123456789012', false)).not.toThrow();
    });

    it('should handle phone with non-digit characters', () => {
      expect(() => validatePhoneDigits('+1 (234) 567-890', false)).not.toThrow();
    });
  });

  describe('validateNotFutureDate edge cases', () => {
    it('should handle empty string', () => {
      expect(() => validateNotFutureDate('')).not.toThrow();
    });

    it('should handle invalid date string', () => {
      expect(() => validateNotFutureDate('invalid-date')).toThrow();
    });
  });

  describe('validateDreFindings edge cases', () => {
    it('should handle single finding', () => {
      expect(() => validateDreFindings('Normal')).not.toThrow();
    });

    it('should handle multiple findings with extra spaces', () => {
      expect(() => validateDreFindings('Normal , Enlarged , Nodule')).not.toThrow();
    });

    it('should handle exactly 255 characters', () => {
      const finding = 'Normal,'.repeat(36) + 'Normal';
      expect(() => validateDreFindings(finding)).not.toThrow();
    });

    it('should handle empty string after trim', () => {
      expect(() => validateDreFindings('   ')).not.toThrow();
    });
  });

  describe('sanitizePatientInput edge cases', () => {
    it('should handle body with undefined fields', () => {
      mockReq.body = {
        firstName: undefined,
        lastName: null
      };
      sanitizePatientInput(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle body with non-string values in string fields', () => {
      mockReq.body = {
        firstName: 123,
        lastName: true
      };
      sanitizePatientInput(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle empty string values', () => {
      mockReq.body = {
        firstName: '',
        lastName: '   '
      };
      sanitizePatientInput(mockReq, mockRes, mockNext);
      expect(mockReq.body.lastName).toBe('');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
