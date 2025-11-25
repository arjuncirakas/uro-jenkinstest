/**
 * Frontend Input Validation Utilities
 * Provides real-time validation for form inputs
 * 
 * Security: Uses DOMPurify for XSS protection
 */
import DOMPurify from 'dompurify';

// Validate name fields (only letters, spaces, hyphens, apostrophes, periods)
export const validateNameInput = (value) => {
  // Allow letters, spaces, hyphens, apostrophes, periods
  const nameRegex = /^[a-zA-Z\s'.-]*$/;
  return nameRegex.test(value);
};

// Validate phone number (only digits, spaces, hyphens, parentheses, plus sign)
// Strictly blocks alphabets and special characters
export const validatePhoneInput = (value) => {
  // Only allow digits (0-9), spaces, hyphens (-), parentheses (), and plus sign (+)
  // Explicitly block all alphabets (a-z, A-Z) and other special characters
  const phoneRegex = /^[\d\s\-()+]*$/;
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
  
  // Parse date string and create date in local timezone
  // Handle both YYYY-MM-DD format and other formats
  const dateParts = dateString.split('-');
  let date;
  if (dateParts.length === 3) {
    // YYYY-MM-DD format - create date in local timezone
    date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
  } else {
    date = new Date(dateString);
  }
  
  // Normalize both dates to midnight in local timezone for accurate comparison
  date.setHours(0, 0, 0, 0);
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
  
  // Check if it has between 8 and 12 digits
  if (cleaned.length < 8) {
    return 'Phone number must be at least 8 digits';
  }
  
  if (cleaned.length > 12) {
    return 'Phone number must not exceed 12 digits';
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
  
  if (!/^[a-zA-Z\s'.-]+$/.test(name)) {
    return `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`;
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
  
  const lastNameError = validateRequired(formData.lastName, 'Last name');
  if (lastNameError) {
    errors.lastName = lastNameError;
  } else if (formData.lastName && !/^[a-zA-Z\s'.-]+$/.test(formData.lastName)) {
    errors.lastName = 'Last name can only contain letters, spaces, hyphens, apostrophes, and periods';
  }
  
  // Date of Birth / Age validation - at least one must be provided
  const hasDateOfBirth = formData.dateOfBirth && formData.dateOfBirth.trim() !== '';
  const hasAge = formData.age && formData.age.toString().trim() !== '';
  
  if (!hasDateOfBirth && !hasAge) {
    errors.dateOfBirth = 'Either date of birth or age is required';
    errors.age = 'Either date of birth or age is required';
  } else {
    // Validate date of birth if provided
    if (hasDateOfBirth && !validateDateOfBirth(formData.dateOfBirth)) {
      errors.dateOfBirth = 'Date of birth cannot be in the future';
    }
    // Validate age if provided
    if (hasAge) {
      const age = parseInt(formData.age, 10);
      if (isNaN(age) || age < 0 || age > 120) {
        errors.age = 'Please enter a valid age (0-120)';
      }
    }
  }
  
  const genderError = validateRequired(formData.gender, 'Gender');
  if (genderError) errors.gender = genderError;
  
  const phoneError = validateRequired(formData.phone, 'Phone number') || 
                    validatePhoneFormat(formData.phone);
  if (phoneError) errors.phone = phoneError;
  
  const emailError = validateEmailFormat(formData.email);
  if (emailError) errors.email = emailError;
  
  const addressError = validateRequired(formData.address, 'Address');
  if (addressError) errors.address = addressError;
  
  // Medical Information
  const psaError = validateRequired(formData.initialPSA, 'Initial PSA') || 
                  validatePSAFormat(formData.initialPSA);
  if (psaError) errors.initialPSA = psaError;
  
  const psaDateError = validateRequired(formData.initialPSADate, 'PSA test date');
  if (psaDateError) {
    errors.initialPSADate = psaDateError;
  } else if (formData.initialPSADate && !validateDateOfBirth(formData.initialPSADate)) {
    errors.initialPSADate = 'PSA test date cannot be in the future';
  }
  
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





