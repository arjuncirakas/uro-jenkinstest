import Joi from 'joi';

// ============================================
// SHARED VALIDATION PATTERNS
// ============================================
const PATTERNS = {
  NAME: /^[a-zA-Z\s]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  PHONE: /^\+?[1-9]\d{0,15}$/,
  PHONE_WITH_FORMATTERS: /^\+?[1-9][\d\s().-]{0,15}$/,
  OTP: /^\d{6}$/
};

const VALID_VALUES = {
  ROLES: ['urologist', 'gp', 'urology_nurse', 'doctor', 'department_admin'],
  OTP_TYPES: ['registration', 'login', 'password_reset'],
  PRIORITIES: ['Low', 'Normal', 'High', 'Urgent'],
  STATUSES: ['Active', 'Inactive', 'Discharged', 'Expired']
};

// ============================================
// REUSABLE FIELD BUILDERS
// ============================================

// Name field builder
const nameField = (label, minLen = 2, maxLen = 50, required = true) => {
  let field = Joi.string()
    .min(minLen)
    .max(maxLen)
    .pattern(PATTERNS.NAME)
    .messages({
      'string.min': `${label} must be at least ${minLen} characters long`,
      'string.max': `${label} must not exceed ${maxLen} characters`,
      'string.pattern.base': `${label} can only contain letters and spaces`,
      'any.required': `${label} is required`
    });
  return required ? field.required() : field.optional();
};

// Email field builder
const emailField = (required = true, maxLen = 255) => {
  let field = Joi.string()
    .email()
    .max(maxLen)
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': `Email must not exceed ${maxLen} characters`,
      'any.required': 'Email is required'
    });
  return required ? field.required() : field.optional().allow('');
};

// Phone field builder with custom validation
const phoneField = (required = true, labelPrefix = '') => {
  const prefix = labelPrefix ? `${labelPrefix} ` : '';
  let field = Joi.string()
    .custom((value, helpers) => {
      if ((!value || value.trim() === '') && !required) return value;
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) return helpers.error('string.phoneMin');
      if (cleaned.length > 15) return helpers.error('string.phoneMax');
      return value;
    })
    .pattern(PATTERNS.PHONE_WITH_FORMATTERS)
    .messages({
      'string.pattern.base': `Please provide a valid ${prefix}phone number`,
      'string.phoneMin': `${prefix}Phone number must be at least 8 digits`,
      'string.phoneMax': `${prefix}Phone number must not exceed 15 digits`,
      'any.required': `${prefix}Phone number is required`
    });
  return required ? field.required() : field.optional().allow('');
};

// Text field builder
const textField = (label, maxLen, required = false) => {
  let field = Joi.string()
    .max(maxLen)
    .messages({
      'string.max': `${label} must not exceed ${maxLen} characters`,
      'any.required': `${label} is required`
    });
  return required ? field.required() : field.optional().allow('');
};

// Date field builder
const dateField = (label, required = false) => {
  let field = Joi.date()
    .max('now')
    .messages({
      'date.max': `${label} cannot be in the future`,
      'any.required': `${label} is required`
    });
  return required ? field.required() : field.optional().allow('');
};

// Number field builder
const numberField = (label, { min, max, precision, integer = false, required = false }) => {
  let field = Joi.number();
  if (integer) field = field.integer();
  if (min !== undefined) field = field.min(min);
  if (max !== undefined) field = field.max(max);
  if (precision !== undefined) field = field.precision(precision);

  const msgs = {};
  if (integer) msgs['number.base'] = `${label} must be a valid number`;
  if (integer) msgs['number.integer'] = `${label} must be a whole number`;
  if (min !== undefined) msgs['number.min'] = `${label} must be at least ${min}`;
  if (max !== undefined) msgs['number.max'] = `${label} must not exceed ${max}`;
  if (precision !== undefined) msgs['number.precision'] = `${label} can have at most ${precision} decimal places`;

  field = field.messages(msgs);
  return required ? field.required() : field.optional().allow('');
};

