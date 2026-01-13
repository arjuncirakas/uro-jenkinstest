/**
 * Constants defining which fields need encryption
 * These fields contain PII (Personally Identifiable Information) or PHI (Protected Health Information)
 */

// Patient fields that need encryption
// Note: date_of_birth is stored as DATE type, not encrypted (needed for age calculations)
export const PATIENT_ENCRYPTED_FIELDS = [
  'phone',                    // PII
  'email',                    // PII
  'address',                  // PII
  'medical_history',          // PHI
  'current_medications',      // PHI
  'allergies',                // PHI
  'emergency_contact_name',   // PII
  'emergency_contact_phone'   // PII
];

// User fields that need encryption
export const USER_ENCRYPTED_FIELDS = [
  'email',                    // PII
  'phone'                     // PII
];

// Fields that need searchable hash columns (for searching without decryption)
export const SEARCHABLE_ENCRYPTED_FIELDS = [
  'phone',
  'email'
];

// Fields that need partial hash for prefix matching
export const PARTIAL_HASH_FIELDS = [
  'phone'  // Phone numbers benefit from prefix matching
];

