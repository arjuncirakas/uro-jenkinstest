import pool from '../config/database.js';

/**
 * Pathway Validator Utility
 * Validates pathway transitions and ensures required steps are completed
 */

/**
 * Validate pathway transition
 */
export const validatePathwayTransition = async (patientId, fromPathway, toPathway) => {
  try {
    const client = await pool.connect();
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      requiredActions: []
    };
    
    // Validate transition to Surgery Pathway
    if (toPathway === 'Surgery Pathway') {
      // Check if MRI is completed
      const hasMRI = await checkInvestigationCompleted(client, patientId, 'MRI');
      if (!hasMRI) {
        validation.isValid = false;
        validation.errors.push('MRI investigation must be completed before Surgery Pathway');
        validation.requiredActions.push('Complete MRI investigation');
      }
      
      // Check if MDT discussion occurred
      const hasMDT = await checkMDTDiscussion(client, patientId);
      if (!hasMDT) {
        validation.warnings.push('MDT discussion recommended before Surgery Pathway');
        validation.requiredActions.push('Schedule MDT discussion');
      }
      
      // Check if biopsy is completed
      const hasBiopsy = await checkInvestigationCompleted(client, patientId, 'biopsy');
      if (!hasBiopsy) {
        validation.warnings.push('Biopsy results should be available before Surgery Pathway');
        validation.requiredActions.push('Ensure biopsy results are available');
      }
    }
    
    // Validate Active Monitoring pathway
    if (toPathway === 'Active Monitoring') {
      // Check PSA monitoring interval
      const lastPSA = await getLastPSADate(client, patientId);
      if (lastPSA) {
        const daysSincePSA = getDaysDifference(lastPSA, new Date());
        if (daysSincePSA > 365) {
          validation.warnings.push('PSA test should be performed within last 12 months for Active Monitoring');
          validation.requiredActions.push('Schedule PSA test');
        }
      } else {
        validation.warnings.push('No PSA test found for Active Monitoring pathway');
        validation.requiredActions.push('Schedule PSA test');
      }
    }
    
    // Validate transition from Surgery Pathway
    if (fromPathway === 'Surgery Pathway' && toPathway === 'Post-op Followup') {
      // Check if surgery was completed
      const hasSurgery = await checkSurgeryCompleted(client, patientId);
      if (!hasSurgery) {
        validation.warnings.push('Ensure surgery was completed before post-op followup');
      }
    }
    
    // Validate Discharge pathway
    if (toPathway === 'Discharge') {
      // Check if discharge summary is prepared (optional check)
      const hasDischargeSummary = await checkDischargeSummary(client, patientId);
      if (!hasDischargeSummary) {
        validation.warnings.push('Discharge summary should be prepared before discharge');
        validation.requiredActions.push('Prepare discharge summary');
      }
    }
    
    client.release();
    return validation;
  } catch (error) {
    console.error('Error validating pathway transition:', error);
    return {
      isValid: true, // Default to valid on error to not block workflow
      errors: [],
      warnings: ['Unable to validate pathway transition: ' + error.message],
      requiredActions: []
    };
  }
};

/**
 * Check if investigation is completed
 */
const checkInvestigationCompleted = async (client, patientId, investigationType) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM investigation_results
      WHERE patient_id = $1
        AND (LOWER(test_type) = LOWER($2) OR LOWER(test_name) LIKE LOWER($3))
    `, [patientId, investigationType, `%${investigationType}%`]);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error checking investigation:', error);
    return false;
  }
};

/**
 * Check if MDT discussion occurred
 */
const checkMDTDiscussion = async (client, patientId) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM mdt_meetings
      WHERE patient_id = $1
        AND status IN ('Completed', 'completed')
    `, [patientId]);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error checking MDT discussion:', error);
    return false;
  }
};

/**
 * Get last PSA test date
 */
const getLastPSADate = async (client, patientId) => {
  try {
    const result = await client.query(`
      SELECT test_date
      FROM investigation_results
      WHERE patient_id = $1
        AND (LOWER(test_type) = 'psa' OR LOWER(test_name) LIKE '%psa%')
      ORDER BY test_date DESC
      LIMIT 1
    `, [patientId]);
    
    if (result.rows.length > 0) {
      return new Date(result.rows[0].test_date);
    }
    
    // Check initial PSA date
    const patientResult = await client.query(
      'SELECT initial_psa_date FROM patients WHERE id = $1',
      [patientId]
    );
    
    if (patientResult.rows.length > 0 && patientResult.rows[0].initial_psa_date) {
      return new Date(patientResult.rows[0].initial_psa_date);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting last PSA date:', error);
    return null;
  }
};

/**
 * Check if surgery was completed
 */
const checkSurgeryCompleted = async (client, patientId) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM appointments
      WHERE patient_id = $1
        AND appointment_type = 'surgery'
        AND status = 'completed'
    `, [patientId]);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error checking surgery:', error);
    return false;
  }
};

/**
 * Check if discharge summary exists
 */
const checkDischargeSummary = async (client, patientId) => {
  try {
    const result = await client.query(`
      SELECT COUNT(*) as count
      FROM discharge_summaries
      WHERE patient_id = $1
        AND is_deleted = false
    `, [patientId]);
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error checking discharge summary:', error);
    return false;
  }
};

/**
 * Calculate days difference between two dates
 */
const getDaysDifference = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date2 - date1) / oneDay));
};

/**
 * Log pathway validation to database
 */
export const logPathwayValidation = async (patientId, fromPathway, toPathway, validationResult, missingRequirements, userId) => {
  try {
    const client = await pool.connect();
    
    await client.query(`
      INSERT INTO pathway_validations (
        patient_id, from_pathway, to_pathway, validation_result, missing_requirements, validated_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      patientId,
      fromPathway,
      toPathway,
      validationResult.isValid ? 'valid' : 'invalid',
      JSON.stringify(missingRequirements),
      userId
    ]);
    
    client.release();
  } catch (error) {
    console.error('Error logging pathway validation:', error);
    // Don't throw - logging failure shouldn't break the workflow
  }
};



