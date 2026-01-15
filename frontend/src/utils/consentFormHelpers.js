/**
 * Shared utility functions for consent form handling
 * Used by UrologistPatientDetailsModal and NursePatientDetailsModal to reduce duplication
 */

/**
 * Normalize test name by removing "CUSTOM:" prefix if present
 * @param {string} testName - The test name to normalize
 * @returns {string} Normalized test name
 */
export const normalizeTestName = (testName) => {
  if (!testName) return '';
  let normalized = testName.toUpperCase().trim();
  if (normalized.startsWith('CUSTOM:')) {
    normalized = normalized.replace(/^CUSTOM:\s*/, '').trim();
  }
  return normalized;
};

/**
 * Get consent form template for a test - EXACT MATCH ONLY
 * Only returns a template if the test name exactly matches the template's test_name or procedure_name
 * No partial matching or fallback to general templates (e.g., "MULTI-PARAMETRIC MRI" will NOT match "MRI")
 * @param {string} testName - The test name
 * @param {Array} consentFormTemplates - Array of consent form templates
 * @param {boolean} enableDebugLogging - Whether to enable debug logging (default: false)
 * @returns {Object|null} The matching template or null
 */
export const getConsentFormTemplate = (testName, consentFormTemplates, enableDebugLogging = false) => {
  if (!testName || !consentFormTemplates || consentFormTemplates.length === 0) return null;

  const normalizedTestName = normalizeTestName(testName);

  // EXACT MATCH ONLY - with whitespace normalization for flexibility
  const normalizedTestNameNoSpaces = normalizedTestName.replace(/\s+/g, '');
  const template = consentFormTemplates.find(t => {
    const templateTestName = t.test_name ? t.test_name.toUpperCase().trim() : '';
    const templateProcName = t.procedure_name ? t.procedure_name.toUpperCase().trim() : '';
    const templateTestNameNoSpaces = templateTestName.replace(/\s+/g, '');
    const templateProcNameNoSpaces = templateProcName.replace(/\s+/g, '');
    
    // Only match if names are exactly equal (with or without spaces)
    return (templateTestName && (
      templateTestName === normalizedTestName || 
      templateTestNameNoSpaces === normalizedTestNameNoSpaces
    )) || (templateProcName && (
      templateProcName === normalizedTestName || 
      templateProcNameNoSpaces === normalizedTestNameNoSpaces
    ));
  });

  // Debug logging for custom tests (only if enabled)
  const standardTestPattern = /^(MRI|TRUS|BIOPSY|PSA)/i;
  if (enableDebugLogging && normalizedTestName && !standardTestPattern.exec(normalizedTestName)) {
    console.log(`[Consent Form] Looking for template for custom test: "${normalizedTestName}"`, {
      foundTemplate: !!template,
      templateId: template?.id,
      templateTestName: template?.test_name,
      templateProcName: template?.procedure_name,
      allTemplates: consentFormTemplates.map(t => ({
        id: t.id,
        test_name: t.test_name,
        procedure_name: t.procedure_name
      }))
    });
  }

  return template || null;
};

/**
 * Get patient consent form for a test - EXACT MATCH ONLY
 * Only returns a consent form if it exactly matches the test name
 * @param {string} testName - The test name
 * @param {Array} patientConsentForms - Array of patient consent forms
 * @param {Array} consentFormTemplates - Array of consent form templates
 * @returns {Object|null} The matching patient consent form or null
 */
export const getPatientConsentForm = (testName, patientConsentForms, consentFormTemplates) => {
  if (!testName || !patientConsentForms || patientConsentForms.length === 0) return null;

  const normalizedTestName = normalizeTestName(testName);
  const normalizedTestNameNoSpaces = normalizedTestName.replace(/\s+/g, '');

  return patientConsentForms.find(cf => {
    // First, try matching by consent_form_name (from API response) - EXACT MATCH ONLY
    if (cf.consent_form_name) {
      const consentFormName = cf.consent_form_name.toUpperCase().trim();
      const consentFormNameNoSpaces = consentFormName.replace(/\s+/g, '');
      if (consentFormName === normalizedTestName || 
          consentFormNameNoSpaces === normalizedTestNameNoSpaces) {
        return true;
      }
    }

    // Second, try matching by template - EXACT MATCH ONLY
    const template = consentFormTemplates?.find(t => t.id === cf.template_id || t.id === cf.consent_form_id);
    if (template) {
      const templateTestName = template.test_name?.toUpperCase().trim() || '';
      const templateProcName = template.procedure_name?.toUpperCase().trim() || '';
      const templateTestNameNoSpaces = templateTestName.replace(/\s+/g, '');
      const templateProcNameNoSpaces = templateProcName.replace(/\s+/g, '');
      
      // Only match if names are exactly equal
      return (templateTestName && (
        templateTestName === normalizedTestName || 
        templateTestNameNoSpaces === normalizedTestNameNoSpaces
      )) || (templateProcName && (
        templateProcName === normalizedTestName || 
        templateProcNameNoSpaces === normalizedTestNameNoSpaces
      ));
    }

    return false;
  }) || null;
};

