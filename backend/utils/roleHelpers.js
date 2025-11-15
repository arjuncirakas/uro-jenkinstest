/**
 * Role helper utilities
 * Provides functions to check user roles and permissions
 */

/**
 * Check if a role is a urologist or doctor
 * Doctors and urologists should have the same permissions
 * @param {string} role - The user role to check
 * @returns {boolean} - True if role is urologist or doctor
 */
export const isUrologistOrDoctor = (role) => {
  return role === 'urologist' || role === 'doctor';
};

/**
 * Check if a role is in a list of allowed roles, treating doctor as urologist
 * @param {string} role - The user role to check
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} - True if role is allowed
 */
export const isRoleAllowed = (role, allowedRoles) => {
  // If doctor is in allowed roles, also allow urologist
  // If urologist is in allowed roles, also allow doctor
  const normalizedAllowedRoles = [...allowedRoles];
  if (allowedRoles.includes('urologist') && !normalizedAllowedRoles.includes('doctor')) {
    normalizedAllowedRoles.push('doctor');
  }
  if (allowedRoles.includes('doctor') && !normalizedAllowedRoles.includes('urologist')) {
    normalizedAllowedRoles.push('urologist');
  }
  
  return normalizedAllowedRoles.includes(role);
};

/**
 * Normalize role name for display (doctor -> urologist for display purposes)
 * @param {string} role - The user role
 * @returns {string} - Normalized role name
 */
export const normalizeRoleForDisplay = (role) => {
  if (role === 'doctor') {
    return 'urologist';
  }
  return role;
};

/**
 * Get display name for role
 * @param {string} role - The user role
 * @returns {string} - Display name for the role
 */
export const getRoleDisplayName = (role) => {
  const roleMap = {
    'urologist': 'Urologist',
    'doctor': 'Urologist', // Doctors display as Urologist
    'urology_nurse': 'Nurse',
    'gp': 'GP',
    'superadmin': 'Admin',
    'admin': 'Admin'
  };
  
  return roleMap[role] || 'User';
};










