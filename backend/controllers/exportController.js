import pool from '../config/database.js';
import { logDataExport } from '../services/auditLogger.js';

// Field mapping for SQL queries - shared configuration
const FIELD_MAP = {
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

// Default fields for export
const DEFAULT_FIELDS = [
  'upi', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email',
  'referral_date', 'initial_psa', 'initial_psa_date', 'care_pathway', 'status',
  'assigned_urologist', 'priority', 'created_at'
];

/**
 * Generate SQL condition for date-based patient filtering
 */
const generateDateExistsCondition = (paramIndex, operator, nextParamIndex = null) => {
  const dateCondition = (field, alias) => {
    return nextParamIndex
      ? `${alias}.${field} ${operator} $${paramIndex} AND ${alias}.${field} <= $${nextParamIndex}`
      : `${alias}.${field} ${operator} $${paramIndex}`;
  };

  const appointmentDate = dateCondition('appointment_date', 'a');
  const scheduledDate = dateCondition('scheduled_date', 'ib');
  const createdAt = dateCondition('created_at', 'p');

  return `(
    EXISTS (
      SELECT 1 FROM appointments a 
      WHERE a.patient_id = p.id 
      AND a.appointment_date IS NOT NULL 
      AND ${appointmentDate}
    ) OR EXISTS (
      SELECT 1 FROM investigation_bookings ib 
      WHERE ib.patient_id = p.id 
      AND ib.scheduled_date IS NOT NULL 
      AND ${scheduledDate}
    )
    OR (
      NOT EXISTS (SELECT 1 FROM appointments WHERE patient_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM investigation_bookings WHERE patient_id = p.id AND scheduled_date IS NOT NULL)
      AND ${createdAt}
    )
  )`;
};

/**
 * Build date conditions for OPD Queue queries
 */
const buildDateConditions = (startDate, endDate, paramIndex, params) => {
  if (startDate && endDate) {
    params.push(startDate, endDate);
    return [generateDateExistsCondition(paramIndex, '>=', paramIndex + 1)];
  }
  if (startDate) {
    params.push(startDate);
    return [generateDateExistsCondition(paramIndex, '>=')];
  }
  if (endDate) {
    params.push(endDate);
    return [generateDateExistsCondition(paramIndex, '<=')];
  }
  return [];
};

/**
 * Add date filters to where conditions
 */
const addDateFilters = (whereConditions, params, startDate, endDate) => {
  let paramIndex = params.length + 1;
  if (startDate) {
    whereConditions.push(`p.created_at >= $${paramIndex}`);
    params.push(startDate);
    paramIndex++;
  }
  if (endDate) {
    whereConditions.push(`p.created_at <= $${paramIndex}`);
    params.push(endDate);
  }
};

/**
 * Add care pathway filter to where conditions
 */
const addCarePathwayFilter = (whereConditions, params, carePathway) => {
  const paramIndex = params.length + 1;
  if (carePathway === 'OPD Queue') {
    whereConditions.push(`(p.care_pathway = $${paramIndex} OR p.care_pathway IS NULL OR p.care_pathway = '')`);
  } else {
    whereConditions.push(`p.care_pathway = $${paramIndex}`);
  }
  params.push(carePathway);
};

/**
 * Add status filter to where conditions
 */
const addStatusFilter = (whereConditions, params, status) => {
  const paramIndex = params.length + 1;
  whereConditions.push(`p.status = $${paramIndex}`);
  params.push(status);
};

/**
 * Build SQL query string
 */
const buildQueryString = (selectFields, whereConditions) => {
  const whereClause = whereConditions.length > 0
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  return `
    SELECT ${selectFields.join(', ')}
    FROM patients p
    ${whereClause}
    ORDER BY p.created_at DESC
  `;
};

/**
 * Build query parameters for patient export - simplified for lower cognitive complexity
 */
const buildExportQuery = (queryParams) => {
  const { fields, startDate, endDate, carePathway, status } = queryParams;
  const selectedFields = fields ? fields.split(',') : DEFAULT_FIELDS;
  const whereConditions = [];
  const params = [];

  // Determine if we need appointment-based date filtering
  const needsAppointmentJoin = carePathway === 'OPD Queue' && (startDate || endDate);

  // Add date filters (different logic for OPD Queue)
  if (!needsAppointmentJoin) {
    addDateFilters(whereConditions, params, startDate, endDate);
  }

  // Add care pathway filter
  if (carePathway) {
    addCarePathwayFilter(whereConditions, params, carePathway);
  }

  // Add status filter
  if (status) {
    addStatusFilter(whereConditions, params, status);
  }

  // Build SELECT fields
  const selectFields = selectedFields
    .filter(field => FIELD_MAP[field])
    .map(field => `${FIELD_MAP[field]} AS "${field}"`);

  if (selectFields.length === 0) {
    return { error: 'No valid fields selected' };
  }

  // Add OPD Queue date conditions if needed
  if (needsAppointmentJoin) {
    const paramIndex = params.length + 1;
    const dateConditions = buildDateConditions(startDate, endDate, paramIndex, params);
    if (dateConditions.length > 0) {
      whereConditions.push(dateConditions.join(' AND '));
    }
  }

  const query = buildQueryString(selectFields, whereConditions);
  return { query, params, selectedFields, selectFields };
};

/**
 * Convert rows to CSV format
 */
const convertToCSV = (rows, headers) => {
  const csvRows = [headers.join(',')];

  rows.forEach(row => {
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

  return csvRows.join('\n');
};

/**
 * Core export function - handles both CSV and Excel exports
 */
const exportPatients = async (req, res, format) => {
  const client = await pool.connect();
  try {
    const queryResult = buildExportQuery(req.query);

    if (queryResult.error) {
      return res.status(400).json({
        success: false,
        message: queryResult.error
      });
    }

    const { query, params, selectedFields } = queryResult;
    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for export'
      });
    }

    const headers = selectedFields.filter(field => FIELD_MAP[field]);
    const csvContent = convertToCSV(result.rows, headers);

    // Log export
    await logDataExport(req, `patient_export_${format}`, result.rows.length);

    // Set response headers based on format
    const filename = `patients_export_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
    }

    res.send(csvContent);

  } catch (error) {
    console.error(`Export patients to ${format.toUpperCase()} error:`, error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  } finally {
    client.release();
  }
};

/**
 * Export patient data to CSV
 */
export const exportPatientsToCSV = async (req, res) => {
  return exportPatients(req, res, 'csv');
};

/**
 * Export patient data to Excel
 */
export const exportPatientsToExcel = async (req, res) => {
  return exportPatients(req, res, 'excel');
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

// Export helper functions for testing
export const _testHelpers = {
  buildExportQuery,
  convertToCSV,
  buildDateConditions,
  generateDateExistsCondition,
  addDateFilters,
  addCarePathwayFilter,
  addStatusFilter,
  buildQueryString,
  FIELD_MAP,
  DEFAULT_FIELDS
};
