import Joi from 'joi';

// Registration validation schema
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email must not exceed 255 characters',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(14)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 14 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 50 characters',
      'string.pattern.base': 'First name can only contain letters and spaces',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'Last name must be at least 2 characters long',
      'string.max': 'Last name must not exceed 50 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces',
      'any.required': 'Last name is required'
    }),
  phone: Joi.string()
    .pattern(/^[\+]?[1-9][\d]{0,15}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),
  organization: Joi.string()
    .min(2)
    .max(255)
    .optional()
    .messages({
      'string.min': 'Organization name must be at least 2 characters long',
      'string.max': 'Organization name must not exceed 255 characters'
    }),
  role: Joi.string()
    .valid('urologist', 'gp', 'urology_nurse', 'doctor', 'department_admin')
    .required()
    .messages({
      'any.only': 'Role must be one of: urologist, gp, urology_nurse, doctor, department_admin',
      'any.required': 'Role is required'
    })
});

// Login validation schema
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Refresh token validation schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'any.required': 'Refresh token is required'
    })
});

// OTP verification validation schema
export const otpVerificationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain only numbers',
      'any.required': 'OTP is required'
    }),
  type: Joi.string()
    .valid('registration', 'login', 'password_reset')
    .default('registration')
    .messages({
      'any.only': 'Type must be one of: registration, login, password_reset'
    })
});

// Patient validation schema
export const addPatientSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 100 characters',
      'string.pattern.base': 'First name can only contain letters and spaces',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string()
    .max(100)
    .pattern(/^[a-zA-Z\s]+$/)
    .required()
    .messages({
      'string.max': 'Last name must not exceed 100 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces',
      'any.required': 'Last name is required'
    }),
  dateOfBirth: Joi.date()
    .max('now')
    .optional()
    .allow('')
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
  age: Joi.number()
    .integer()
    .min(0)
    .max(120)
    .optional()
    .allow('')
    .messages({
      'number.base': 'Age must be a valid number',
      'number.integer': 'Age must be a whole number',
      'number.min': 'Age must be at least 0',
      'number.max': 'Age must not exceed 120'
    }),
  gender: Joi.string()
    .valid('Male', 'Female', 'Other')
    .required()
    .messages({
      'any.only': 'Gender must be Male, Female, or Other',
      'any.required': 'Gender is required'
    }),
  phone: Joi.string()
    .required()
    .custom((value, helpers) => {
      // Remove all non-digits to count only digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) {
        return helpers.error('string.phoneMin');
      }
      if (cleaned.length > 15) {
        return helpers.error('string.phoneMax');
      }
      return value;
    })
    .pattern(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.phoneMin': 'Phone number must be at least 8 digits',
      'string.phoneMax': 'Phone number must not exceed 15 digits',
      'any.required': 'Phone number is required'
    }),
  email: Joi.string()
    .email()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email must not exceed 255 characters'
    }),
  address: Joi.string()
    .max(500)
    .required()
    .messages({
      'string.max': 'Address must not exceed 500 characters',
      'any.required': 'Address is required'
    }),
  postcode: Joi.string()
    .max(10)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Postcode must not exceed 10 characters'
    }),
  city: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'City must not exceed 100 characters'
    }),
  state: Joi.string()
    .max(10)
    .optional()
    .allow('')
    .messages({
      'string.max': 'State must not exceed 10 characters'
    }),
  referringDepartment: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Referring department must not exceed 255 characters'
    }),
  referralDate: Joi.date()
    .max('now')
    .optional()
    .allow('')
    .messages({
      'date.max': 'Referral date cannot be in the future'
    }),
  initialPSA: Joi.number()
    .min(0)
    .max(999.99)
    .precision(2)
    .optional()
    .allow('')
    .messages({
      'number.min': 'PSA level cannot be negative',
      'number.max': 'PSA level cannot exceed 999.99',
      'number.precision': 'PSA level can have at most 2 decimal places'
    }),
  initialPSADate: Joi.date()
    .max('now')
    .required()
    .messages({
      'date.max': 'PSA test date cannot be in the future',
      'any.required': 'PSA test date is required'
    }),
  medicalHistory: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Medical history must not exceed 2000 characters'
    }),
  currentMedications: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Current medications must not exceed 2000 characters'
    }),
  allergies: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Allergies must not exceed 1000 characters'
    }),
  assignedUrologist: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Assigned urologist must not exceed 255 characters'
    }),
  emergencyContactName: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Emergency contact name must not exceed 100 characters'
    }),
  emergencyContactPhone: Joi.string()
    .optional()
    .allow('')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return value; // Allow empty for optional field
      // Remove all non-digits to count only digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) {
        return helpers.error('string.emergencyPhoneMin');
      }
      if (cleaned.length > 15) {
        return helpers.error('string.emergencyPhoneMax');
      }
      return value;
    })
    .pattern(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid emergency contact phone number',
      'string.emergencyPhoneMin': 'Emergency contact phone number must be at least 8 digits',
      'string.emergencyPhoneMax': 'Emergency contact phone number must not exceed 15 digits'
    }),
  emergencyContactRelationship: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Emergency contact relationship must not exceed 50 characters'
    }),
  priority: Joi.string()
    .valid('Low', 'Normal', 'High', 'Urgent')
    .default('Normal')
    .messages({
      'any.only': 'Priority must be Low, Normal, High, or Urgent'
    }),
  notes: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes must not exceed 2000 characters'
    })
}).custom((value, helpers) => {
  // Ensure at least one of dateOfBirth or age is provided
  const hasDateOfBirth = value.dateOfBirth && value.dateOfBirth !== '';
  const hasAge = value.age !== undefined && value.age !== null && value.age !== '';
  
  if (!hasDateOfBirth && !hasAge) {
    return helpers.error('any.custom', {
      message: 'Either date of birth or age must be provided'
    });
  }
  
  return value;
}, 'Either date of birth or age is required');

