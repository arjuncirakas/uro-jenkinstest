import DOMPurify from 'isomorphic-dompurify';
import { body, validationResult } from 'express-validator';

// ============================================
// SHARED VALIDATION CONSTANTS
// ============================================
const PHONE_PATTERN = /^\+?[1-9][\d\s().-]{0,15}$/;
const NAME_PATTERN = /^[a-zA-Z\s]+$/;
const VALID_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const VALID_STATUSES = ['Active', 'Inactive', 'Discharged', 'Expired'];
const VALID_DRE_FINDINGS = ['Normal', 'Enlarged', 'Nodule', 'Suspicious'];
const VALID_BIOPSY_OPTIONS = ['no', 'yes'];

// ============================================
// SHARED VALIDATION HELPERS 
// ============================================

/** Validate phone number digits */
export const validatePhoneDigits = (value, isOptional = false) => {
  if ((!value || value.trim() === '') && isOptional) return true;
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 8) throw new Error('Phone number must be at least 8 digits');
  if (cleaned.length > 12) throw new Error('Phone number must not exceed 12 digits');
  return true;
};

/** Validate date not in future */
export const validateNotFutureDate = (value, errorPrefix = 'Date') => {
  if (value) {
    const date = new Date(value);
    if (date > new Date()) throw new Error(`${errorPrefix} cannot be in the future`);
  }
  return true;
};

/** Parse and validate JSON array field */
export const validateJsonArray = (value, fieldName, itemValidator) => {
  if (!value || value === '') return true;
  let parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(parsed)) throw new Error(`${fieldName} must be an array`);
  if (itemValidator) parsed.forEach(item => itemValidator(item));
  return true;
};

/** Validate triage symptom object */
export const validateTriageSymptom = (symptom) => {
  if (!symptom.name || typeof symptom.name !== 'string') {
    throw new Error('Each symptom must have a name');
  }
  if (!symptom.duration || typeof symptom.duration !== 'string') {
    throw new Error('Each symptom must have a duration');
  }
  if (!symptom.durationUnit || typeof symptom.durationUnit !== 'string') {
    throw new Error('Each symptom must have a durationUnit');
  }
  if ((symptom.name === 'LUTS' || symptom.name === 'Nocturia') && !symptom.ipssScore) {
    throw new Error(`IPSS score is required for ${symptom.name}`);
  }
  if (symptom.frequency !== undefined && symptom.frequency !== null && typeof symptom.frequency !== 'string') {
    throw new Error('Frequency must be a string if provided');
  }
  if (symptom.notes !== undefined && symptom.notes !== null && typeof symptom.notes !== 'string') {
    throw new Error('Notes must be a string if provided');
  }
};

/** Validate DRE findings */
export const validateDreFindings = (value) => {
  if (!value || value === '') return true;
  if (typeof value !== 'string') throw new Error('dreFindings must be a string');
  if (value.length > 255) throw new Error('dreFindings must not exceed 255 characters');
  const findings = value.split(',').map(f => f.trim()).filter(f => f);
  for (const finding of findings) {
    if (!VALID_DRE_FINDINGS.includes(finding)) {
      throw new Error(`Invalid DRE finding: ${finding}. Valid values are: ${VALID_DRE_FINDINGS.join(', ')}`);
    }
  }
  return true;
};

// ============================================
// FIELD BUILDER FUNCTIONS
// ============================================

/** Build name field validator */
const nameField = (fieldName, label, isRequired = true, minLength = 2, maxLength = 100) => {
  let validator = body(fieldName).optional(!isRequired).trim();
  if (isRequired) validator = body(fieldName).trim();
  return validator
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`${label} must be between ${minLength} and ${maxLength} characters`)
    .matches(NAME_PATTERN)
    .withMessage(`${label} can only contain letters and spaces`)
    .escape();
};