// Enum field builder
const enumField = (label, validValues, required = false, defaultValue = undefined) => {
  let field = Joi.string()
    .valid(...validValues)
    .messages({
      'any.only': `${label} must be ${validValues.join(', ')}`
    });
  if (defaultValue) field = field.default(defaultValue);
  return required ? field.required() : field.optional();
};

// Password field
const passwordField = () => Joi.string()
  .min(14)
  .pattern(PATTERNS.PASSWORD)
  .required()
  .messages({
    'string.min': 'Password must be at least 14 characters long',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required'
  });

// ============================================
// AUTH SCHEMAS
// ============================================
export const registerSchema = Joi.object({
  email: emailField(true),
  password: passwordField(),
  firstName: nameField('First name'),
  lastName: nameField('Last name'),
  phone: Joi.string().pattern(PATTERNS.PHONE).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  organization: Joi.string().min(2).max(255).optional().messages({
    'string.min': 'Organization name must be at least 2 characters long',
    'string.max': 'Organization name must not exceed 255 characters'
  }),
  role: Joi.string().valid(...VALID_VALUES.ROLES).required().messages({
    'any.only': `Role must be one of: ${VALID_VALUES.ROLES.join(', ')}`,
    'any.required': 'Role is required'
  })
});

export const loginSchema = Joi.object({
  email: emailField(true),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required'
  })
});

export const otpVerificationSchema = Joi.object({
  email: emailField(true),
  otp: Joi.string().length(6).pattern(PATTERNS.OTP).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only numbers',
    'any.required': 'OTP is required'
  }),
  type: Joi.string().valid(...VALID_VALUES.OTP_TYPES).default('registration').messages({
    'any.only': `Type must be one of: ${VALID_VALUES.OTP_TYPES.join(', ')}`
  })
});

// ============================================
// PATIENT SCHEMAS - Using shared builders
// ============================================
const patientBaseFields = (isCreate = true) => ({
  firstName: nameField('First name', 2, 100, isCreate),
  lastName: nameField('Last name', 2, 100, isCreate).min(0),
  dateOfBirth: dateField('Date of birth'),
  age: numberField('Age', { min: 0, max: 120, integer: true }),
  phone: phoneField(isCreate),
  email: emailField(false),
  address: textField('Address', 500, isCreate),
  postcode: textField('Postcode', 10),
  city: textField('City', 100),
  state: textField('State', 10),
  referringDepartment: textField('Referring department', 255),
  referralDate: dateField('Referral date'),
  initialPSA: numberField('PSA level', { min: 0, max: 999.99, precision: 2 }),
  initialPSADate: dateField('PSA test date', isCreate),
  medicalHistory: textField('Medical history', 2000),
  currentMedications: textField('Current medications', 2000),
  allergies: textField('Allergies', 1000),
  assignedUrologist: textField('Assigned urologist', 255),
  emergencyContactName: textField('Emergency contact name', 255),
  emergencyContactPhone: phoneField(false, 'Emergency contact'),
  emergencyContactRelationship: textField('Emergency contact relationship', 50),
  priority: enumField('Priority', VALID_VALUES.PRIORITIES, false, isCreate ? 'Normal' : undefined),
  notes: textField('Notes', 2000)
});

export const addPatientSchema = Joi.object({
  ...patientBaseFields(true)
}).custom((value, helpers) => {
  const hasDateOfBirth = value.dateOfBirth && value.dateOfBirth !== '';
  const hasAge = value.age !== undefined && value.age !== null && value.age !== '';
  if (!hasDateOfBirth && !hasAge) {
    return helpers.error('any.custom', { message: 'Either date of birth or age must be provided' });
  }
  return value;
}, 'Either date of birth or age is required');

export const updatePatientSchema = Joi.object({
  ...patientBaseFields(false),
  status: enumField('Status', VALID_VALUES.STATUSES)
});

// ============================================
// VALIDATION MIDDLEWARE
// ============================================
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
