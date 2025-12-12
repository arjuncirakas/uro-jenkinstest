import { getCachedGuidelines, getApplicableGuidelines } from '../services/guidelineService.js';
import pool from '../config/database.js';

/**
 * Guideline Compliance Utility
 * Core compliance checking logic
 */

/**
 * Check compliance for a pathway transition
 */
export const checkPathwayCompliance = async (patientId, fromPathway, toPathway, patientData = null) => {
  try {
    const client = await pool.connect();
    
    // Get patient data if not provided
    if (!patientData) {
      const patientResult = await client.query(
        'SELECT * FROM patients WHERE id = $1',
        [patientId]
      );
      if (patientResult.rows.length === 0) {
        client.release();
        return { isCompliant: false, errors: ['Patient not found'] };
      }
      patientData = patientResult.rows[0];
    }
    
    // Get applicable guidelines
    const guidelines = await getApplicableGuidelines(patientData);
    
    const compliance = {
      isCompliant: true,
      errors: [],
      warnings: [],
      requiredActions: []
    };
    
    // Check pathway-specific rules
    if (toPathway === 'Surgery Pathway') {
      // Check if MRI is completed
      const hasMRI = await checkInvestigationCompleted(client, patientId, 'MRI');
      if (!hasMRI) {
        compliance.isCompliant = false;
        compliance.errors.push('MRI investigation must be completed before Surgery Pathway');
        compliance.requiredActions.push('Complete MRI investigation');
      }
      
      // Check if MDT discussion occurred (warning, not error)
      const hasMDT = await checkMDTDiscussion(client, patientId);
      if (!hasMDT) {
        compliance.warnings.push('MDT discussion recommended before Surgery Pathway');
        compliance.requiredActions.push('Schedule MDT discussion');
      }
    }
    
    // Check Active Monitoring pathway
    if (toPathway === 'Active Monitoring') {
      const lastPSA = await getLastPSADate(client, patientId);
      if (lastPSA) {
        const daysSincePSA = getDaysDifference(lastPSA, new Date());
        if (daysSincePSA > 365) {
          compliance.warnings.push('PSA test should be performed within last 12 months for Active Monitoring');
          compliance.requiredActions.push('Schedule PSA test');
        }
      } else {
        compliance.warnings.push('No PSA test found for Active Monitoring pathway');
        compliance.requiredActions.push('Schedule PSA test');
      }
    }
    
    // Check guidelines for pathway transition
    for (const guideline of guidelines) {
      if (guideline.category === 'pathway_transition') {
        const criteria = guideline.criteria || {};
        if (criteria.allowed_transitions && Array.isArray(criteria.allowed_transitions)) {
          const transitionKey = `${fromPathway}->${toPathway}`;
          if (!criteria.allowed_transitions.includes(transitionKey) && 
              !criteria.allowed_transitions.includes(toPathway)) {
            compliance.warnings.push(`Pathway transition may not align with ${guideline.guideline_name}`);
          }
        }
      }
    }
    
    client.release();
    return compliance;
  } catch (error) {
    console.error('Error checking pathway compliance:', error);
    return {
      isCompliant: true, // Default to compliant on error to not block workflow
      errors: [],
      warnings: ['Unable to verify compliance: ' + error.message],
      requiredActions: []
    };
  }
};

/**
 * Check compliance for an investigation request
 */
export const checkInvestigationCompliance = async (patientId, investigationType, investigationName, patientData = null) => {
  try {
    const client = await pool.connect();
    
    // Get patient data if not provided
    if (!patientData) {
      const patientResult = await client.query(
        'SELECT * FROM patients WHERE id = $1',
        [patientId]
      );
      if (patientResult.rows.length === 0) {
        client.release();
        return { isCompliant: false, errors: ['Patient not found'] };
      }
      patientData = patientResult.rows[0];
    }
    
    const compliance = {
      isCompliant: true,
      errors: [],
      warnings: [],
      recommendations: []
    };
    
    // Check PSA monitoring intervals
    if (investigationType === 'psa' || investigationName?.toLowerCase().includes('psa')) {
      const lastPSA = await getLastPSADate(client, patientId);
      if (lastPSA) {
        const daysSincePSA = getDaysDifference(lastPSA, new Date());
        if (daysSincePSA < 90) {
          compliance.warnings.push('PSA test was performed less than 3 months ago. Consider waiting.');
        }
      }
    }
    
    // Check if MRI is needed before biopsy
    if (investigationName?.toLowerCase().includes('biopsy')) {
      const hasMRI = await checkInvestigationCompleted(client, patientId, 'MRI');
      if (!hasMRI) {
        compliance.warnings.push('MRI is typically recommended before biopsy');
        compliance.recommendations.push('Consider scheduling MRI before biopsy');
      }
    }
    
    client.release();
    return compliance;
  } catch (error) {
    console.error('Error checking investigation compliance:', error);
    return {
      isCompliant: true,
      errors: [],
      warnings: [],
      recommendations: []
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
 * Calculate days difference between two dates
 */
const getDaysDifference = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date2 - date1) / oneDay));
};

/**
 * Log compliance check to database
 */
export const logComplianceCheck = async (patientId, guidelineId, checkType, checkResult, details, userId) => {
  try {
    const client = await pool.connect();
    
    await client.query(`
      INSERT INTO guideline_compliance_checks (
        patient_id, guideline_id, check_type, check_result, details, checked_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [patientId, guidelineId, checkType, checkResult, JSON.stringify(details), userId]);
    
    client.release();
  } catch (error) {
    console.error('Error logging compliance check:', error);
    // Don't throw - logging failure shouldn't break the workflow
  }
};




