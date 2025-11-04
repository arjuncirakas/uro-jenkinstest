import pool from '../config/database.js';

/**
 * Get discharge summary for a patient
 * GET /api/patients/:patientId/discharge-summary
 */
export const getDischargeSummary = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Get discharge summary from database
    const result = await pool.query(
      `SELECT 
        ds.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.upi,
        u.first_name || ' ' || u.last_name as consultant_name
       FROM discharge_summaries ds
       LEFT JOIN patients p ON ds.patient_id = p.id
       LEFT JOIN users u ON ds.consultant_id = u.id
       WHERE ds.patient_id = $1
       AND ds.is_deleted = false
       ORDER BY ds.discharge_date DESC
       LIMIT 1`,
      [patientId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No discharge summary found for this patient'
      });
    }
    
    const summary = result.rows[0];
    
    res.json({
      success: true,
      message: 'Discharge summary retrieved successfully',
      data: {
        id: summary.id,
        patientId: summary.patient_id,
        patientName: summary.patient_name,
        upi: summary.upi,
        admissionDate: summary.admission_date,
        dischargeDate: summary.discharge_date,
        dischargeTime: summary.discharge_time,
        lengthOfStay: summary.length_of_stay,
        consultantName: summary.consultant_name,
        consultantId: summary.consultant_id,
        ward: summary.ward,
        diagnosis: summary.diagnosis, // JSON field
        procedure: summary.procedure, // JSON field
        clinicalSummary: summary.clinical_summary,
        investigations: summary.investigations, // JSON field
        medications: summary.medications, // JSON field
        followUp: summary.follow_up, // JSON field
        gpActions: summary.gp_actions, // JSON field (array)
        dischargedBy: summary.discharged_by,
        documents: summary.documents, // JSON field (array)
        createdAt: summary.created_at,
        updatedAt: summary.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching discharge summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discharge summary',
      error: error.message
    });
  }
};

/**
 * Create or update discharge summary for a patient
 * POST /api/patients/:patientId/discharge-summary
 */
