/**
 * Determine PSA status based on age-adjusted Australian clinical guidelines
 * Based on Prostate Cancer Foundation of Australia (PCFA) and USANZ guidelines
 * 
 * @param {number} psaValue - PSA value in ng/mL
 * @param {number} age - Patient age in years
 * @returns {object} - { status: 'Normal'|'High'|'Elevated', threshold: number, message: string }
 */
export const getPSAStatusByAge = (psaValue, age) => {
  if (!psaValue || isNaN(parseFloat(psaValue))) {
    return { status: 'Normal', threshold: null, message: 'Invalid PSA value' };
  }

  const psa = parseFloat(psaValue);
  const patientAge = age ? parseInt(age) : null;

  // If age is not available, use standard 4.0 threshold (fallback)
  if (!patientAge || patientAge < 10) {
    if (psa > 4.0) {
      return { status: 'High', threshold: 4.0, message: 'PSA > 4.0 ng/mL (age not available)' };
    } else if (psa < 0.0) {
      return { status: 'Low', threshold: 0.0, message: 'PSA < 0.0 ng/mL' };
    }
    return { status: 'Normal', threshold: 4.0, message: 'PSA 0.0 - 4.0 ng/mL' };
  }

  // Age-based thresholds according to Australian guidelines
  if (patientAge >= 10 && patientAge <= 39) {
    // 10-39 years: Normal ≤ 1.5, High > 2.0 (highly suspicious)
    if (psa > 2.0) {
      return { status: 'High', threshold: 2.0, message: 'PSA > 2.0 ng/mL (Age 10-39: Highly suspicious, requires immediate specialist referral)' };
    } else if (psa > 1.5) {
      return { status: 'Elevated', threshold: 1.5, message: 'PSA > 1.5 ng/mL (Age 10-39: Above normal, consider monitoring)' };
    } else if (psa < 0.0) {
      return { status: 'Low', threshold: 0.0, message: 'PSA < 0.0 ng/mL' };
    }
    return { status: 'Normal', threshold: 1.5, message: 'PSA 0.0 - 1.5 ng/mL (Age 10-39: Normal range)' };
  }

  if (patientAge >= 40 && patientAge <= 49) {
    // 40-49 years: Normal ≤ 2.0, High > 2.0
    if (psa > 2.0) {
      return { status: 'High', threshold: 2.0, message: 'PSA > 2.0 ng/mL (Age 40-49: Elevated, consider specialist referral)' };
    } else if (psa < 0.0) {
      return { status: 'Low', threshold: 0.0, message: 'PSA < 0.0 ng/mL' };
    }
    return { status: 'Normal', threshold: 2.0, message: 'PSA 0.0 - 2.0 ng/mL (Age 40-49: Normal range, median 0.6)' };
  }

  if (patientAge >= 50 && patientAge <= 59) {
    // 50-59 years: Normal ≤ 3.0, High > 3.0 (triggers repeat test and potentially specialist referral)
    if (psa > 3.0) {
      return { status: 'High', threshold: 3.0, message: 'PSA > 3.0 ng/mL (Age 50-59: Triggers repeat test and potentially specialist referral)' };
    } else if (psa < 0.0) {
      return { status: 'Low', threshold: 0.0, message: 'PSA < 0.0 ng/mL' };
    }
    return { status: 'Normal', threshold: 3.0, message: 'PSA 0.0 - 3.0 ng/mL (Age 50-59: Normal range)' };
  }

  if (patientAge >= 60 && patientAge <= 69) {
    // 60-69 years: Normal ≤ 4.0, High > 3.0 (flagged), > 4.0 (standard high)
    // Australian guidelines: 3.0 is flagged for discussion, 4.0 is standard high cutoff
    if (psa > 4.0) {
      return { status: 'High', threshold: 4.0, message: 'PSA > 4.0 ng/mL (Age 60-69: Standard high cutoff)' };
    } else if (psa > 3.0) {
      return { status: 'Elevated', threshold: 3.0, message: 'PSA > 3.0 ng/mL (Age 60-69: Flagged for discussion)' };
    } else if (psa < 0.0) {
      return { status: 'Low', threshold: 0.0, message: 'PSA < 0.0 ng/mL' };
    }
    return { status: 'Normal', threshold: 4.0, message: 'PSA 0.0 - 4.0 ng/mL (Age 60-69: Normal range)' };
  }

  if (patientAge >= 70 && patientAge <= 79) {
    // 70-79 years: Normal ≤ 5.5, High > 5.5 (raised due to BPH)
    if (psa > 5.5) {
      return { status: 'High', threshold: 5.5, message: 'PSA > 5.5 ng/mL (Age 70-79: High threshold raised due to natural prostate enlargement)' };
    } else if (psa < 0.0) {
      return { status: 'Low', threshold: 0.0, message: 'PSA < 0.0 ng/mL' };
    }
    return { status: 'Normal', threshold: 5.5, message: 'PSA 0.0 - 5.5 ng/mL (Age 70-79: Normal range, adjusted for BPH)' };
  }

  if (patientAge >= 80 && patientAge <= 100) {
    // 80-100 years: Normal ≤ 6.5, High > 6.5 (or up to 10.0 depending on lab)
    // Using 6.5 as standard, but can go up to 10.0
    if (psa > 10.0) {
      return { status: 'High', threshold: 10.0, message: 'PSA > 10.0 ng/mL (Age 80-100: High, clinical focus on life expectancy)' };
    } else if (psa > 6.5) {
      return { status: 'Elevated', threshold: 6.5, message: 'PSA > 6.5 ng/mL (Age 80-100: Elevated, clinical focus on life expectancy)' };
    } else if (psa < 0.0) {
      return { status: 'Low', threshold: 0.0, message: 'PSA < 0.0 ng/mL' };
    }
    return { status: 'Normal', threshold: 6.5, message: 'PSA 0.0 - 6.5 ng/mL (Age 80-100: Normal range, adjusted for age)' };
  }

  // Fallback for ages outside the range
  if (psa > 4.0) {
    return { status: 'High', threshold: 4.0, message: 'PSA > 4.0 ng/mL' };
  } else if (psa < 0.0) {
    return { status: 'Low', threshold: 0.0, message: 'PSA < 0.0 ng/mL' };
  }
  return { status: 'Normal', threshold: 4.0, message: 'PSA 0.0 - 4.0 ng/mL' };
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

