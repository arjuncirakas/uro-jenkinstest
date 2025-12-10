import { getApplicableGuidelines, getGuidelinesByCategory } from '../services/guidelineService.js';
import { getDecisionSupportRecommendations, saveRecommendation, updateRecommendationStatus } from '../services/decisionSupportService.js';
import { checkPathwayCompliance, checkInvestigationCompliance, logComplianceCheck } from '../utils/guidelineCompliance.js';
import { validatePathwayTransition, logPathwayValidation } from '../utils/pathwayValidator.js';
import pool from '../config/database.js';

/**
 * Get applicable guidelines for a patient
 */
export const getPatientGuidelines = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const client = await pool.connect();
    const patientResult = await client.query(
      'SELECT * FROM patients WHERE id = $1',
      [patientId]
    );
    
    if (patientResult.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    const patient = patientResult.rows[0];
    const guidelines = await getApplicableGuidelines(patient);
    
    client.release();
    
    res.json({
      success: true,
      data: {
        guidelines: guidelines.map(g => ({
          id: g.id,
          name: g.guideline_name,
          version: g.guideline_version,
          category: g.category,
          criteria: g.criteria,
          recommendations: g.recommendations,
          evidenceLevel: g.evidence_level
        }))
      }
    });
  } catch (error) {
    console.error('Error getting patient guidelines:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get decision support recommendations for a patient
 */
export const getPatientRecommendations = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const result = await getDecisionSupportRecommendations(patientId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Validate pathway transition
 */
export const validatePathway = async (req, res) => {
  try {
    const { patientId, fromPathway, toPathway } = req.body;
    const userId = req.user?.id;
    
    if (!patientId || !toPathway) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and target pathway are required'
      });
    }
    
    // Get current pathway if not provided
    let currentPathway = fromPathway;
    if (!currentPathway) {
      const client = await pool.connect();
      const patientResult = await client.query(
        'SELECT care_pathway FROM patients WHERE id = $1',
        [patientId]
      );
      client.release();
      
      if (patientResult.rows.length > 0) {
        currentPathway = patientResult.rows[0].care_pathway || '';
      }
    }
    
    // Validate pathway transition
    const validation = await validatePathwayTransition(patientId, currentPathway, toPathway);
    
    // Log validation
    if (userId) {
      await logPathwayValidation(
        patientId,
        currentPathway,
        toPathway,
        validation,
        validation.requiredActions,
        userId
      );
    }
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating pathway:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Check compliance for pathway transition
 */
export const checkPathwayComplianceEndpoint = async (req, res) => {
  try {
    const { patientId, fromPathway, toPathway } = req.body;
    const userId = req.user?.id;
    
    if (!patientId || !toPathway) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and target pathway are required'
      });
    }
    
    // Get current pathway if not provided
    let currentPathway = fromPathway;
    if (!currentPathway) {
      const client = await pool.connect();
      const patientResult = await client.query(
        'SELECT care_pathway FROM patients WHERE id = $1',
        [patientId]
      );
      client.release();
      
      if (patientResult.rows.length > 0) {
        currentPathway = patientResult.rows[0].care_pathway || '';
      }
    }
    
    // Check compliance
    const compliance = await checkPathwayCompliance(patientId, currentPathway, toPathway);
    
    // Log compliance check
    if (userId) {
      await logComplianceCheck(
        patientId,
        null, // guideline_id - can be enhanced later
        'pathway_transition',
        compliance.isCompliant ? 'compliant' : 'non_compliant',
        compliance,
        userId
      );
    }
    
    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    console.error('Error checking compliance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Check compliance for investigation request
 */
export const checkInvestigationComplianceEndpoint = async (req, res) => {
  try {
    const { patientId, investigationType, investigationName } = req.body;
    const userId = req.user?.id;
    
    if (!patientId || !investigationType) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and investigation type are required'
      });
    }
    
    // Check compliance
    const compliance = await checkInvestigationCompliance(
      patientId,
      investigationType,
      investigationName
    );
    
    // Log compliance check
    if (userId) {
      await logComplianceCheck(
        patientId,
        null,
        'investigation_request',
        compliance.isCompliant ? 'compliant' : 'non_compliant',
        compliance,
        userId
      );
    }
    
    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    console.error('Error checking investigation compliance:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Get guidelines by category
 */
export const getGuidelinesByCategoryEndpoint = async (req, res) => {
  try {
    const { category } = req.params;
    
    const guidelines = await getGuidelinesByCategory(category);
    
    res.json({
      success: true,
      data: {
        guidelines: guidelines.map(g => ({
          id: g.id,
          name: g.guideline_name,
          version: g.guideline_version,
          category: g.category,
          criteria: g.criteria,
          recommendations: g.recommendations,
          evidenceLevel: g.evidence_level
        }))
      }
    });
  } catch (error) {
    console.error('Error getting guidelines by category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

