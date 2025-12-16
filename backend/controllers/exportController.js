import pool from '../config/database.js';
import { logDataExport } from '../services/auditLogger.js';

/**
 * Export patient data to CSV
 */
export const exportPatientsToCSV = async (req, res) => {
  const client = await pool.connect();
  try {
    const { fields, startDate, endDate, carePathway, status } = req.query;
    
    // Default fields if not specified
    const selectedFields = fields ? fields.split(',') : [
      'upi', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email',
      'referral_date', 'initial_psa', 'initial_psa_date', 'care_pathway', 'status',
      'assigned_urologist', 'priority', 'created_at'
    ];
    
    // Build WHERE clause
    const whereConditions = [];
    const params = [];
    let paramIndex = 1;
    let needsAppointmentJoin = false;
    
    // For OPD Queue, filter by appointment dates instead of created_at
    if (carePathway === 'OPD Queue' && (startDate || endDate)) {
      needsAppointmentJoin = true;
      // Date filtering will be done in the subquery join
    } else {
      // For other care pathways or when no dates provided, use created_at
      if (startDate) {
        whereConditions.push(`p.created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereConditions.push(`p.created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }
    }
    
    if (carePathway) {
      whereConditions.push(`p.care_pathway = $${paramIndex}`);
      params.push(carePathway);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Build SELECT clause with field mapping
    const fieldMap = {
      'upi': 'p.upi',
      'first_name': 'p.first_name',
      'last_name': 'p.last_name',
      'date_of_birth': "TO_CHAR(p.date_of_birth, 'YYYY-MM-DD')",
      'gender': 'p.gender',
      'phone': 'p.phone',
      'email': 'p.email',
      'address': 'p.address',
      'postcode': 'p.postcode',
      'city': 'p.city',
      'state': 'p.state',
      'referral_date': "TO_CHAR(p.referral_date, 'YYYY-MM-DD')",
      'referring_department': 'p.referring_department',
      'initial_psa': 'p.initial_psa',
      'initial_psa_date': "TO_CHAR(p.initial_psa_date, 'YYYY-MM-DD')",
      'care_pathway': 'p.care_pathway',
      'status': 'p.status',
      'assigned_urologist': 'p.assigned_urologist',
      'priority': 'p.priority',
      'medical_history': 'p.medical_history',
      'current_medications': 'p.current_medications',
      'allergies': 'p.allergies',
      'created_at': "TO_CHAR(p.created_at, 'YYYY-MM-DD HH24:MI:SS')",
      'updated_at': "TO_CHAR(p.updated_at, 'YYYY-MM-DD HH24:MI:SS')"
    };
    
    const selectFields = selectedFields
      .filter(field => fieldMap[field])
      .map(field => `${fieldMap[field]} AS "${field}"`);
    
    if (selectFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid fields selected' 
      });
    }
    
    // Build query with appropriate joins for OPD Queue
    let query;
    if (needsAppointmentJoin) {
      // For OPD Queue with date filters, use EXISTS to find patients with appointments in date range
      const appointmentExistsConditions = [];
      
      if (startDate && endDate) {
        appointmentExistsConditions.push(`(
          EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id 
            AND a.appointment_date IS NOT NULL 
            AND a.appointment_date >= $${paramIndex} 
            AND a.appointment_date <= $${paramIndex + 1}
          ) OR EXISTS (
            SELECT 1 FROM investigation_bookings ib 
            WHERE ib.patient_id = p.id 
            AND ib.scheduled_date IS NOT NULL 
            AND ib.scheduled_date >= $${paramIndex} 
            AND ib.scheduled_date <= $${paramIndex + 1}
          )
        )`);
        params.push(startDate, endDate);
        paramIndex += 2;
      } else if (startDate) {
        appointmentExistsConditions.push(`(
          EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id 
            AND a.appointment_date IS NOT NULL 
            AND a.appointment_date >= $${paramIndex}
          ) OR EXISTS (
            SELECT 1 FROM investigation_bookings ib 
            WHERE ib.patient_id = p.id 
            AND ib.scheduled_date IS NOT NULL 
            AND ib.scheduled_date >= $${paramIndex}
          )
        )`);
        params.push(startDate);
        paramIndex++;
      } else if (endDate) {
        appointmentExistsConditions.push(`(
          EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id 
            AND a.appointment_date IS NOT NULL 
            AND a.appointment_date <= $${paramIndex}
          ) OR EXISTS (
            SELECT 1 FROM investigation_bookings ib 
            WHERE ib.patient_id = p.id 
            AND ib.scheduled_date IS NOT NULL 
            AND ib.scheduled_date <= $${paramIndex}
          )
        )`);
        params.push(endDate);
        paramIndex++;
      }
      
      if (appointmentExistsConditions.length > 0) {
        whereConditions.push(appointmentExistsConditions.join(' AND '));
      }
      
      const finalWhereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      query = `
        SELECT ${selectFields.join(', ')}
        FROM patients p
        ${finalWhereClause}
        ORDER BY p.created_at DESC
      `;
    } else {
      // Standard query without appointment joins
      query = `
        SELECT ${selectFields.join(', ')}
        FROM patients p
        ${whereClause}
        ORDER BY p.created_at DESC
      `;
    }
    
    const result = await client.query(query, params);
    
    // Convert to CSV
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No data found for export' 
      });
    }
    
    // Get headers
    const headers = selectedFields.filter(field => fieldMap[field]);
    const csvRows = [headers.join(',')];
    
    // Add data rows
    result.rows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    // Log export
    await logDataExport(req, 'patient_export_csv', result.rows.length);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=patients_export_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export patients to CSV error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Export patient data to Excel (using CSV format with .xlsx extension)
 * For full Excel support, you would need a library like 'xlsx' or 'exceljs'
 */
