import DOMPurify from 'isomorphic-dompurify';
import { body, validationResult } from 'express-validator';

// HTML sanitization middleware for patient data
export const sanitizePatientInput = (req, res, next) => {
  if (req.body) {
    // Sanitize all patient string fields
    const stringFields = [
      'firstName', 'lastName', 'email', 'phone', 'address', 'postcode', 'city', 'state',
      'referringDepartment', 'medicalHistory', 'currentMedications', 'allergies', 
      'assignedUrologist', 'emergencyContactName', 'emergencyContactPhone', 
      'emergencyContactRelationship', 'notes', 'dreFindings', 'gleasonScore'
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

// Comprehensive input validation for patient data
export const validatePatientInput = [
  sanitizePatientInput,
  
  // Personal Information
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces')
    .escape(),
    
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must not exceed 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces')
    .escape(),
    
  body('dateOfBirth')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      if (value) {
        const birthDate = new Date(value);
        const today = new Date();
        if (birthDate > today) {
          throw new Error('Date of birth cannot be in the future');
        }
      }
      return true;
    }),
    
  body('age')
    .optional({ checkFalsy: true })
    .isInt({ min: 0, max: 120 })
    .withMessage('Age must be a whole number between 0 and 120'),
    
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((value) => {
      // Remove all non-digits to count only digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) {
        throw new Error('Phone number must be at least 8 digits');
      }
      if (cleaned.length > 12) {
        throw new Error('Phone number must not exceed 12 digits');
      }
      return true;
    })
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .withMessage('Please provide a valid phone number')
    .escape(),
    
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
    
  // Address Information
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters')
    .escape(),
    
  body('postcode')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Postcode must not exceed 10 characters')
    .escape(),
    
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters')
    .escape(),
    
  body('state')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('State must not exceed 10 characters')
    .escape(),
    
  // Medical Information
  body('referringDepartment')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Referring department must not exceed 255 characters')
    .escape(),
    
  body('referralDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Referral date must be a valid date')
    .custom((value) => {
      if (value) {
        const refDate = new Date(value);
        const today = new Date();
        if (refDate > today) {
          throw new Error('Referral date cannot be in the future');
        }
      }
      return true;
    }),
    
  body('initialPSA')
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('Initial PSA must be between 0 and 999.99')
    .custom((value) => {
      if (value && value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('PSA level can have at most 2 decimal places');
      }
      return true;
    }),
    
  body('initialPSADate')
    .notEmpty()
    .withMessage('PSA test date is required')
    .isISO8601()
    .withMessage('PSA test date must be a valid date')
    .custom((value) => {
      if (value) {
        const psaDate = new Date(value);
        const today = new Date();
        if (psaDate > today) {
          throw new Error('PSA test date cannot be in the future');
        }
      }
      return true;
    }),
    
  body('medicalHistory')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Medical history must not exceed 2000 characters')
    .escape(),
    
  body('currentMedications')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Current medications must not exceed 2000 characters')
    .escape(),
    
  body('allergies')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Allergies must not exceed 1000 characters')
    .escape(),
    
  body('assignedUrologist')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Assigned urologist must not exceed 255 characters')
    .escape(),
    
  // Emergency Contact
  body('emergencyContactName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name must not exceed 100 characters')
    .escape(),
    
  body('emergencyContactPhone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty for optional field
      // Remove all non-digits to count only digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) {
        throw new Error('Emergency contact phone number must be at least 8 digits');
      }
      if (cleaned.length > 12) {
        throw new Error('Emergency contact phone number must not exceed 12 digits');
      }
      return true;
    })
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .withMessage('Please provide a valid emergency contact phone number')
    .escape(),
    
  body('emergencyContactRelationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Emergency contact relationship must not exceed 50 characters')
    .escape(),
    
  // Assessment
  body('priority')
    .optional()
    .isIn(['Low', 'Normal', 'High', 'Urgent'])
    .withMessage('Priority must be Low, Normal, High, or Urgent'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must not exceed 2000 characters')
    .escape(),
  
  // Triage Symptoms validation
  body('triageSymptoms')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty/null
      
      // If it's a string, try to parse it as JSON
      let parsed;
      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value);
        } catch (e) {
          throw new Error('triageSymptoms must be valid JSON');
        }
      } else {
        parsed = value;
      }
      
      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('triageSymptoms must be an array');
      }
      
      // Validate each symptom object structure
      for (const symptom of parsed) {
        if (!symptom.name || typeof symptom.name !== 'string') {
          throw new Error('Each symptom must have a name');
        }
        if (!symptom.duration || typeof symptom.duration !== 'string') {
          throw new Error('Each symptom must have a duration');
        }
        if (!symptom.durationUnit || typeof symptom.durationUnit !== 'string') {
          throw new Error('Each symptom must have a durationUnit');
        }
        // IPSS score is required for LUTS and Nocturia
        if ((symptom.name === 'LUTS' || symptom.name === 'Nocturia') && !symptom.ipssScore) {
          throw new Error(`IPSS score is required for ${symptom.name}`);
        }
        // Frequency is optional but can be included for Nocturia
        if (symptom.frequency !== undefined && symptom.frequency !== null && typeof symptom.frequency !== 'string') {
          throw new Error('Frequency must be a string if provided');
        }
        // Notes is optional and can be included for all symptoms
        if (symptom.notes !== undefined && symptom.notes !== null && typeof symptom.notes !== 'string') {
          throw new Error('Notes must be a string if provided');
        }
      }
      
      return true;
    }),
  
  // Exam & Prior Tests validation
  body('dreDone')
    .optional()
    .isBoolean()
    .withMessage('dreDone must be a boolean'),
    
  body('dreFindings')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty/null
      if (typeof value !== 'string') {
        throw new Error('dreFindings must be a string');
      }
      // Validate length (comma-separated values like "Normal, Enlarged, Nodule, Suspicious")
      if (value.length > 255) {
        throw new Error('dreFindings must not exceed 255 characters');
      }
      // Validate that it contains only valid findings
      const validFindings = ['Normal', 'Enlarged', 'Nodule', 'Suspicious'];
      const findings = value.split(',').map(f => f.trim()).filter(f => f);
      for (const finding of findings) {
        if (!validFindings.includes(finding)) {
          throw new Error(`Invalid DRE finding: ${finding}. Valid values are: ${validFindings.join(', ')}`);
        }
      }
      return true;
    }),
    
  body('priorBiopsy')
    .optional()
    .isIn(['no', 'yes'])
    .withMessage('priorBiopsy must be either "no" or "yes"'),
    
  body('priorBiopsyDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Prior biopsy date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.priorBiopsy === 'yes') {
        const biopsyDate = new Date(value);
        const today = new Date();
        if (biopsyDate > today) {
          throw new Error('Prior biopsy date cannot be in the future');
        }
      }
      return true;
    }),
    
  body('gleasonScore')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Gleason score must not exceed 20 characters')
    .escape(),
    
  body('comorbidities')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty/null
      
      // If it's a string, try to parse it as JSON
      let parsed;
      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value);
        } catch (e) {
          throw new Error('comorbidities must be valid JSON');
        }
      } else {
        parsed = value;
      }
      
      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('comorbidities must be an array');
      }
      
      // Validate each comorbidity is a string
      for (const comorbidity of parsed) {
        if (typeof comorbidity !== 'string') {
          throw new Error('Each comorbidity must be a string');
        }
      }
      
      return true;
    }),
    
  // Custom validation: at least one of dateOfBirth or age must be provided
  body('dateOfBirth').custom((value, { req }) => {
    const hasDateOfBirth = value && value.trim() !== '';
    const hasAge = req.body.age !== undefined && req.body.age !== null && req.body.age !== '';
    
    if (!hasDateOfBirth && !hasAge) {
      throw new Error('Either date of birth or age must be provided');
    }
    return true;
  }),
  
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

