/**
 * Determine PSA status based on age-adjusted Australian clinical guidelines
 * Based on Prostate Cancer Foundation of Australia (PCFA) and USANZ guidelines
 * 
 * @param {number} psaValue - PSA value in ng/mL
 * @param {number} age - Patient age in years
 * @returns {string} - 'Normal', 'High', 'Elevated', or 'Low'
 */
export const getPSAStatusByAge = (psaValue, age) => {
  if (!psaValue || isNaN(parseFloat(psaValue))) {
    return 'Normal';
  }

  const psa = parseFloat(psaValue);
  const patientAge = age ? parseInt(age) : null;

  // If age is not available, use standard 4.0 threshold (fallback)
  if (!patientAge || patientAge < 10) {
    if (psa > 4.0) return 'High';
    if (psa < 0.0) return 'Low';
    return 'Normal';
  }

  // Age-based thresholds according to Australian guidelines
  if (patientAge >= 10 && patientAge <= 39) {
    // 10-39 years: Normal ≤ 1.5, High > 2.0 (highly suspicious)
    if (psa > 2.0) return 'High';
    if (psa > 1.5) return 'Elevated';
    if (psa < 0.0) return 'Low';
    return 'Normal';
  }

  if (patientAge >= 40 && patientAge <= 49) {
    // 40-49 years: Normal ≤ 2.0, High > 2.0
    if (psa > 2.0) return 'High';
    if (psa < 0.0) return 'Low';
    return 'Normal';
  }

  if (patientAge >= 50 && patientAge <= 59) {
    // 50-59 years: Normal ≤ 3.0, High > 3.0
    if (psa > 3.0) return 'High';
    if (psa < 0.0) return 'Low';
    return 'Normal';
  }

  if (patientAge >= 60 && patientAge <= 69) {
    // 60-69 years: Normal ≤ 4.0, High > 3.0 (flagged), > 4.0 (standard high)
    if (psa > 4.0) return 'High';
    if (psa > 3.0) return 'Elevated';
    if (psa < 0.0) return 'Low';
    return 'Normal';
  }

  if (patientAge >= 70 && patientAge <= 79) {
    // 70-79 years: Normal ≤ 5.5, High > 5.5
    if (psa > 5.5) return 'High';
    if (psa < 0.0) return 'Low';
    return 'Normal';
  }

  if (patientAge >= 80 && patientAge <= 100) {
    // 80-100 years: Normal ≤ 6.5, High > 6.5 (or up to 10.0)
    if (psa > 10.0) return 'High';
    if (psa > 6.5) return 'Elevated';
    if (psa < 0.0) return 'Low';
    return 'Normal';
  }

  // Fallback for ages outside the range
  if (psa > 4.0) return 'High';
  if (psa < 0.0) return 'Low';
  return 'Normal';
};

/**
 * Get the age-adjusted normal upper limit for a given age
 * @param {number} age - Patient age in years
 * @returns {number} - Normal upper limit in ng/mL
 */
export const getPSAThresholdByAge = (age) => {
  const patientAge = age ? parseInt(age) : null;
  
  if (!patientAge || patientAge < 10) return 4.0; // Default fallback
  if (patientAge >= 10 && patientAge <= 39) return 1.5;
  if (patientAge >= 40 && patientAge <= 49) return 2.0;
  if (patientAge >= 50 && patientAge <= 59) return 3.0;
  if (patientAge >= 60 && patientAge <= 69) return 4.0;
  if (patientAge >= 70 && patientAge <= 79) return 5.5;
  if (patientAge >= 80 && patientAge <= 100) return 6.5;
  
  return 4.0; // Default fallback
};