// Update patient validation schema (all fields optional)
export const updatePatientSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      'string.min': 'First name must be at least 2 characters long',
      'string.max': 'First name must not exceed 100 characters',
      'string.pattern.base': 'First name can only contain letters and spaces'
    }),
  lastName: Joi.string()
    .max(100)
    .pattern(/^[a-zA-Z\s]+$/)
    .optional()
    .messages({
      'string.max': 'Last name must not exceed 100 characters',
      'string.pattern.base': 'Last name can only contain letters and spaces'
    }),
  dateOfBirth: Joi.date()
    .max('now')
    .optional()
    .allow('')
    .messages({
      'date.max': 'Date of birth cannot be in the future'
    }),
  age: Joi.number()
    .integer()
    .min(0)
    .max(120)
    .optional()
    .allow('')
    .messages({
      'number.base': 'Age must be a valid number',
      'number.integer': 'Age must be a whole number',
      'number.min': 'Age must be at least 0',
      'number.max': 'Age must not exceed 120'
    }),
  gender: Joi.string()
    .valid('Male', 'Female', 'Other')
    .optional()
    .messages({
      'any.only': 'Gender must be Male, Female, or Other'
    }),
  phone: Joi.string()
    .optional()
    .allow('')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return value; // Allow empty for optional field
      // Remove all non-digits to count only digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) {
        return helpers.error('string.phoneMin');
      }
      if (cleaned.length > 15) {
        return helpers.error('string.phoneMax');
      }
      return value;
    })
    .pattern(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.phoneMin': 'Phone number must be at least 8 digits',
      'string.phoneMax': 'Phone number must not exceed 15 digits'
    }),
  email: Joi.string()
    .email()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email must not exceed 255 characters'
    }),
  address: Joi.string()
    .max(500)
    .required()
    .messages({
      'string.max': 'Address must not exceed 500 characters',
      'any.required': 'Address is required'
    }),
  postcode: Joi.string()
    .max(10)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Postcode must not exceed 10 characters'
    }),
  city: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'City must not exceed 100 characters'
    }),
  state: Joi.string()
    .max(10)
    .optional()
    .allow('')
    .messages({
      'string.max': 'State must not exceed 10 characters'
    }),
  referringDepartment: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Referring department must not exceed 255 characters'
    }),
  referralDate: Joi.date()
    .max('now')
    .optional()
    .allow('')
    .messages({
      'date.max': 'Referral date cannot be in the future'
    }),
  initialPSA: Joi.number()
    .min(0)
    .max(999.99)
    .precision(2)
    .optional()
    .allow('')
    .messages({
      'number.min': 'PSA level cannot be negative',
      'number.max': 'PSA level cannot exceed 999.99',
      'number.precision': 'PSA level can have at most 2 decimal places'
    }),
  initialPSADate: Joi.date()
    .max('now')
    .optional()
    .allow('')
    .messages({
      'date.max': 'PSA test date cannot be in the future'
    }),
  medicalHistory: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Medical history must not exceed 2000 characters'
    }),
  currentMedications: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Current medications must not exceed 2000 characters'
    }),
  allergies: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Allergies must not exceed 1000 characters'
    }),
  assignedUrologist: Joi.string()
    .max(255)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Assigned urologist must not exceed 255 characters'
    }),
  emergencyContactName: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Emergency contact name must not exceed 100 characters'
    }),
  emergencyContactPhone: Joi.string()
    .optional()
    .allow('')
    .custom((value, helpers) => {
      if (!value || value.trim() === '') return value; // Allow empty for optional field
      // Remove all non-digits to count only digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) {
        return helpers.error('string.emergencyPhoneMin');
      }
      if (cleaned.length > 15) {
        return helpers.error('string.emergencyPhoneMax');
      }
      return value;
    })
    .pattern(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .messages({
      'string.pattern.base': 'Please provide a valid emergency contact phone number',
      'string.emergencyPhoneMin': 'Emergency contact phone number must be at least 8 digits',
      'string.emergencyPhoneMax': 'Emergency contact phone number must not exceed 15 digits'
    }),
  emergencyContactRelationship: Joi.string()
    .max(50)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Emergency contact relationship must not exceed 50 characters'
    }),
  priority: Joi.string()
    .valid('Low', 'Normal', 'High', 'Urgent')
    .optional()
    .messages({
      'any.only': 'Priority must be Low, Normal, High, or Urgent'
    }),
  notes: Joi.string()
    .max(2000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes must not exceed 2000 characters'
    }),
  status: Joi.string()
    .valid('Active', 'Inactive', 'Discharged', 'Expired')
    .optional()
    .messages({
      'any.only': 'Status must be Active, Inactive, Discharged, or Expired'
    })
});

// Validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path[0],
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    req.body = value;
    next();
  };
};