// Update patient validation (all fields optional)
export const validatePatientUpdateInput = [
  sanitizePatientInput,
  
  // Personal Information (optional for updates)
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces')
    .escape(),
    
  body('lastName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name must not exceed 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces')
    .escape(),
    
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Date of birth must be a valid date')
    .custom((value) => {
      if (value) {
        const birthDate = new Date(value);
        const today = new Date();
        if (birthDate > today) {
          throw new Error('Date of birth cannot be in the future');
        }
      }
      return true;
    }),
    
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty for optional field
      // Remove all non-digits to count only digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) {
        throw new Error('Phone number must be at least 8 digits');
      }
      if (cleaned.length > 12) {
        throw new Error('Phone number must not exceed 12 digits');
      }
      return true;
    })
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .withMessage('Please provide a valid phone number')
    .escape(),
    
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
    
  // Address Information (optional for updates)
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters')
    .escape(),
    
  body('postcode')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Postcode must not exceed 10 characters')
    .escape(),
    
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters')
    .escape(),
    
  body('state')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('State must not exceed 10 characters')
    .escape(),
    
  // Medical Information (optional for updates)
  body('referringDepartment')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Referring department must not exceed 255 characters')
    .escape(),
    
  body('referralDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Referral date must be a valid date')
    .custom((value) => {
      if (value) {
        const refDate = new Date(value);
        const today = new Date();
        if (refDate > today) {
          throw new Error('Referral date cannot be in the future');
        }
      }
      return true;
    }),
    
  body('initialPSA')
    .optional()
    .isFloat({ min: 0, max: 999.99 })
    .withMessage('Initial PSA must be between 0 and 999.99')
    .custom((value) => {
      if (value && value.toString().split('.')[1] && value.toString().split('.')[1].length > 2) {
        throw new Error('PSA level can have at most 2 decimal places');
      }
      return true;
    }),
    
  body('initialPSADate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('PSA test date must be a valid date')
    .custom((value) => {
      if (value) {
        const psaDate = new Date(value);
        const today = new Date();
        if (psaDate > today) {
          throw new Error('PSA test date cannot be in the future');
        }
      }
      return true;
    }),
    
  body('medicalHistory')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Medical history must not exceed 2000 characters')
    .escape(),
    
  body('currentMedications')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Current medications must not exceed 2000 characters')
    .escape(),
    
  body('allergies')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Allergies must not exceed 1000 characters')
    .escape(),
    
  body('assignedUrologist')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Assigned urologist must not exceed 255 characters')
    .escape(),
    
  // Emergency Contact (optional for updates)
  body('emergencyContactName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name must not exceed 100 characters')
    .escape(),
    
  body('emergencyContactPhone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value || value.trim() === '') return true; // Allow empty for optional field
      // Remove all non-digits to count only digits
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 8) {
        throw new Error('Emergency contact phone number must be at least 8 digits');
      }
      if (cleaned.length > 12) {
        throw new Error('Emergency contact phone number must not exceed 12 digits');
      }
      return true;
    })
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .withMessage('Please provide a valid emergency contact phone number')
    .escape(),
    
  body('emergencyContactRelationship')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Emergency contact relationship must not exceed 50 characters')
    .escape(),
    
  // Assessment (optional for updates)
  body('priority')
    .optional()
    .isIn(['Low', 'Normal', 'High', 'Urgent'])
    .withMessage('Priority must be Low, Normal, High, or Urgent'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must not exceed 2000 characters')
    .escape(),
    
  body('status')
    .optional()
    .isIn(['Active', 'Inactive', 'Discharged', 'Expired'])
    .withMessage('Status must be Active, Inactive, Discharged, or Expired'),
  
  // Triage Symptoms validation (optional for updates)
  body('triageSymptoms')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty/null
      
      // If it's a string, try to parse it as JSON
      let parsed;
      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value);
        } catch (e) {
          throw new Error('triageSymptoms must be valid JSON');
        }
      } else {
        parsed = value;
      }
      
      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('triageSymptoms must be an array');
      }
      
      // Validate each symptom object structure
      for (const symptom of parsed) {
        if (!symptom.name || typeof symptom.name !== 'string') {
          throw new Error('Each symptom must have a name');
        }
        if (!symptom.duration || typeof symptom.duration !== 'string') {
          throw new Error('Each symptom must have a duration');
        }
        if (!symptom.durationUnit || typeof symptom.durationUnit !== 'string') {
          throw new Error('Each symptom must have a durationUnit');
        }
        // IPSS score is required for LUTS and Nocturia
        if ((symptom.name === 'LUTS' || symptom.name === 'Nocturia') && !symptom.ipssScore) {
          throw new Error(`IPSS score is required for ${symptom.name}`);
        }
        // Frequency is optional but can be included for Nocturia
        if (symptom.frequency !== undefined && symptom.frequency !== null && typeof symptom.frequency !== 'string') {
          throw new Error('Frequency must be a string if provided');
        }
        // Notes is optional and can be included for all symptoms
        if (symptom.notes !== undefined && symptom.notes !== null && typeof symptom.notes !== 'string') {
          throw new Error('Notes must be a string if provided');
        }
      }
      
      return true;
    }),
  
  // Exam & Prior Tests validation (optional for updates)
  body('dreDone')
    .optional()
    .isBoolean()
    .withMessage('dreDone must be a boolean'),
    
  body('dreFindings')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty/null
      if (typeof value !== 'string') {
        throw new Error('dreFindings must be a string');
      }
      // Validate length (comma-separated values like "Normal, Enlarged, Nodule, Suspicious")
      if (value.length > 255) {
        throw new Error('dreFindings must not exceed 255 characters');
      }
      // Validate that it contains only valid findings
      const validFindings = ['Normal', 'Enlarged', 'Nodule', 'Suspicious'];
      const findings = value.split(',').map(f => f.trim()).filter(f => f);
      for (const finding of findings) {
        if (!validFindings.includes(finding)) {
          throw new Error(`Invalid DRE finding: ${finding}. Valid values are: ${validFindings.join(', ')}`);
        }
      }
      return true;
    }),
    
  body('priorBiopsy')
    .optional()
    .isIn(['no', 'yes'])
    .withMessage('priorBiopsy must be either "no" or "yes"'),
    
  body('priorBiopsyDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Prior biopsy date must be a valid date')
    .custom((value, { req }) => {
      if (value && req.body.priorBiopsy === 'yes') {
        const biopsyDate = new Date(value);
        const today = new Date();
        if (biopsyDate > today) {
          throw new Error('Prior biopsy date cannot be in the future');
        }
      }
      return true;
    }),
    
  body('gleasonScore')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Gleason score must not exceed 20 characters')
    .escape(),
    
  body('comorbidities')
    .optional()
    .custom((value) => {
      if (!value || value === '') return true; // Allow empty/null
      
      // If it's a string, try to parse it as JSON
      let parsed;
      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value);
        } catch (e) {
          throw new Error('comorbidities must be valid JSON');
        }
      } else {
        parsed = value;
      }
      
      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('comorbidities must be an array');
      }
      
      // Validate each comorbidity is a string
      for (const comorbidity of parsed) {
        if (typeof comorbidity !== 'string') {
          throw new Error('Each comorbidity must be a string');
        }
      }
      
      return true;
    }),
    
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


