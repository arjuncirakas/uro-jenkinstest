import pool from '../config/database.js';

/**
 * Guideline Service
 * Handles fetching and caching guideline rules
 */

// Cache for guidelines (in-memory cache, can be replaced with Redis in production)
let guidelinesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Get all clinical guidelines from database
 */
export const getAllGuidelines = async () => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        id,
        guideline_name,
        guideline_version,
        category,
        criteria,
        recommendations,
        evidence_level,
        created_at,
        updated_at
      FROM clinical_guidelines
      ORDER BY category, guideline_name
    `);
    
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching guidelines:', error);
    throw error;
  }
};

/**
 * Get guidelines by category
 */
export const getGuidelinesByCategory = async (category) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT 
        id,
        guideline_name,
        guideline_version,
        category,
        criteria,
        recommendations,
        evidence_level
      FROM clinical_guidelines
      WHERE category = $1
      ORDER BY guideline_name
    `, [category]);
    
    client.release();
    return result.rows;
  } catch (error) {
    console.error('Error fetching guidelines by category:', error);
    throw error;
  }
};

/**
 * Get cached guidelines (with TTL)
 */
export const getCachedGuidelines = async () => {
  const now = Date.now();
  
  // Return cached data if still valid
  if (guidelinesCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return guidelinesCache;
  }
  
  // Fetch fresh data
  guidelinesCache = await getAllGuidelines();
  cacheTimestamp = now;
  
  return guidelinesCache;
};

/**
 * Get applicable guidelines for a patient based on their data
 */
export const getApplicableGuidelines = async (patientData) => {
  try {
    const allGuidelines = await getCachedGuidelines();
    const applicable = [];
    
    for (const guideline of allGuidelines) {
      if (matchesPatientCriteria(patientData, guideline.criteria)) {
        applicable.push(guideline);
      }
    }
    
    return applicable;
  } catch (error) {
    console.error('Error getting applicable guidelines:', error);
    return [];
  }
};

/**
 * Check if patient data matches guideline criteria
 */
const matchesPatientCriteria = (patientData, criteria) => {
  if (!criteria || typeof criteria !== 'object') {
    return false;
  }
  
  // Check age range
  if (criteria.age_min !== undefined || criteria.age_max !== undefined) {
    const age = patientData.age || calculateAge(patientData.dateOfBirth || patientData.date_of_birth);
    if (criteria.age_min !== undefined && age < criteria.age_min) return false;
    if (criteria.age_max !== undefined && age > criteria.age_max) return false;
  }
  
  // Check PSA range
  if (criteria.psa_min !== undefined || criteria.psa_max !== undefined) {
    const psa = parseFloat(patientData.initialPSA || patientData.initial_psa || 0);
    if (criteria.psa_min !== undefined && psa < criteria.psa_min) return false;
    if (criteria.psa_max !== undefined && psa > criteria.psa_max) return false;
  }
  
  // Check gender
  if (criteria.gender && criteria.gender.length > 0) {
    const patientGender = patientData.gender || '';
    if (!criteria.gender.includes(patientGender)) return false;
  }
  
  // Check pathway
  if (criteria.pathway && criteria.pathway.length > 0) {
    const patientPathway = patientData.carePathway || patientData.care_pathway || '';
    if (!criteria.pathway.includes(patientPathway)) return false;
  }
  
  return true;
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
 * Clear guidelines cache (useful when guidelines are updated)
 */
export const clearGuidelinesCache = () => {
  guidelinesCache = null;
  cacheTimestamp = null;
};

