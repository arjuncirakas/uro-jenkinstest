import pool from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for template uploads
const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'consent-forms', 'templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `template-${uniqueSuffix}${ext}`);
  }
});

const templateFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for templates'));
  }
};

export const uploadTemplate = multer({
  storage: templateStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: templateFileFilter
});

// Configure multer for patient consent form uploads
const patientConsentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'consent-forms', 'patients');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `patient-consent-${uniqueSuffix}${ext}`);
  }
});

const patientConsentFileFilter = (req, file, cb) => {
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

export const uploadPatientConsent = multer({
  storage: patientConsentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: patientConsentFileFilter
});

// Get all consent form templates
export const getConsentFormTemplates = async (req, res) => {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT 
        id,
        name,
        procedure_name,
        test_name,
        is_auto_generated,
        template_file_path,
        template_file_name,
        template_file_size,
        created_at,
        updated_at
      FROM consent_forms 
      WHERE procedure_name IS NOT NULL OR test_name IS NOT NULL
      ORDER BY created_at DESC
    `);

    // Add full URL for template files
    const templates = result.rows.map(template => ({
      ...template,
      template_file_url: template.template_file_path
        ? `${req.protocol}://${req.get('host')}/${template.template_file_path}`
        : null
    }));

    return res.status(200).json({
      success: true,
      message: 'Consent form templates retrieved successfully',
      data: { templates }
    });
  } catch (error) {
    console.error('Error fetching consent form templates:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch consent form templates',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Create a new consent form template
export const createConsentFormTemplate = async (req, res) => {
  const client = await pool.connect();

  try {
    const { procedure_name, test_name, is_auto_generated } = req.body;
    const file = req.file;

    // Validate input
    if (!procedure_name?.trim() && !test_name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Either procedure name or test name is required'
      });
    }

    const isAutoGen = is_auto_generated === 'true' || is_auto_generated === true;

    // If not auto-generated, file is required
    if (!isAutoGen && !file) {
      return res.status(400).json({
        success: false,
        message: 'Template file is required when auto-generation is disabled'
      });
    }

    const name = procedure_name || test_name;

    // Check if template already exists
    const existingTemplate = await client.query(`
      SELECT id FROM consent_forms 
      WHERE (procedure_name IS NOT NULL AND LOWER(procedure_name) = LOWER($1))
         OR (test_name IS NOT NULL AND LOWER(test_name) = LOWER($1))
    `, [name.trim()]);

    if (existingTemplate.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A template with this name already exists'
      });
    }

    let templateFilePath = null;
    let templateFileName = null;
    let templateFileSize = null;

    if (file) {
      templateFilePath = path.join('uploads', 'consent-forms', 'templates', file.filename);
      templateFileName = file.originalname;
      templateFileSize = file.size;
    }

    // Insert new template
    const result = await client.query(`
      INSERT INTO consent_forms 
      (name, procedure_name, test_name, is_auto_generated, template_file_path, template_file_name, template_file_size, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING *
    `, [
      name.trim(),
      procedure_name ? procedure_name.trim() : null,
      test_name ? test_name.trim() : null,
      isAutoGen,
      templateFilePath,
      templateFileName,
      templateFileSize
    ]);

    const template = result.rows[0];
    template.template_file_url = templateFilePath
      ? `${req.protocol}://${req.get('host')}/${templateFilePath}`
      : null;

    return res.status(201).json({
      success: true,
      message: 'Consent form template created successfully',
      data: { template }
    });
  } catch (error) {
    console.error('Error creating consent form template:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create consent form template',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Update a consent form template
export const updateConsentFormTemplate = async (req, res) => {
  const client = await pool.connect();

  try {
    const { templateId } = req.params;
    const { procedure_name, test_name, is_auto_generated } = req.body;
    const file = req.file;

    // Validate input
    if (!procedure_name?.trim() && !test_name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Either procedure name or test name is required'
      });
    }

    // Check if template exists
    const existingTemplate = await client.query(
      'SELECT id, template_file_path FROM consent_forms WHERE id = $1',
      [templateId]
    );

    if (existingTemplate.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const name = procedure_name || test_name;

    // Check if another template with same name exists
    const duplicateCheck = await client.query(`
      SELECT id FROM consent_forms 
      WHERE id != $1 
      AND ((procedure_name IS NOT NULL AND LOWER(procedure_name) = LOWER($2))
         OR (test_name IS NOT NULL AND LOWER(test_name) = LOWER($2)))
    `, [templateId, name.trim()]);

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A template with this name already exists'
      });
    }

    let templateFilePath = existingTemplate.rows[0].template_file_path;
    let templateFileName = null;
    let templateFileSize = null;

    // If new file is uploaded, replace the old one
    if (file) {
      // Delete old file if exists
      if (templateFilePath) {
        const oldFilePath = path.join(process.cwd(), templateFilePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      templateFilePath = path.join('uploads', 'consent-forms', 'templates', file.filename);
      templateFileName = file.originalname;
      templateFileSize = file.size;
    }

    const isAutoGen = is_auto_generated === 'true' || is_auto_generated === true;

    // Update template
    const result = await client.query(`
      UPDATE consent_forms 
      SET name = $1, 
          procedure_name = $2, 
          test_name = $3, 
          is_auto_generated = $4,
          template_file_path = $5,
          template_file_name = COALESCE($6, template_file_name),
          template_file_size = COALESCE($7, template_file_size),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [
      name.trim(),
      procedure_name ? procedure_name.trim() : null,
      test_name ? test_name.trim() : null,
      isAutoGen,
      templateFilePath,
      templateFileName,
      templateFileSize,
      templateId
    ]);

    const template = result.rows[0];
    template.template_file_url = templateFilePath
      ? `${req.protocol}://${req.get('host')}/${templateFilePath}`
      : null;

    return res.status(200).json({
      success: true,
      message: 'Consent form template updated successfully',
      data: { template }
    });
  } catch (error) {
    console.error('Error updating consent form template:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update consent form template',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Delete a consent form template
export const deleteConsentFormTemplate = async (req, res) => {
  const client = await pool.connect();

  try {
    const { templateId } = req.params;

    // Check if template exists and get file path
    const template = await client.query(
      'SELECT id, template_file_path FROM consent_forms WHERE id = $1',
      [templateId]
    );

    if (template.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Delete file if exists
    const filePath = template.rows[0].template_file_path;
    if (filePath) {
      const fullPath = path.join(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Delete template from database
    await client.query('DELETE FROM consent_forms WHERE id = $1', [templateId]);

    return res.status(200).json({
      success: true,
      message: 'Consent form template deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting consent form template:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete consent form template',
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

    const result = await client.query(`
      SELECT 
        pcf.id,
        pcf.patient_id,
        pcf.consent_form_id,
        pcf.file_path,
        pcf.file_name,
        pcf.file_size,
        pcf.uploaded_at,
        cf.name as consent_form_name,
        cf.procedure_name,
        cf.test_name
      FROM patient_consent_forms pcf
      JOIN consent_forms cf ON pcf.consent_form_id = cf.id
      WHERE pcf.patient_id = $1
      ORDER BY pcf.uploaded_at DESC
    `, [patientId]);

    // Add full URL for files
    const consentForms = result.rows.map(form => ({
      ...form,
      file_url: form.file_path 
        ? `${req.protocol}://${req.get('host')}/${form.file_path}`
        : null
    }));

    return res.status(200).json({
      success: true,
      message: 'Patient consent forms retrieved successfully',
      data: {
        consentForms
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

// Upload patient consent form
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
      'SELECT id FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify consent form template exists
    const formCheck = await client.query(
      'SELECT id, name FROM consent_forms WHERE id = $1',
      [consentFormId]
    );

    if (formCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consent form template not found'
      });
    }

    const filePath = path.join('uploads', 'consent-forms', 'patients', file.filename);

    // Check if patient already has this consent form uploaded
    const existingUpload = await client.query(
      `SELECT id FROM patient_consent_forms 
       WHERE patient_id = $1 AND consent_form_id = $2`,
      [patientId, consentFormId]
    );

    if (existingUpload.rows.length > 0) {
      // Update existing record
      const oldFile = await client.query(
        'SELECT file_path FROM patient_consent_forms WHERE id = $1',
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
