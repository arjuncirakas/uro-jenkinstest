import pool from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'consent-forms');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `consent-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow PDF, DOC, DOCX, JPG, JPEG, PNG
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, PNG files are allowed.'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Get all consent forms
export const getConsentForms = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT id, name, created_at, updated_at 
       FROM consent_forms 
       ORDER BY name ASC`
    );

    return res.status(200).json({
      success: true,
      message: 'Consent forms retrieved successfully',
      data: {
        consentForms: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching consent forms:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch consent forms',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Create a new consent form
export const createConsentForm = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Consent form name is required'
      });
    }

    // Check if consent form with same name already exists
    const existingForm = await client.query(
      `SELECT id FROM consent_forms WHERE LOWER(name) = LOWER($1)`,
      [name.trim()]
    );

    if (existingForm.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A consent form with this name already exists'
      });
    }

    // Insert new consent form
    const result = await client.query(
      `INSERT INTO consent_forms (name, created_at, updated_at) 
       VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [name.trim()]
    );

    return res.status(201).json({
      success: true,
      message: 'Consent form created successfully',
      data: {
        consentForm: result.rows[0]
      }
    });
  } catch (error) {
    console.error('Error creating consent form:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create consent form',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Upload consent form file for a patient
export const uploadPatientConsentForm = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { consentFormId } = req.body;
    const file = req.file;

    if (!consentFormId) {
      return res.status(400).json({
        success: false,
        message: 'Consent form ID is required'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    // Verify patient exists
    const patientCheck = await client.query(
      `SELECT id FROM patients WHERE id = $1`,
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify consent form exists
    const formCheck = await client.query(
      `SELECT id, name FROM consent_forms WHERE id = $1`,
      [consentFormId]
    );

    if (formCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent form not found'
      });
    }

    // Check if patient already has this consent form uploaded
    const existingUpload = await client.query(
      `SELECT id FROM patient_consent_forms 
       WHERE patient_id = $1 AND consent_form_id = $2`,
      [patientId, consentFormId]
    );

    const filePath = path.join('uploads', 'consent-forms', file.filename);

    if (existingUpload.rows.length > 0) {
      // Update existing record
      const oldFile = await client.query(
        `SELECT file_path FROM patient_consent_forms WHERE id = $1`,
        [existingUpload.rows[0].id]
      );

      // Delete old file if exists
      if (oldFile.rows[0]?.file_path) {
        const oldFilePath = path.join(process.cwd(), oldFile.rows[0].file_path);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const result = await client.query(
        `UPDATE patient_consent_forms 
         SET file_path = $1, file_name = $2, file_size = $3, uploaded_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [filePath, file.originalname, file.size, existingUpload.rows[0].id]
      );

      return res.status(200).json({
        success: true,
        message: 'Consent form file updated successfully',
        data: result.rows[0]
      });
    } else {
      // Insert new record
      const result = await client.query(
        `INSERT INTO patient_consent_forms 
         (patient_id, consent_form_id, file_path, file_name, file_size, uploaded_at) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) 
         RETURNING *`,
        [patientId, consentFormId, filePath, file.originalname, file.size]
      );

      return res.status(201).json({
        success: true,
        message: 'Consent form file uploaded successfully',
        data: result.rows[0]
      });
    }
  } catch (error) {
    console.error('Error uploading consent form:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload consent form',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get patient consent forms
export const getPatientConsentForms = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;

    const result = await client.query(
      `SELECT 
        pcf.id,
        pcf.patient_id,
        pcf.consent_form_id,
        pcf.file_path,
        pcf.file_name,
        pcf.file_size,
        pcf.uploaded_at,
        cf.name as consent_form_name
       FROM patient_consent_forms pcf
       JOIN consent_forms cf ON pcf.consent_form_id = cf.id
       WHERE pcf.patient_id = $1
       ORDER BY pcf.uploaded_at DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      message: 'Patient consent forms retrieved successfully',
      data: {
        consentForms: result.rows
      }
    });
  } catch (error) {
    console.error('Error fetching patient consent forms:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patient consent forms',
      error: error.message
    });
  } finally {
    client.release();
  }
};