export const exportPatientsToExcel = async (req, res) => {
  const client = await pool.connect();
  try {
    const { fields, startDate, endDate, carePathway, status } = req.query;
    
    // Default fields if not specified
    const selectedFields = fields ? fields.split(',') : [
      'upi', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email',
      'referral_date', 'initial_psa', 'initial_psa_date', 'care_pathway', 'status',
      'assigned_urologist', 'priority', 'created_at'
    ];
    
    // Build WHERE clause (same as CSV)
    const whereConditions = [];
    const params = [];
    let paramIndex = 1;
    let needsAppointmentJoin = false;
    
    // For OPD Queue, filter by appointment dates instead of created_at
    if (carePathway === 'OPD Queue' && (startDate || endDate)) {
      needsAppointmentJoin = true;
      // Date filtering will be done in the subquery join
    } else {
      // For other care pathways or when no dates provided, use created_at
      if (startDate) {
        whereConditions.push(`p.created_at >= $${paramIndex}`);
        params.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereConditions.push(`p.created_at <= $${paramIndex}`);
        params.push(endDate);
        paramIndex++;
      }
    }
    
    if (carePathway) {
      whereConditions.push(`p.care_pathway = $${paramIndex}`);
      params.push(carePathway);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    // Build SELECT clause
    const fieldMap = {
      'upi': 'p.upi',
      'first_name': 'p.first_name',
      'last_name': 'p.last_name',
      'date_of_birth': "TO_CHAR(p.date_of_birth, 'YYYY-MM-DD')",
      'gender': 'p.gender',
      'phone': 'p.phone',
      'email': 'p.email',
      'address': 'p.address',
      'postcode': 'p.postcode',
      'city': 'p.city',
      'state': 'p.state',
      'referral_date': "TO_CHAR(p.referral_date, 'YYYY-MM-DD')",
      'referring_department': 'p.referring_department',
      'initial_psa': 'p.initial_psa',
      'initial_psa_date': "TO_CHAR(p.initial_psa_date, 'YYYY-MM-DD')",
      'care_pathway': 'p.care_pathway',
      'status': 'p.status',
      'assigned_urologist': 'p.assigned_urologist',
      'priority': 'p.priority',
      'medical_history': 'p.medical_history',
      'current_medications': 'p.current_medications',
      'allergies': 'p.allergies',
      'created_at': "TO_CHAR(p.created_at, 'YYYY-MM-DD HH24:MI:SS')",
      'updated_at': "TO_CHAR(p.updated_at, 'YYYY-MM-DD HH24:MI:SS')"
    };
    
    const selectFields = selectedFields
      .filter(field => fieldMap[field])
      .map(field => `${fieldMap[field]} AS "${field}"`);
    
    if (selectFields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid fields selected' 
      });
    }
    
    // Build query with appropriate joins for OPD Queue
    let query;
    if (needsAppointmentJoin) {
      // For OPD Queue with date filters, use EXISTS to find patients with appointments in date range
      const appointmentExistsConditions = [];
      
      if (startDate && endDate) {
        appointmentExistsConditions.push(`(
          EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id 
            AND a.appointment_date IS NOT NULL 
            AND a.appointment_date >= $${paramIndex} 
            AND a.appointment_date <= $${paramIndex + 1}
          ) OR EXISTS (
            SELECT 1 FROM investigation_bookings ib 
            WHERE ib.patient_id = p.id 
            AND ib.scheduled_date IS NOT NULL 
            AND ib.scheduled_date >= $${paramIndex} 
            AND ib.scheduled_date <= $${paramIndex + 1}
          )
        )`);
        params.push(startDate, endDate);
        paramIndex += 2;
      } else if (startDate) {
        appointmentExistsConditions.push(`(
          EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id 
            AND a.appointment_date IS NOT NULL 
            AND a.appointment_date >= $${paramIndex}
          ) OR EXISTS (
            SELECT 1 FROM investigation_bookings ib 
            WHERE ib.patient_id = p.id 
            AND ib.scheduled_date IS NOT NULL 
            AND ib.scheduled_date >= $${paramIndex}
          )
        )`);
        params.push(startDate);
        paramIndex++;
      } else if (endDate) {
        appointmentExistsConditions.push(`(
          EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.patient_id = p.id 
            AND a.appointment_date IS NOT NULL 
            AND a.appointment_date <= $${paramIndex}
          ) OR EXISTS (
            SELECT 1 FROM investigation_bookings ib 
            WHERE ib.patient_id = p.id 
            AND ib.scheduled_date IS NOT NULL 
            AND ib.scheduled_date <= $${paramIndex}
          )
        )`);
        params.push(endDate);
        paramIndex++;
      }
      
      if (appointmentExistsConditions.length > 0) {
        whereConditions.push(appointmentExistsConditions.join(' AND '));
      }
      
      const finalWhereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';
      
      query = `
        SELECT ${selectFields.join(', ')}
        FROM patients p
        ${finalWhereClause}
        ORDER BY p.created_at DESC
      `;
    } else {
      // Standard query without appointment joins
      query = `
        SELECT ${selectFields.join(', ')}
        FROM patients p
        ${whereClause}
        ORDER BY p.created_at DESC
      `;
    }
    
    const result = await client.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No data found for export' 
      });
    }
    
    // Convert to CSV format (Excel can open CSV files)
    const headers = selectedFields.filter(field => fieldMap[field]);
    const csvRows = [headers.join(',')];
    
    result.rows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    
    // Log export
    await logDataExport(req, 'patient_export_excel', result.rows.length);
    
    // Set headers for Excel download (using CSV format)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=patients_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    res.send(csvContent);
    
  } catch (error) {
    console.error('Export patients to Excel error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Get available export fields
 */
export const getExportFields = async (req, res) => {
  try {
    const fields = [
      { id: 'upi', label: 'UPI', category: 'basic' },
      { id: 'first_name', label: 'First Name', category: 'basic' },
      { id: 'last_name', label: 'Last Name', category: 'basic' },
      { id: 'date_of_birth', label: 'Date of Birth', category: 'basic' },
      { id: 'gender', label: 'Gender', category: 'basic' },
      { id: 'phone', label: 'Phone', category: 'contact' },
      { id: 'email', label: 'Email', category: 'contact' },
      { id: 'address', label: 'Address', category: 'contact' },
      { id: 'postcode', label: 'Postcode', category: 'contact' },
      { id: 'city', label: 'City', category: 'contact' },
      { id: 'state', label: 'State', category: 'contact' },
      { id: 'referral_date', label: 'Referral Date', category: 'clinical' },
      { id: 'referring_department', label: 'Referring Department', category: 'clinical' },
      { id: 'initial_psa', label: 'Initial PSA', category: 'clinical' },
      { id: 'initial_psa_date', label: 'Initial PSA Date', category: 'clinical' },
      { id: 'care_pathway', label: 'Care Pathway', category: 'clinical' },
      { id: 'status', label: 'Status', category: 'clinical' },
      { id: 'assigned_urologist', label: 'Assigned Urologist', category: 'clinical' },
      { id: 'priority', label: 'Priority', category: 'clinical' },
      { id: 'medical_history', label: 'Medical History', category: 'medical' },
      { id: 'current_medications', label: 'Current Medications', category: 'medical' },
      { id: 'allergies', label: 'Allergies', category: 'medical' },
      { id: 'created_at', label: 'Created At', category: 'system' },
      { id: 'updated_at', label: 'Updated At', category: 'system' }
    ];
    
    res.json({
      success: true,
      data: { fields }
    });
  } catch (error) {
    console.error('Get export fields error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