export const createDischargeSummary = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const {
      admissionDate,
      dischargeDate,
      dischargeTime,
      lengthOfStay,
      consultantId,
      ward,
      diagnosis,
      procedure,
      clinicalSummary,
      investigations,
      medications,
      followUp,
      gpActions,
      dischargedBy,
      documents,
      additionalNotes
    } = req.body;
    
    const userId = req.user.id;
    
    // Validate required fields
    if (!admissionDate || !dischargeDate || !clinicalSummary) {
      return res.status(400).json({
        success: false,
        message: 'Admission date, discharge date, and clinical summary are required'
      });
    }
    
    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, upi, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );
    
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Calculate length of stay if not provided
    let calculatedLengthOfStay = lengthOfStay;
    if (!calculatedLengthOfStay) {
      const admitDate = new Date(admissionDate);
      const disDate = new Date(dischargeDate);
      calculatedLengthOfStay = Math.ceil((disDate - admitDate) / (1000 * 60 * 60 * 24));
    }
    
    // Get consultant name if consultantId provided
    let finalConsultantId = consultantId || userId;
    
    // Build comprehensive clinical summary with additional notes
    const fullClinicalSummary = additionalNotes 
      ? `${clinicalSummary}\n\nADDITIONAL NOTES:\n${additionalNotes}`
      : clinicalSummary;
    
    // Check if discharge summary already exists for this patient
    const existingCheck = await client.query(
      'SELECT id FROM discharge_summaries WHERE patient_id = $1 AND is_deleted = false',
      [patientId]
    );
    
    let result;
    
    if (existingCheck.rows.length > 0) {
      // Update existing discharge summary
      result = await client.query(
        `UPDATE discharge_summaries
         SET admission_date = $1,
             discharge_date = $2,
             discharge_time = $3,
             length_of_stay = $4,
             consultant_id = $5,
             ward = $6,
             diagnosis = $7,
             procedure = $8,
             clinical_summary = $9,
             investigations = $10,
             medications = $11,
             follow_up = $12,
             gp_actions = $13,
             discharged_by = $14,
             documents = $15,
             updated_by = $16,
             updated_at = CURRENT_TIMESTAMP
         WHERE patient_id = $17 AND is_deleted = false
         RETURNING *`,
        [
          admissionDate, dischargeDate, dischargeTime, calculatedLengthOfStay,
          finalConsultantId, ward,
          JSON.stringify(diagnosis), JSON.stringify(procedure),
          fullClinicalSummary, JSON.stringify(investigations || []),
          JSON.stringify(medications), JSON.stringify(followUp),
          JSON.stringify(gpActions || []), dischargedBy || `Dr. ${req.user.first_name} ${req.user.last_name}`,
          JSON.stringify(documents || []), userId, patientId
        ]
      );
    } else {
      // Insert new discharge summary
      result = await client.query(
        `INSERT INTO discharge_summaries (
          patient_id, admission_date, discharge_date, discharge_time,
          length_of_stay, consultant_id, ward, diagnosis, procedure,
          clinical_summary, investigations, medications, follow_up,
          gp_actions, discharged_by, documents, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
        RETURNING *`,
        [
          patientId, admissionDate, dischargeDate, dischargeTime,
          calculatedLengthOfStay, finalConsultantId, ward,
          JSON.stringify(diagnosis), JSON.stringify(procedure),
          fullClinicalSummary, JSON.stringify(investigations || []),
          JSON.stringify(medications), JSON.stringify(followUp),
          JSON.stringify(gpActions || []), dischargedBy || `Dr. ${req.user.first_name} ${req.user.last_name}`,
          JSON.stringify(documents || []), userId
        ]
      );
    }
    
    const dischargeSummary = result.rows[0];
    
    res.status(201).json({
      success: true,
      message: existingCheck.rows.length > 0 ? 'Discharge summary updated successfully' : 'Discharge summary created successfully',
      data: {
        id: dischargeSummary.id,
        patientId: dischargeSummary.patient_id,
        admissionDate: dischargeSummary.admission_date,
        dischargeDate: dischargeSummary.discharge_date,
        dischargeTime: dischargeSummary.discharge_time,
        lengthOfStay: dischargeSummary.length_of_stay,
        consultantId: dischargeSummary.consultant_id,
        ward: dischargeSummary.ward,
        diagnosis: dischargeSummary.diagnosis,
        procedure: dischargeSummary.procedure,
        clinicalSummary: dischargeSummary.clinical_summary,
        investigations: dischargeSummary.investigations,
        medications: dischargeSummary.medications,
        followUp: dischargeSummary.follow_up,
        gpActions: dischargeSummary.gp_actions,
        dischargedBy: dischargeSummary.discharged_by,
        documents: dischargeSummary.documents,
        createdAt: dischargeSummary.created_at,
        updatedAt: dischargeSummary.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating discharge summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create discharge summary',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Update discharge summary
 * PUT /api/patients/:patientId/discharge-summary/:summaryId
 */
export const updateDischargeSummary = async (req, res) => {
  try {
    const { patientId, summaryId } = req.params;
    const updateFields = req.body;
    const userId = req.user.id;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updateFields)) {
      // Convert camelCase to snake_case
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      // Handle JSON fields
      if (['diagnosis', 'procedure', 'investigations', 'medications', 'follow_up', 'gp_actions', 'documents'].includes(dbKey)) {
        updates.push(`${dbKey} = $${paramCount}`);
        values.push(JSON.stringify(value));
      } else {
        updates.push(`${dbKey} = $${paramCount}`);
        values.push(value);
      }
      paramCount++;
    }
    
    // Add updated_by and updated_at
    updates.push(`updated_by = $${paramCount}`);
    values.push(userId);
    paramCount++;
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    // Add WHERE conditions
    values.push(summaryId);
    values.push(patientId);
    
    const query = `
      UPDATE discharge_summaries
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND patient_id = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Discharge summary not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Discharge summary updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating discharge summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update discharge summary',
      error: error.message
    });
  }
};

/**
 * Delete discharge summary (soft delete)
 * DELETE /api/patients/:patientId/discharge-summary/:summaryId
 */
export const deleteDischargeSummary = async (req, res) => {
  try {
    const { patientId, summaryId } = req.params;
    
    const result = await pool.query(
      `UPDATE discharge_summaries
       SET is_deleted = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND patient_id = $2
       RETURNING id`,
      [summaryId, patientId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Discharge summary not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Discharge summary deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting discharge summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete discharge summary',
      error: error.message
    });
  }
};