/**
 * Get print button title based on template availability and printing state
 * @param {boolean} hasTemplate - Whether a template is available
 * @param {boolean} isPrinting - Whether printing is in progress
 * @param {string} buttonText - The button text when enabled (default: 'Print consent form')
 * @returns {string} The title text for the print button
 */
export const getPrintButtonTitle = (hasTemplate, isPrinting, buttonText = 'Print consent form') => {
  if (!hasTemplate) {
    return 'Consent form template not available. Please create one in the superadmin panel.';
  }
  if (isPrinting) {
    return 'Loading consent form...';
  }
  return buttonText;
};

/**
 * Compute consent form data for rendering - EXACT MATCH ONLY
 * Only uses templates that exactly match the investigation name
 * No fallback to general templates (e.g., "MULTI-PARAMETRIC MRI" will NOT use "MRI" template)
 * @param {string} investigationName - The investigation name
 * @param {Function} getConsentFormTemplate - Function to get consent form template
 * @param {Function} getPatientConsentForm - Function to get patient consent form
 * @param {Array} consentFormTemplates - Array of consent form templates
 * @returns {Object} Object containing consent form data
 */
export const computeConsentFormData = (investigationName, getConsentFormTemplate, getPatientConsentForm, consentFormTemplates) => {
  const normalizedName = investigationName.toUpperCase().trim();
  const isPSATest = normalizedName.includes('PSA') || normalizedName.startsWith('PSA') ||
    normalizedName === 'PSA TOTAL' || normalizedName === 'PSA FREE' ||
    normalizedName === 'PSA RATIO' || normalizedName === 'PSA VELOCITY' || normalizedName === 'PSA DENSITY';
  
  if (isPSATest) {
    return { isPSATest: true };
  }

  // Get exact match template only - no partial matching
  const consentTemplate = getConsentFormTemplate(investigationName, consentFormTemplates);
  
  // Get patient consent form - exact match only
  const patientConsentForm = getPatientConsentForm(investigationName, [], consentFormTemplates);
  
  // Only use template if it exactly matches - no fallback to general templates
  // If patient has uploaded a form, we can use its template, but only if it matches exactly
  let templateToUse = consentTemplate;
  if (!templateToUse && patientConsentForm) {
    const patientTemplate = consentFormTemplates?.find(t => 
      t.id === patientConsentForm.template_id || 
      t.id === patientConsentForm.consent_form_id
    );
    // Verify the patient's template matches the investigation name exactly
    if (patientTemplate) {
      const templateTestName = patientTemplate.test_name?.toUpperCase().trim() || '';
      const templateProcName = patientTemplate.procedure_name?.toUpperCase().trim() || '';
      const templateTestNameNoSpaces = templateTestName.replace(/\s+/g, '');
      const templateProcNameNoSpaces = templateProcName.replace(/\s+/g, '');
      const normalizedNameNoSpaces = normalizedName.replace(/\s+/g, '');
      
      if ((templateTestName && (templateTestName === normalizedName || templateTestNameNoSpaces === normalizedNameNoSpaces)) ||
          (templateProcName && (templateProcName === normalizedName || templateProcNameNoSpaces === normalizedNameNoSpaces))) {
        templateToUse = patientTemplate;
      }
    }
  }
  
  const filePath = patientConsentForm?.file_path || patientConsentForm?.filePath ||
    patientConsentForm?.signed_file_path || patientConsentForm?.signed_filePath;
  // Check if patient has uploaded a consent form
  // File paths can be stored with or without 'uploads/' prefix (database vs filesystem)
  // Must contain 'consent-forms/patients/' and not be a template or auto-generated
  const hasUploadedForm = filePath && 
    (filePath.includes('consent-forms/patients/') || filePath.includes('consent-forms\\patients\\')) &&
    !filePath.includes('templates/') && 
    !filePath.includes('templates\\') &&
    !filePath.includes('auto-generated');

  return {
    isPSATest: false,
    consentTemplate,
    matchingTemplate: null, // Removed - no fallback matching
    patientConsentFormCheck: patientConsentForm,
    templateToUse,
    patientConsentForm,
    hasUploadedForm
  };
};

