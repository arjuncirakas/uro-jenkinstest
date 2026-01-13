import pool from '../config/database.js';

/**
 * Data Classification Service
 * Manages formal data classification levels (1-5) for GDPR/HIPAA compliance
 */

// Classification level definitions
export const CLASSIFICATION_LEVELS = {
  LEVEL_1: { level: 1, label: 'Non-Sensitive', description: 'Public information' },
  LEVEL_2: { level: 2, label: 'Internal', description: 'Employee directories, internal communications' },
  LEVEL_3: { level: 3, label: 'Sensitive', description: 'Patient demographic data, appointment history' },
  LEVEL_4: { level: 4, label: 'Highly Sensitive', description: 'Medical diagnoses, treatment plans, PSA results' },
  LEVEL_5: { level: 5, label: 'Critical', description: 'Full medical records, genetic data, surgical details' }
};

/**
 * Get classification level for a table
 * Returns default classification if not explicitly set
 */
export const getTableClassification = async (tableName) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM data_classification_metadata WHERE table_name = $1`,
      [tableName]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Return default classification based on table name pattern
    return getDefaultClassification(tableName);
  } catch (error) {
    console.error('Error getting table classification:', error);
    // Return default on error to ensure backward compatibility
    return getDefaultClassification(tableName);
  } finally {
    client.release();
  }
};

/**
 * Get default classification based on table name patterns
 * This maintains backward compatibility
 */
const getDefaultClassification = (tableName) => {
  const lowerName = tableName.toLowerCase();
  
  // Level 5 - Critical: Full medical records
  if (lowerName.includes('patient') && 
      (lowerName.includes('note') || lowerName.includes('diagnosis') || 
       lowerName.includes('treatment') || lowerName.includes('surgery'))) {
    return {
      table_name: tableName,
      classification_level: 5,
      classification_label: 'Critical',
      description: 'Full medical records, genetic data, surgical details'
    };
  }
  
  // Level 4 - Highly Sensitive: Medical data
  if (lowerName.includes('patient') || lowerName.includes('psa') || 
      lowerName.includes('investigation') || lowerName.includes('medical') ||
      lowerName.includes('diagnosis') || lowerName.includes('treatment')) {
    return {
      table_name: tableName,
      classification_level: 4,
      classification_label: 'Highly Sensitive',
      description: 'Medical diagnoses, treatment plans, PSA results'
    };
  }
  
  // Level 3 - Sensitive: Patient demographic and appointment data
  if (lowerName.includes('appointment') || lowerName.includes('booking') ||
      lowerName.includes('consent') || lowerName.includes('mdt')) {
    return {
      table_name: tableName,
      classification_level: 3,
      classification_label: 'Sensitive',
      description: 'Patient demographic data, appointment history'
    };
  }
  
  // Level 2 - Internal: User/employee data
  if (lowerName.includes('user') || lowerName.includes('doctor') || 
      lowerName.includes('nurse') || lowerName.includes('department')) {
    return {
      table_name: tableName,
      classification_level: 2,
      classification_label: 'Internal',
      description: 'Employee directories, internal communications'
    };
  }
  
  // Level 1 - Non-Sensitive: System/audit data
  if (lowerName.includes('audit') || lowerName.includes('log') ||
      lowerName.includes('token') || lowerName.includes('otp')) {
    return {
      table_name: tableName,
      classification_level: 1,
      classification_label: 'Non-Sensitive',
      description: 'Public information, system logs'
    };
  }
  
  // Default to Level 3 if unknown
  return {
    table_name: tableName,
    classification_level: 3,
    classification_label: 'Sensitive',
    description: 'Unknown data type - default classification'
  };
};

/**
 * Set or update classification for a table
 */
export const setTableClassification = async (tableName, level, description = null) => {
  const client = await pool.connect();
  
  try {
    if (level < 1 || level > 5) {
      throw new Error('Classification level must be between 1 and 5');
    }
    
    const label = CLASSIFICATION_LEVELS[`LEVEL_${level}`]?.label || 'Unknown';
    
    await client.query(`
      INSERT INTO data_classification_metadata 
        (table_name, classification_level, classification_label, description, updated_at, last_reviewed_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (table_name) 
      DO UPDATE SET 
        classification_level = $2,
        classification_label = $3,
        description = COALESCE($4, data_classification_metadata.description),
        updated_at = CURRENT_TIMESTAMP,
        last_reviewed_at = CURRENT_TIMESTAMP
    `, [tableName, level, label, description]);
    
    return { success: true, message: `Classification set to Level ${level} for ${tableName}` };
  } catch (error) {
    console.error('Error setting table classification:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get all table classifications
 */
export const getAllClassifications = async () => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT * FROM data_classification_metadata 
      ORDER BY classification_level DESC, table_name ASC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting all classifications:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Initialize default classifications for all existing tables
 * This can be run once to populate the metadata table
 */
export const initializeDefaultClassifications = async () => {
  const client = await pool.connect();
  
  try {
    // Get all tables
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const classifications = [];
    
    for (const table of tablesResult.rows) {
      const defaultClass = getDefaultClassification(table.tablename);
      classifications.push({
        table_name: table.tablename,
        classification_level: defaultClass.classification_level,
        classification_label: defaultClass.classification_label,
        description: defaultClass.description
      });
    }
    
    // Insert all classifications
    for (const classification of classifications) {
      await setTableClassification(
        classification.table_name,
        classification.classification_level,
        classification.description
      );
    }
    
    return { 
      success: true, 
      message: `Initialized classifications for ${classifications.length} tables`,
      classifications 
    };
  } catch (error) {
    console.error('Error initializing classifications:', error);
    throw error;
  } finally {
    client.release();
  }
};


