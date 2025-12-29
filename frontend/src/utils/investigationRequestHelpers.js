/**
 * Shared utility functions for investigation request handling
 * Used by UrologistPatientDetailsModal and NursePatientDetailsModal to reduce duplication
 */

/**
 * Create request object from matching request or test data
 * @param {Object} matchingRequest - The matching investigation request
 * @param {string|Object} testNameOrData - Test name string or test data object
 * @param {Object} testData - Optional test data object (for Urologist modal)
 * @param {Function} createRequestFromClinicalInvestigation - Function to create request from clinical investigation
 * @returns {Object} The request object
 */
export const createRequestFromMatchOrTest = (matchingRequest, testNameOrData, testData, createRequestFromClinicalInvestigation) => {
  if (matchingRequest) {
    return createRequestFromClinicalInvestigation(matchingRequest);
  }
  
  // Handle different parameter patterns
  const name = testData?.testName || testData?.test_name || 
               (typeof testNameOrData === 'string' ? testNameOrData : (testNameOrData?.testName || testNameOrData?.test_name || ''));
  
  return {
    investigationName: name,
    investigation_name: name,
    testName: name,
    test_name: name,
    isClinicalInvestigation: false
  };
};

/**
 * Check if a test is a PSA test
 * @param {string} testName - The test name to check
 * @returns {boolean} True if it's a PSA test
 */
export const isPSATest = (testName) => {
  if (!testName) return false;
  const normalizedName = testName.toUpperCase().trim();
  return normalizedName.includes('PSA') || 
         normalizedName.startsWith('PSA') ||
         normalizedName === 'PSA TOTAL' || 
         normalizedName === 'PSA FREE' ||
         normalizedName === 'PSA RATIO' || 
         normalizedName === 'PSA VELOCITY' || 
         normalizedName === 'PSA DENSITY';
};

/**
 * Format date for display
 * @param {string|Date} dateValue - The date value to format
 * @returns {string} Formatted date string
 */
export const formatResultDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  try {
    return new Date(dateValue).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Get status badge className
 * @param {string} status - The status value
 * @returns {string} CSS class name for the status badge
 */
export const getStatusBadgeClassName = (status) => {
  if (!status) return '';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === 'normal') return 'bg-green-100 text-green-700';
  if (lowerStatus === 'high' || lowerStatus === 'elevated') return 'bg-red-100 text-red-700';
  if (lowerStatus === 'intermediate') return 'bg-yellow-100 text-yellow-700';
  return 'bg-blue-100 text-blue-700';
};

/**
 * Create request object from clinical investigation
 * @param {Object} request - The investigation request
 * @returns {Object} The formatted request object
 */
export const createRequestFromClinicalInvestigation = (request) => {
  if (!request.isClinicalInvestigation) {
    return request;
  }
  return {
    id: request.noteId,
    investigationName: request.investigationName,
    investigation_name: request.investigation_name,
    investigationType: request.investigationType,
    investigation_type: request.investigation_type,
    scheduledDate: request.scheduledDate,
    scheduled_date: request.scheduled_date,
    scheduledTime: request.scheduledTime,
    scheduled_time: request.scheduled_time,
    status: request.status,
    notes: request.notes,
    isClinicalInvestigation: true
  };
};

/**
 * Prepare edit result data from test/result object
 * @param {Object} testOrResult - The test or result object
 * @param {string} selectedTestName - Optional test name override
 * @returns {Object} The prepared result data
 */
export const prepareEditResultData = (testOrResult, selectedTestName = null) => {
  return {
    id: testOrResult.id,
    testName: testOrResult.testName || testOrResult.test_name || selectedTestName,
    result: testOrResult.result,
    notes: testOrResult.notes,
    filePath: testOrResult.filePath || testOrResult.file_path,
    fileName: testOrResult.fileName || testOrResult.file_name
  };
};

