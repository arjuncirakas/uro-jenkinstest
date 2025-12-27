/**
 * Tests for inputValidation.js
 * Ensures 100% coverage including all validation functions and edge cases
 */
import { describe, it, expect } from 'vitest';
import {
  validateNameInput,
  validatePhoneInput,
  formatPhoneNumber,
  validateEmail,
  validatePostcode,
  validatePSAValue,
  validateNumericInput,
  validateAlphanumeric,
  validateAge,
  validateDateOfBirth,
  validateFutureDate,
  sanitizeInput,
  sanitizeHTML,
  sanitizeRichText,
  validateRequired,
  validatePhoneFormat,
  validateEmailFormat,
  validateNameFormat,
  validatePSAFormat,
  validatePatientForm,
  handlePhoneInput,
  handleNameInput,
  handleNumericInput
} from '../inputValidation';

describe('inputValidation', () => {
  describe('validateNameInput', () => {
    it('should accept valid names with letters only', () => {
      expect(validateNameInput('John')).toBe(true);
      expect(validateNameInput('Mary')).toBe(true);
    });

    it('should accept names with spaces', () => {
      expect(validateNameInput('John Doe')).toBe(true);
      expect(validateNameInput('Mary Jane Watson')).toBe(true);
    });

    it('should accept names with hyphens', () => {
      expect(validateNameInput('Mary-Jane')).toBe(true);
      expect(validateNameInput('Jean-Luc')).toBe(true);
    });

    it('should accept names with apostrophes', () => {
      expect(validateNameInput("O'Brien")).toBe(true);
      expect(validateNameInput("D'Angelo")).toBe(true);
    });

    it('should accept names with periods', () => {
      expect(validateNameInput('Dr. Smith')).toBe(true);
      expect(validateNameInput('Mr. Johnson')).toBe(true);
    });

    it('should reject names with numbers', () => {
      expect(validateNameInput('John123')).toBe(false);
      expect(validateNameInput('123John')).toBe(false);
    });

    it('should reject names with special characters', () => {
      expect(validateNameInput('John@Doe')).toBe(false);
      expect(validateNameInput('John#Doe')).toBe(false);
    });

    it('should accept empty string', () => {
      expect(validateNameInput('')).toBe(true);
    });
  });

  describe('validatePhoneInput', () => {
    it('should accept digits only', () => {
      expect(validatePhoneInput('1234567890')).toBe(true);
      expect(validatePhoneInput('0123456789')).toBe(true);
    });

    it('should accept phone numbers with spaces', () => {
      expect(validatePhoneInput('123 456 7890')).toBe(true);
      expect(validatePhoneInput('1 2 3 4 5 6 7 8 9 0')).toBe(true);
    });

    it('should accept phone numbers with hyphens', () => {
      expect(validatePhoneInput('123-456-7890')).toBe(true);
      expect(validatePhoneInput('1-2-3-4-5')).toBe(true);
    });

    it('should accept phone numbers with parentheses', () => {
      expect(validatePhoneInput('(123) 456-7890')).toBe(true);
      expect(validatePhoneInput('(123)456-7890')).toBe(true);
    });

    it('should accept phone numbers with plus sign', () => {
      expect(validatePhoneInput('+1234567890')).toBe(true);
      expect(validatePhoneInput('+1 234 567 890')).toBe(true);
    });

    it('should reject phone numbers with letters', () => {
      expect(validatePhoneInput('123-ABC-7890')).toBe(false);
      expect(validatePhoneInput('abc123')).toBe(false);
    });

    it('should reject phone numbers with other special characters', () => {
      expect(validatePhoneInput('123@456')).toBe(false);
      expect(validatePhoneInput('123#456')).toBe(false);
    });

    it('should accept empty string', () => {
      expect(validatePhoneInput('')).toBe(true);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 3 or fewer digits', () => {
      expect(formatPhoneNumber('123')).toBe('123');
      expect(formatPhoneNumber('12')).toBe('12');
    });

    it('should format 4-6 digits', () => {
      expect(formatPhoneNumber('1234')).toBe('(123) 4');
      expect(formatPhoneNumber('123456')).toBe('(123) 456');
    });

    it('should format 7-10 digits', () => {
      expect(formatPhoneNumber('1234567')).toBe('(123) 456-7');
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('should format numbers longer than 10 digits', () => {
      expect(formatPhoneNumber('12345678901')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('12345678901234')).toBe('(123) 456-7890');
    });

    it('should handle numbers with formatting already applied', () => {
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
    });

    it('should handle empty string', () => {
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
    });

    it('should accept empty string', () => {
      expect(validateEmail('')).toBe(true);
    });

    it('should accept null/undefined', () => {
      expect(validateEmail(null)).toBe(true);
      expect(validateEmail(undefined)).toBe(true);
    });
  });

  describe('validatePostcode', () => {
    it('should accept digits only', () => {
      expect(validatePostcode('12345')).toBe(true);
      expect(validatePostcode('1234567890')).toBe(true);
    });

    it('should reject letters', () => {
      expect(validatePostcode('ABC123')).toBe(false);
      expect(validatePostcode('123ABC')).toBe(false);
    });

    it('should accept empty string', () => {
      expect(validatePostcode('')).toBe(true);
    });
  });

  describe('validatePSAValue', () => {
    it('should accept positive decimal numbers', () => {
      expect(validatePSAValue('1.5')).toBe(true);
      expect(validatePSAValue('10.25')).toBe(true);
      expect(validatePSAValue('0.5')).toBe(true);
    });

    it('should accept integers', () => {
      expect(validatePSAValue('10')).toBe(true);
      expect(validatePSAValue('0')).toBe(true);
    });

    it('should reject negative numbers', () => {
      expect(validatePSAValue('-1')).toBe(false);
      expect(validatePSAValue('-0.5')).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validatePSAValue('abc')).toBe(false);
      expect(validatePSAValue('12abc')).toBe(false);
    });

    it('should accept empty string', () => {
      expect(validatePSAValue('')).toBe(true);
    });

    it('should accept null/undefined', () => {
      expect(validatePSAValue(null)).toBe(true);
      expect(validatePSAValue(undefined)).toBe(true);
    });
  });

  describe('validateNumericInput', () => {
    it('should accept digits only', () => {
      expect(validateNumericInput('123')).toBe(true);
      expect(validateNumericInput('0')).toBe(true);
    });

    it('should accept decimal numbers', () => {
      expect(validateNumericInput('12.34')).toBe(true);
      expect(validateNumericInput('0.5')).toBe(true);
    });

    it('should reject letters', () => {
      expect(validateNumericInput('abc')).toBe(false);
      expect(validateNumericInput('12abc')).toBe(false);
    });

    it('should accept empty string', () => {
      expect(validateNumericInput('')).toBe(true);
    });
  });

  describe('validateAlphanumeric', () => {
    it('should accept letters and numbers', () => {
      expect(validateAlphanumeric('ABC123')).toBe(true);
      expect(validateAlphanumeric('test123')).toBe(true);
    });

    it('should accept spaces', () => {
      expect(validateAlphanumeric('test 123')).toBe(true);
      expect(validateAlphanumeric('ABC 123')).toBe(true);
    });

    it('should reject special characters', () => {
      expect(validateAlphanumeric('test@123')).toBe(false);
      expect(validateAlphanumeric('test#123')).toBe(false);
    });

    it('should accept empty string', () => {
      expect(validateAlphanumeric('')).toBe(true);
    });
  });

  describe('validateAge', () => {
    it('should accept valid ages', () => {
      expect(validateAge('1')).toBe(true);
      expect(validateAge('50')).toBe(true);
      expect(validateAge('120')).toBe(true);
    });

    it('should reject ages outside range', () => {
      expect(validateAge('0')).toBe(false);
      expect(validateAge('121')).toBe(false);
      expect(validateAge('-1')).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(validateAge('abc')).toBe(false);
      expect(validateAge('12.5')).toBe(false);
    });

    it('should accept empty string', () => {
      expect(validateAge('')).toBe(true);
    });

    it('should accept null/undefined', () => {
      expect(validateAge(null)).toBe(true);
      expect(validateAge(undefined)).toBe(true);
    });
  });

  describe('validateDateOfBirth', () => {
    it('should accept past dates', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 20);
      expect(validateDateOfBirth(pastDate.toISOString().split('T')[0])).toBe(true);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(validateDateOfBirth(futureDate.toISOString().split('T')[0])).toBe(false);
    });

    it('should accept today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(validateDateOfBirth(today)).toBe(true);
    });

    it('should accept empty string', () => {
      expect(validateDateOfBirth('')).toBe(true);
    });

    it('should accept null/undefined', () => {
      expect(validateDateOfBirth(null)).toBe(true);
      expect(validateDateOfBirth(undefined)).toBe(true);
    });
  });

  describe('validateFutureDate', () => {
    it('should accept future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(validateFutureDate(futureDate.toISOString().split('T')[0])).toBe(true);
    });

    it('should reject past dates', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      expect(validateFutureDate(pastDate.toISOString().split('T')[0])).toBe(false);
    });

    it('should accept today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(validateFutureDate(today)).toBe(true);
    });

    it('should accept empty string', () => {
      expect(validateFutureDate('')).toBe(true);
    });

    it('should accept null/undefined', () => {
      expect(validateFutureDate(null)).toBe(true);
      expect(validateFutureDate(undefined)).toBe(true);
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<script>');
      expect(sanitizeInput('<div>test</div>')).not.toContain('<div>');
    });

    it('should preserve plain text', () => {
      expect(sanitizeInput('plain text')).toBe('plain text');
      expect(sanitizeInput('test123')).toBe('test123');
    });

    it('should trim whitespace by default', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });

    it('should preserve whitespace when option is set', () => {
      expect(sanitizeInput('  test  ', { preserveWhitespace: true })).toBe('  test  ');
    });

    it('should handle empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('should handle non-string values', () => {
      expect(sanitizeInput(123)).toBe(123);
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(undefined)).toBe(undefined);
    });
  });

  describe('sanitizeHTML', () => {
    it('should sanitize dangerous HTML', () => {
      const result = sanitizeHTML('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
    });

    it('should allow safe HTML tags', () => {
      const result = sanitizeHTML('<p>Test</p><b>Bold</b>');
      expect(result).toContain('<p>');
      expect(result).toContain('<b>');
    });

    it('should handle empty string', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('should handle non-string values', () => {
      expect(sanitizeHTML(123)).toBe(123);
    });
  });

  describe('sanitizeRichText', () => {
    it('should sanitize rich text content', () => {
      const result = sanitizeRichText('<h1>Title</h1><p>Content</p>');
      expect(result).toContain('<h1>');
      expect(result).toContain('<p>');
    });

    it('should remove dangerous content', () => {
      const result = sanitizeRichText('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
    });

    it('should handle empty string', () => {
      expect(sanitizeRichText('')).toBe('');
    });
  });

  describe('validateRequired', () => {
    it('should return error for empty value', () => {
      expect(validateRequired('', 'Field')).toBe('Field is required');
      expect(validateRequired('   ', 'Field')).toBe('Field is required');
    });

    it('should return empty string for valid value', () => {
      expect(validateRequired('test', 'Field')).toBe('');
      expect(validateRequired('  test  ', 'Field')).toBe('');
    });

    it('should return error for null/undefined', () => {
      expect(validateRequired(null, 'Field')).toBe('Field is required');
      expect(validateRequired(undefined, 'Field')).toBe('Field is required');
    });
  });

  describe('validatePhoneFormat', () => {
    it('should return empty string for valid phone', () => {
      expect(validatePhoneFormat('12345678')).toBe('');
      expect(validatePhoneFormat('123456789012345')).toBe('');
    });

    it('should return error for too short phone', () => {
      expect(validatePhoneFormat('1234567')).toBe('Phone number must be at least 8 digits');
    });

    it('should return error for too long phone', () => {
      expect(validatePhoneFormat('1234567890123456')).toBe('Phone number must not exceed 15 digits');
    });

    it('should return empty string for empty value', () => {
      expect(validatePhoneFormat('')).toBe('');
      expect(validatePhoneFormat(null)).toBe('');
    });
  });

  describe('validateEmailFormat', () => {
    it('should return empty string for valid email', () => {
      expect(validateEmailFormat('test@example.com')).toBe('');
    });

    it('should return error for invalid email', () => {
      expect(validateEmailFormat('invalid')).toBe('Please enter a valid email address');
    });

    it('should return empty string for empty value', () => {
      expect(validateEmailFormat('')).toBe('');
      expect(validateEmailFormat(null)).toBe('');
    });
  });

  describe('validateNameFormat', () => {
    it('should return empty string for valid name', () => {
      expect(validateNameFormat('John', 'First name')).toBe('');
      expect(validateNameFormat('Mary-Jane', 'First name')).toBe('');
    });

    it('should return error for too short name', () => {
      expect(validateNameFormat('J', 'First name')).toBe('First name must be at least 2 characters');
    });

    it('should return error for too long name', () => {
      const longName = 'A'.repeat(51);
      expect(validateNameFormat(longName, 'First name')).toBe('First name must be less than 50 characters');
    });

    it('should return error for invalid characters', () => {
      expect(validateNameFormat('John123', 'First name')).toBe('First name can only contain letters, spaces, hyphens, apostrophes, and periods');
    });

    it('should return empty string for empty value', () => {
      expect(validateNameFormat('', 'First name')).toBe('');
      expect(validateNameFormat(null, 'First name')).toBe('');
    });
  });

  describe('validatePSAFormat', () => {
    it('should return empty string for valid PSA', () => {
      expect(validatePSAFormat('10')).toBe('');
      expect(validatePSAFormat('10.5')).toBe('');
    });

    it('should return error for invalid number', () => {
      expect(validatePSAFormat('abc')).toBe('PSA must be a valid number');
    });

    it('should return error for negative value', () => {
      expect(validatePSAFormat('-1')).toBe('PSA cannot be negative');
    });

    it('should return error for unusually high value', () => {
      expect(validatePSAFormat('1001')).toBe('PSA value seems unusually high. Please verify.');
    });

    it('should return empty string for empty value', () => {
      expect(validatePSAFormat('')).toBe('');
      expect(validatePSAFormat(null)).toBe('');
    });
  });

  describe('validatePatientForm', () => {
    it('should return empty errors for valid form', () => {
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
        dateOfBirth: '1990-01-01',
        address: '123 Main St',
        initialPSA: '10',
        initialPSADate: '2020-01-01',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '0987654321',
        emergencyContactRelationship: 'Spouse'
      };
      const errors = validatePatientForm(formData);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should return errors for invalid form', () => {
      const formData = {
        firstName: '',
        lastName: '',
        email: 'invalid',
        phone: '123'
      };
      const errors = validatePatientForm(formData);
      expect(errors.firstName).toBeDefined();
      expect(errors.lastName).toBeDefined();
      expect(errors.email).toBeDefined();
    });

    it('should require either dateOfBirth or age', () => {
      const formData = {
        firstName: 'John',
        lastName: 'Doe'
      };
      const errors = validatePatientForm(formData);
      expect(errors.dateOfBirth).toBeDefined();
      expect(errors.age).toBeDefined();
    });

    it('should validate dateOfBirth if provided', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: futureDate.toISOString().split('T')[0]
      };
      const errors = validatePatientForm(formData);
      expect(errors.dateOfBirth).toBeDefined();
    });
  });

  describe('handlePhoneInput', () => {
    it('should call onChange for valid phone input', () => {
      const onChange = vi.fn();
      const result = handlePhoneInput('1234567890', '', onChange);
      
      expect(result).toBe(true);
      expect(onChange).toHaveBeenCalledWith('1234567890');
    });

    it('should not call onChange for invalid phone input', () => {
      const onChange = vi.fn();
      const result = handlePhoneInput('abc123', '', onChange);
      
      expect(result).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('handleNameInput', () => {
    it('should call onChange for valid name input', () => {
      const onChange = vi.fn();
      const result = handleNameInput('John Doe', '', onChange);
      
      expect(result).toBe(true);
      expect(onChange).toHaveBeenCalledWith('John Doe');
    });

    it('should not call onChange for invalid name input', () => {
      const onChange = vi.fn();
      const result = handleNameInput('John123', '', onChange);
      
      expect(result).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('handleNumericInput', () => {
    it('should call onChange for valid numeric input', () => {
      const onChange = vi.fn();
      const result = handleNumericInput('123.45', '', onChange);
      
      expect(result).toBe(true);
      expect(onChange).toHaveBeenCalledWith('123.45');
    });

    it('should not call onChange for invalid numeric input', () => {
      const onChange = vi.fn();
      const result = handleNumericInput('abc123', '', onChange);
      
      expect(result).toBe(false);
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

