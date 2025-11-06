/**
 * Frontend Input Validation Utilities
 * Provides real-time validation for form inputs
 * 
 * Security: Uses DOMPurify for XSS protection
 */
import DOMPurify from 'dompurify';

// Validate name fields (only letters, spaces, hyphens, apostrophes)
export const validateNameInput = (value) => {
  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s'-]*$/;
  return nameRegex.test(value);
};

// Validate phone number (only digits, spaces, hyphens, parentheses, plus sign)
export const validatePhoneInput = (value) => {
  // Allow digits, spaces, hyphens, parentheses, plus sign
  const phoneRegex = /^[0-9\s\-()+ ]*$/;
  return phoneRegex.test(value);
};


export const formatPhoneNumber = (value) => {
  // Remove all non-digit characters
  const cleaned = value.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for 10-digit numbers
  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
  } else if (cleaned.length <= 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else {
    // For numbers longer than 10 digits, just format with spaces
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  }
};

// Validate email format
export const validateEmail = (email) => {
  if (!email) return true; // Allow empty
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate postcode (only digits - no letters allowed)
export const validatePostcode = (value) => {
  const postcodeRegex = /^\d*$/;
  return postcodeRegex.test(value);
};

// Validate PSA value (positive decimal number)
export const validatePSAValue = (value) => {
  if (!value) return true; // Allow empty
  const psaRegex = /^\d*\.?\d*$/;
  return psaRegex.test(value) && parseFloat(value) >= 0;
};

// Validate numeric input (only digits and optional decimal point)
export const validateNumericInput = (value) => {
  const numericRegex = /^\d*\.?\d*$/;
  return numericRegex.test(value);
};

// Validate alphanumeric only (no special characters except spaces)
export const validateAlphanumeric = (value) => {
  const alphanumericRegex = /^[a-zA-Z0-9\s]*$/;
  return alphanumericRegex.test(value);
};

// Validate age (1-120)
export const validateAge = (value) => {
  if (!value) return true;
  const age = parseInt(value);
  return !isNaN(age) && age > 0 && age <= 120;
};

// Validate date (not in future for DOB, not in past for appointments)
export const validateDateOfBirth = (dateString) => {
  if (!dateString) return true;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date <= today;
};

export const validateFutureDate = (dateString) => {
  if (!dateString) return true;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

// Sanitize input to prevent XSS - Using DOMPurify for robust protection
export const sanitizeInput = (value, options = {}) => {
  if (typeof value !== 'string') return value;
  
  const { preserveWhitespace = false } = options;
  
  // Use DOMPurify to remove all HTML tags and dangerous content
  const clean = DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  });
  
  // For textarea fields, preserve whitespace including leading/trailing spaces
  return preserveWhitespace ? clean : clean.trim();
};

// Sanitize HTML content - For cases where some HTML is allowed
export const sanitizeHTML = (html, options = {}) => {
  if (typeof html !== 'string') return html;
  
  const defaultOptions = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    // Security: Block dangerous protocols
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  };
  
  return DOMPurify.sanitize(html, { ...defaultOptions, ...options });
};

// Sanitize for rich text editors
export const sanitizeRichText = (richText) => {
  return DOMPurify.sanitize(richText, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false
  });
};

// Validate required field
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`;
  }
  return '';
};

// Validate phone number format
export const validatePhoneFormat = (phone) => {
  if (!phone) return '';
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it has at least 10 digits
  if (cleaned.length < 10) {
    return 'Phone number must be at least 10 digits';
  }
  
  if (cleaned.length > 15) {
    return 'Phone number is too long';
  }
  
  return '';
};

// Validate email format
export const validateEmailFormat = (email) => {
  if (!email) return '';
  
  if (!validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  
  return '';
};

// Validate name format
export const validateNameFormat = (name, fieldName) => {
  if (!name) return '';
  
  if (name.length < 2) {
    return `${fieldName} must be at least 2 characters`;
  }
  
  if (name.length > 50) {
    return `${fieldName} must be less than 50 characters`;
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, and apostrophes`;
  }
  
  return '';
};

// Validate PSA value format
export const validatePSAFormat = (psa) => {
  if (!psa) return '';
  
  const value = parseFloat(psa);
  if (isNaN(value)) {
    return 'PSA must be a valid number';
  }
  
  if (value < 0) {
    return 'PSA cannot be negative';
  }
  
  if (value > 1000) {
    return 'PSA value seems unusually high. Please verify.';
  }
  
  return '';
};

// Comprehensive form validation
export const validatePatientForm = (formData) => {
  const errors = {};
  
  // Personal Information
  const firstNameError = validateRequired(formData.firstName, 'First name') || 
                        validateNameFormat(formData.firstName, 'First name');
  if (firstNameError) errors.firstName = firstNameError;
  
  const lastNameError = validateRequired(formData.lastName, 'Last name') || 
                       validateNameFormat(formData.lastName, 'Last name');
  if (lastNameError) errors.lastName = lastNameError;
  
  const dobError = validateRequired(formData.dateOfBirth, 'Date of birth');
  if (dobError) {
    errors.dateOfBirth = dobError;
  } else if (!validateDateOfBirth(formData.dateOfBirth)) {
    errors.dateOfBirth = 'Date of birth cannot be in the future';
  }
  
  const genderError = validateRequired(formData.gender, 'Gender');
  if (genderError) errors.gender = genderError;
  
  const phoneError = validateRequired(formData.phone, 'Phone number') || 
                    validatePhoneFormat(formData.phone);
  if (phoneError) errors.phone = phoneError;
  
  const emailError = validateEmailFormat(formData.email);
  if (emailError) errors.email = emailError;
  
  // Medical Information
  const psaError = validateRequired(formData.initialPSA, 'Initial PSA') || 
                  validatePSAFormat(formData.initialPSA);
  if (psaError) errors.initialPSA = psaError;
  
  // Emergency Contact (if provided)
  if (formData.emergencyContactName || formData.emergencyContactPhone) {
    const emergencyNameError = validateNameFormat(formData.emergencyContactName, 'Emergency contact name');
    if (emergencyNameError) errors.emergencyContactName = emergencyNameError;
    
    const emergencyPhoneError = validatePhoneFormat(formData.emergencyContactPhone);
    if (emergencyPhoneError) errors.emergencyContactPhone = emergencyPhoneError;
  }
  
  return errors;
};

// Input handlers with validation
export const handlePhoneInput = (value, currentValue, onChange) => {
  // Only allow phone characters
  if (validatePhoneInput(value)) {
    onChange(value);
    return true;
  }
  return false;
};

export const handleNameInput = (value, currentValue, onChange) => {
  // Only allow name characters
  if (validateNameInput(value)) {
    onChange(value);
    return true;
  }
  return false;
};

export const handleNumericInput = (value, currentValue, onChange) => {
  // Only allow numeric input
  if (validateNumericInput(value)) {
    onChange(value);
    return true;
  }
  return false;
};





