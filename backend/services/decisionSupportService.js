import pool from '../config/database.js';
import { getApplicableGuidelines } from './guidelineService.js';

/**
 * Decision Support Service
 * Analyzes patient data and provides guideline-based recommendations
 */

/**
 * Get decision support recommendations for a patient
 */
export const getDecisionSupportRecommendations = async (patientId) => {
  try {
    const client = await pool.connect();
    
    // Get patient data
    const patientResult = await client.query(
      'SELECT * FROM patients WHERE id = $1',
      [patientId]
    );
    
    if (patientResult.rows.length === 0) {
      client.release();
      return { recommendations: [], riskScore: null };
    }
    
    const patient = patientResult.rows[0];
    
    // Get investigation results
    const investigationsResult = await client.query(`
      SELECT * FROM investigation_results
      WHERE patient_id = $1
      ORDER BY test_date DESC
    `, [patientId]);
    
    // Get latest PSA
    const latestPSA = investigationsResult.rows.find(
      r => r.test_type?.toLowerCase() === 'psa' || r.test_name?.toLowerCase().includes('psa')
    );
    
    // Get applicable guidelines
    const guidelines = await getApplicableGuidelines(patient);
    
    const recommendations = [];
    
    // Generate recommendations based on patient data
    const age = calculateAge(patient.date_of_birth);
    const psa = parseFloat(patient.initial_psa || 0);
    const pathway = patient.care_pathway || '';
    
    // PSA-based recommendations
    if (psa > 4.0) {
      recommendations.push({
        type: 'investigation',
        priority: 'high',
        text: 'PSA level is elevated (>4.0). Consider MRI and/or biopsy based on risk factors.',
        guidelineReference: 'AUA/EAU Guidelines',
        evidenceLevel: 'A',
        action: 'Schedule MRI or biopsy consultation'
      });
    } else if (psa > 2.5 && age < 60) {
      recommendations.push({
        type: 'investigation',
        priority: 'medium',
        text: 'PSA level is elevated for age. Consider active monitoring or further investigation.',
        guidelineReference: 'AUA/EAU Guidelines',
        evidenceLevel: 'B',
        action: 'Review with urologist'
      });
    }
    
    // Pathway-based recommendations
    if (pathway === 'Active Monitoring') {
      const lastPSA = latestPSA ? new Date(latestPSA.test_date) : null;
      if (!lastPSA || getDaysDifference(lastPSA, new Date()) > 365) {
        recommendations.push({
          type: 'investigation',
          priority: 'high',
          text: 'PSA test should be performed annually for Active Monitoring pathway.',
          guidelineReference: 'Active Monitoring Guidelines',
          evidenceLevel: 'A',
          action: 'Schedule annual PSA test'
        });
      }
    }
    
    if (pathway === 'Surgery Pathway') {
      const hasMRI = investigationsResult.rows.some(
        r => r.test_type?.toLowerCase() === 'mri' || r.test_name?.toLowerCase().includes('mri')
      );
      if (!hasMRI) {
        recommendations.push({
          type: 'investigation',
          priority: 'high',
          text: 'MRI is recommended before proceeding with surgery pathway.',
          guidelineReference: 'Surgical Guidelines',
          evidenceLevel: 'A',
          action: 'Schedule MRI'
        });
      }
    }
    
    // Calculate risk score (simplified)
    const riskScore = calculateRiskScore(patient, investigationsResult.rows);
    
    // Get existing recommendations from database
    const existingRecs = await client.query(`
      SELECT * FROM decision_support_recommendations
      WHERE patient_id = $1
        AND status = 'pending'
      ORDER BY priority DESC, created_at DESC
    `, [patientId]);
    
    // Combine with existing recommendations
    const allRecommendations = [
      ...recommendations,
      ...existingRecs.rows.map(r => ({
        id: r.id,
        type: r.recommendation_type,
        priority: r.priority,
        text: r.recommendation_text,
        guidelineReference: r.guideline_reference,
        evidenceLevel: r.evidence_level,
        status: r.status
      }))
    ];
    
    client.release();
    
    return {
      recommendations: allRecommendations,
      riskScore: riskScore
    };
  } catch (error) {
    console.error('Error getting decision support recommendations:', error);
    return { recommendations: [], riskScore: null };
  }
};

/**
 * Calculate risk score for patient
 */
const calculateRiskScore = (patient, investigations) => {
  let score = 0;
  
  const psa = parseFloat(patient.initial_psa || 0);
  const age = calculateAge(patient.date_of_birth);
  
  // PSA-based scoring
  if (psa > 10) score += 3;
  else if (psa > 4) score += 2;
  else if (psa > 2.5) score += 1;
  
  // Age-based scoring
  if (age > 70) score += 1;
  else if (age < 50 && psa > 2.5) score += 2;
  
  // Investigation results
  const hasAbnormalBiopsy = investigations.some(
    i => i.test_type?.toLowerCase().includes('biopsy') && 
         (i.status?.toLowerCase() === 'abnormal' || i.status?.toLowerCase() === 'high')
  );
  if (hasAbnormalBiopsy) score += 3;
  
  // Risk categories
  if (score >= 6) return { score, category: 'High Risk' };
  if (score >= 3) return { score, category: 'Medium Risk' };
  return { score, category: 'Low Risk' };
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Calculate days difference between two dates
 */
const getDaysDifference = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date2 - date1) / oneDay));
};

/**
 * Save recommendation to database
 */
export const saveRecommendation = async (patientId, recommendation) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      INSERT INTO decision_support_recommendations (
        patient_id, recommendation_type, recommendation_text,
        guideline_reference, evidence_level, priority, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      patientId,
      recommendation.type,
      recommendation.text,
      recommendation.guidelineReference,
      recommendation.evidenceLevel,
      recommendation.priority,
      recommendation.status || 'pending'
    ]);
    
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error saving recommendation:', error);
    throw error;
  }
};

/**
 * Update recommendation status
 */
export const updateRecommendationStatus = async (recommendationId, status) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      UPDATE decision_support_recommendations
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, recommendationId]);
    
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('Error updating recommendation status:', error);
    throw error;
  }
};