/** Build text field validator */
const textField = (fieldName, label, maxLength, isRequired = false) => {
  let validator = body(fieldName).optional().trim();
  if (isRequired) {
    validator = body(fieldName).trim().notEmpty().withMessage(`${label} is required`);
  }
  return validator.isLength({ max: maxLength }).withMessage(`${label} must not exceed ${maxLength} characters`).escape();
};

/** Build date field validator */
const dateField = (fieldName, label, isRequired = false, checkFuture = true) => {
  let validator = body(fieldName).optional({ checkFalsy: true });
  if (isRequired) {
    validator = body(fieldName).notEmpty().withMessage(`${label} is required`);
  }
  validator = validator.isISO8601().withMessage(`${label} must be a valid date`);
  if (checkFuture) {
    validator = validator.custom((value) => validateNotFutureDate(value, label));
  }
  return validator;
};

/** Build phone field validator */
const phoneField = (fieldName, label, isRequired = false) => {
  let validator = body(fieldName).optional().trim();
  if (isRequired) {
    validator = body(fieldName).trim().notEmpty().withMessage(`${label} is required`);
  }
  return validator
    .custom((value) => validatePhoneDigits(value, !isRequired))
    .matches(PHONE_PATTERN)
    .withMessage(`Please provide a valid ${label.toLowerCase()}`)
    .escape();
};

/** Build enum field validator */
const enumField = (fieldName, label, validValues, isRequired = false) => {
  let validator = body(fieldName).optional();
  if (isRequired) {
    validator = body(fieldName);
  }
  return validator.isIn(validValues).withMessage(`${label} must be ${validValues.join(', ')}`);
};

// ============================================
// HTML SANITIZATION MIDDLEWARE
// ============================================
export const sanitizePatientInput = (req, res, next) => {
  if (req.body) {
    const stringFields = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'postcode', 'city', 'state',
      'referringDepartment', 'medicalHistory', 'currentMedications', 'allergies',
      'assignedUrologist', 'emergencyContactName', 'emergencyContactPhone',
      'emergencyContactRelationship', 'notes', 'dreFindings', 'gleasonScore'
    ];
    stringFields.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = DOMPurify.sanitize(req.body[field].trim());
      }
    });
  }
  next();
};

// ============================================
// VALIDATION ERROR HANDLER
// ============================================
const handleValidationErrors = (req, res, next) => {
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
};

// ============================================
// SHARED FIELD DEFINITIONS
// ============================================
const personalInfoFields = (isRequired = true) => [
  isRequired
    ? body('firstName').trim().isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters').matches(NAME_PATTERN).withMessage('First name can only contain letters and spaces').escape()
    : body('firstName').optional().trim().isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters').matches(NAME_PATTERN).withMessage('First name can only contain letters and spaces').escape(),
  body('lastName').optional(!isRequired).trim().isLength({ max: 100 }).withMessage('Last name must not exceed 100 characters').matches(NAME_PATTERN).withMessage('Last name can only contain letters and spaces').escape(),
  dateField('dateOfBirth', 'Date of birth'),
  body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }).withMessage('Age must be a whole number between 0 and 120'),
  phoneField('phone', 'Phone number', isRequired),
  body('email').optional().trim().isEmail().withMessage('Please provide a valid email address').normalizeEmail().isLength({ max: 255 }).withMessage('Email must not exceed 255 characters'),
];

const addressFields = (isRequired = true) => [
  isRequired
    ? textField('address', 'Address', 500, true)
    : textField('address', 'Address', 500, false),
  textField('postcode', 'Postcode', 10),
  textField('city', 'City', 100),
  textField('state', 'State', 10),
];

const medicalFields = () => [
  textField('referringDepartment', 'Referring department', 255),
  dateField('referralDate', 'Referral date'),
  body('initialPSA').isFloat({ min: 0, max: 999.99 }).withMessage('Initial PSA must be between 0 and 999.99').custom((value) => {
    if (value && value.toString().split('.')[1]?.length > 2) throw new Error('PSA level can have at most 2 decimal places');
    return true;
  }),
  dateField('initialPSADate', 'PSA test date', true),
  textField('medicalHistory', 'Medical history', 2000),
  textField('currentMedications', 'Current medications', 2000),
  textField('allergies', 'Allergies', 1000),
  textField('assignedUrologist', 'Assigned urologist', 255),
];

