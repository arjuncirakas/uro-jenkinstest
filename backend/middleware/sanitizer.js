import DOMPurify from 'isomorphic-dompurify';
import { body, validationResult } from 'express-validator';

// HTML sanitization middleware
export const sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Sanitize all string fields (comprehensive list)
    const stringFields = [
      'firstName', 'lastName', 'email', 'phone', 'organization',
      'address', 'postcode', 'city', 'state', 'referringDepartment',
      'medicalHistory', 'currentMedications', 'allergies', 'assignedUrologist',
      'emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship',
      'notes', 'first_name', 'last_name', 'referring_department',
      'medical_history', 'current_medications', 'assigned_urologist',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
    ];
    
    stringFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        // Trim whitespace and sanitize HTML
        req.body[field] = DOMPurify.sanitize(req.body[field].trim());
      }
    });
  }
  
  next();
};

// XSS protection middleware
export const xssProtection = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Input validation and sanitization for registration
export const validateRegistrationInput = [
  // Sanitize inputs
  sanitizeInput,
  
  // Validate and sanitize each field
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces')
    .escape(),
    
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces')
    .escape(),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
    
  body('phone')
    .optional()
    .trim()
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
    .escape(),
    
  body('organization')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Organization name must be between 2 and 255 characters')
    .escape(),
    
  body('password')
    .isLength({ min: 14 })
    .withMessage('Password must be at least 14 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value) => {
      if (/\s/.test(value)) {
        throw new Error('Password cannot contain spaces');
      }
      return true;
    }),
    
  body('role')
    .isIn(['urologist', 'gp', 'urology_nurse'])
    .withMessage('Role must be one of: urologist, gp, urology_nurse'),
    
  // Check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    }
    next();
  }
];

// Input validation for login
export const validateLoginInput = [
  sanitizeInput,
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    }
    next();
  }
];

// Input validation for OTP verification
export const validateOTPInput = [
  sanitizeInput,
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('otp')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be exactly 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
    
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    }
    next();
  }
];
