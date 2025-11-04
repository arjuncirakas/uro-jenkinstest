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
      documents
    } = req.body;
    
    const userId = req.user.id;
    
    // Insert discharge summary
    const result = await pool.query(
      `INSERT INTO discharge_summaries (
        patient_id, admission_date, discharge_date, discharge_time,
        length_of_stay, consultant_id, ward, diagnosis, procedure,
        clinical_summary, investigations, medications, follow_up,
        gp_actions, discharged_by, documents, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $17)
      RETURNING *`,
      [
        patientId, admissionDate, dischargeDate, dischargeTime,
        lengthOfStay, consultantId, ward,
        JSON.stringify(diagnosis), JSON.stringify(procedure),
        clinicalSummary, JSON.stringify(investigations),
        JSON.stringify(medications), JSON.stringify(followUp),
        JSON.stringify(gpActions), dischargedBy,
        JSON.stringify(documents), userId
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Discharge summary created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating discharge summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create discharge summary',
      error: error.message
    });
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




