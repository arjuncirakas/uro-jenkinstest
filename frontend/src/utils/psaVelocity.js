/**
 * Calculate PSA velocity from PSA results
 * PSA Velocity = (PSA2 - PSA1) / (Time in years between measurements)
 * 
 * @param {Array} psaResults - Array of PSA results sorted by date (newest first)
 * @returns {Object} - { velocity: number, velocityText: string, isHighRisk: boolean, hasEnoughData: boolean }
 */
export const calculatePSAVelocity = (psaResults) => {
  if (!psaResults || psaResults.length < 2) {
    return {
      velocity: null,
      velocityText: 'Insufficient data (need at least 2 PSA results)',
      isHighRisk: false,
      hasEnoughData: false
    };
  }

  // Sort by date (newest first) if not already sorted
  const sortedResults = [...psaResults].sort((a, b) => {
    // Check for dateObj first (used in Nurse modal), then fall back to other date fields
    const dateA = a.dateObj && !isNaN(a.dateObj.getTime()) 
      ? a.dateObj 
      : new Date(a.testDate || a.test_date || a.formattedDate || a.date || a.created_at);
    const dateB = b.dateObj && !isNaN(b.dateObj.getTime())
      ? b.dateObj
      : new Date(b.testDate || b.test_date || b.formattedDate || b.date || b.created_at);
    return dateB - dateA; // Newest first
  });

  // Get the two most recent results
  const latest = sortedResults[0];
  const previous = sortedResults[1];

  // Extract numeric PSA values
  const getNumericPSA = (psa) => {
    if (!psa) return null;
    const result = psa.result || psa.result_value || psa.numericValue;
    if (typeof result === 'number') return result;
    if (typeof result === 'string') {
      // Remove "ng/mL" and extract number
      const numStr = result.replace(/ng\/ml/gi, '').trim();
      const num = parseFloat(numStr);
      return isNaN(num) ? null : num;
    }
    return null;
  };

  const latestPSA = getNumericPSA(latest);
  const previousPSA = getNumericPSA(previous);

  if (latestPSA === null || previousPSA === null) {
    return {
      velocity: null,
      velocityText: 'Unable to calculate (invalid PSA values)',
      isHighRisk: false,
      hasEnoughData: false
    };
  }

  // Get dates - check for dateObj first (used in Nurse modal), then fall back to other date fields
  const latestDate = latest.dateObj && !isNaN(latest.dateObj.getTime())
    ? latest.dateObj
    : new Date(latest.testDate || latest.test_date || latest.formattedDate || latest.date || latest.created_at);
  const previousDate = previous.dateObj && !isNaN(previous.dateObj.getTime())
    ? previous.dateObj
    : new Date(previous.testDate || previous.test_date || previous.formattedDate || previous.date || previous.created_at);

  if (isNaN(latestDate.getTime()) || isNaN(previousDate.getTime())) {
    return {
      velocity: null,
      velocityText: 'Unable to calculate (invalid dates)',
      isHighRisk: false,
      hasEnoughData: false
    };
  }

  // Calculate time difference in years
  const timeDiffMs = latestDate - previousDate;
  const timeDiffYears = timeDiffMs / (1000 * 60 * 60 * 24 * 365.25);

  if (timeDiffYears <= 0) {
    return {
      velocity: null,
      velocityText: 'Unable to calculate (dates are invalid)',
      isHighRisk: false,
      hasEnoughData: false
    };
  }

  // Calculate velocity: (Latest PSA - Previous PSA) / Time in years
  const velocity = (latestPSA - previousPSA) / timeDiffYears;

  // Threshold for high risk: 0.75 ng/mL/year
  const isHighRisk = velocity > 0.75;

  return {
    velocity,
    velocityText: `${velocity >= 0 ? '+' : ''}${velocity.toFixed(2)} ng/mL/year`,
    isHighRisk,
    hasEnoughData: true,
    latestPSA,
    previousPSA,
    timeDiffYears: parseFloat(timeDiffYears.toFixed(2))
  };
};