const medicalFieldsForUpdate = () => [
  textField('referringDepartment', 'Referring department', 255),
  dateField('referralDate', 'Referral date'),
  body('initialPSA').optional().isFloat({ min: 0, max: 999.99 }).withMessage('Initial PSA must be between 0 and 999.99').custom((value) => {
    if (value && value.toString().split('.')[1]?.length > 2) throw new Error('PSA level can have at most 2 decimal places');
    return true;
  }),
  dateField('initialPSADate', 'PSA test date'),
  textField('medicalHistory', 'Medical history', 2000),
  textField('currentMedications', 'Current medications', 2000),
  textField('allergies', 'Allergies', 1000),
  textField('assignedUrologist', 'Assigned urologist', 255),
];

const emergencyContactFields = () => [
  textField('emergencyContactName', 'Emergency contact name', 255),
  phoneField('emergencyContactPhone', 'Emergency contact phone'),
  textField('emergencyContactRelationship', 'Emergency contact relationship', 50),
];

const assessmentFields = (includeStatus = false) => {
  const fields = [
    enumField('priority', 'Priority', VALID_PRIORITIES),
    textField('notes', 'Notes', 2000),
  ];
  if (includeStatus) {
    fields.push(enumField('status', 'Status', VALID_STATUSES));
  }
  return fields;
};

const triageSymptomsField = () => body('triageSymptoms').optional().custom((value) => {
  try {
    return validateJsonArray(value, 'triageSymptoms', validateTriageSymptom);
  } catch (e) {
    throw new Error(e.message);
  }
});

const examFields = () => [
  body('dreDone').optional().isBoolean().withMessage('dreDone must be a boolean'),
  body('dreFindings').optional().custom(validateDreFindings),
  enumField('priorBiopsy', 'priorBiopsy', VALID_BIOPSY_OPTIONS),
  body('priorBiopsyDate').optional({ checkFalsy: true }).isISO8601().withMessage('Prior biopsy date must be a valid date').custom((value, { req }) => {
    if (value && req.body.priorBiopsy === 'yes') {
      return validateNotFutureDate(value, 'Prior biopsy date');
    }
    return true;
  }),
  textField('gleasonScore', 'Gleason score', 20),
  body('comorbidities').optional().custom((value) => {
    try {
      return validateJsonArray(value, 'comorbidities', (item) => {
        if (typeof item !== 'string') throw new Error('Each comorbidity must be a string');
      });
    } catch (e) {
      throw new Error(e.message);
    }
  }),
];

// At least one of dateOfBirth or age required
const dobOrAgeValidator = () => body('dateOfBirth').custom((value, { req }) => {
  const hasDateOfBirth = value && value.trim() !== '';
  const hasAge = req.body.age !== undefined && req.body.age !== null && req.body.age !== '';
  if (!hasDateOfBirth && !hasAge) throw new Error('Either date of birth or age must be provided');
  return true;
});

// ============================================
// MAIN VALIDATION ARRAYS
// ============================================
export const validatePatientInput = [
  sanitizePatientInput,
  ...personalInfoFields(true),
  ...addressFields(true),
  ...medicalFields(),
  ...emergencyContactFields(),
  ...assessmentFields(false),
  triageSymptomsField(),
  ...examFields(),
  dobOrAgeValidator(),
  handleValidationErrors
];

export const validatePatientUpdateInput = [
  sanitizePatientInput,
  ...personalInfoFields(false),
  ...addressFields(false),
  ...medicalFieldsForUpdate(),
  ...emergencyContactFields(),
  ...assessmentFields(true),
  triageSymptomsField(),
  ...examFields(),
  handleValidationErrors
];
