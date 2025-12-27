import pool from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Import secure CORS helper - uses strict origin validation to prevent CORS misconfiguration attacks
import { setCorsHeaders } from '../utils/corsHelper.js';

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

// Export storage for testing purposes
export const _templateStorage = templateStorage;

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

// Export storage for testing purposes
export const _patientConsentStorage = patientConsentStorage;

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

    // Add full URL for template files using the API endpoint
    const templates = result.rows.map(template => {
      let templateFileUrl = null;
      if (template.template_file_path) {
        // Remove 'uploads/' prefix if present, as the API endpoint expects relative path
        let relativePath = template.template_file_path.replace(/\\/g, '/');
        if (relativePath.startsWith('uploads/')) {
          relativePath = relativePath.replace(/^uploads\//, '');
        }
        // Construct URL using the API endpoint
        templateFileUrl = `${req.protocol}://${req.get('host')}/api/consent-forms/files/${encodeURIComponent(relativePath)}`;
      }
      return {
      ...template,
        template_file_url: templateFileUrl
      };
    });

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
    // Construct URL using the API endpoint
    if (templateFilePath) {
      // Remove 'uploads/' prefix if present, as the API endpoint expects relative path
      let relativePath = templateFilePath.replace(/\\/g, '/');
      if (relativePath.startsWith('uploads/')) {
        relativePath = relativePath.replace(/^uploads\//, '');
      }
      template.template_file_url = `${req.protocol}://${req.get('host')}/api/consent-forms/files/${encodeURIComponent(relativePath)}`;
    } else {
      template.template_file_url = null;
    }

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

// Helper function to validate template update input
const validateTemplateUpdateInput = (procedure_name, test_name) => {
  if (!procedure_name?.trim() && !test_name?.trim()) {
    return {
      isValid: false,
      error: {
        status: 400,
        message: 'Either procedure name or test name is required'
      }
    };
  }
  return { isValid: true };
};

// Helper function to check if template exists
const checkTemplateExists = async (client, templateId) => {
  const result = await client.query(
    'SELECT id, template_file_path FROM consent_forms WHERE id = $1',
    [templateId]
  );
  
  if (result.rows.length === 0) {
    return {
      exists: false,
      error: {
        status: 404,
        message: 'Template not found'
      }
    };
  }
  
  return { exists: true, template: result.rows[0] };
};

// Helper function to check for duplicate template names
const checkDuplicateTemplateName = async (client, templateId, name) => {
  const result = await client.query(`
    SELECT id FROM consent_forms 
    WHERE id != $1 
    AND ((procedure_name IS NOT NULL AND LOWER(procedure_name) = LOWER($2))
       OR (test_name IS NOT NULL AND LOWER(test_name) = LOWER($2)))
  `, [templateId, name.trim()]);

  if (result.rows.length > 0) {
    return {
      isDuplicate: true,
      error: {
        status: 400,
        message: 'A template with this name already exists'
      }
    };
  }
  
  return { isDuplicate: false };
};

// Helper function to handle file upload for template update
const handleTemplateFileUpload = (file, existingFilePath) => {
  if (!file) {
    return {
      templateFilePath: existingFilePath,
      templateFileName: null,
      templateFileSize: null
    };
  }

  // Delete old file if exists
  if (existingFilePath) {
    const oldFilePath = path.join(process.cwd(), existingFilePath);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }
  }

  return {
    templateFilePath: path.join('uploads', 'consent-forms', 'templates', file.filename),
    templateFileName: file.originalname,
    templateFileSize: file.size
  };
};

// Helper function to construct template file URL
const constructTemplateFileUrl = (templateFilePath, req) => {
  if (!templateFilePath) {
    return null;
  }

  let relativePath = templateFilePath.replace(/\\/g, '/');
  if (relativePath.startsWith('uploads/')) {
    relativePath = relativePath.replace(/^uploads\//, '');
  }
  
  return `${req.protocol}://${req.get('host')}/api/consent-forms/files/${encodeURIComponent(relativePath)}`;
};

// Update a consent form template
export const updateConsentFormTemplate = async (req, res) => {
  const client = await pool.connect();

  try {
    const { templateId } = req.params;
    const { procedure_name, test_name, is_auto_generated } = req.body;
    const file = req.file;

    // Validate input
    const validation = validateTemplateUpdateInput(procedure_name, test_name);
    if (!validation.isValid) {
      return res.status(validation.error.status).json({
        success: false,
        message: validation.error.message
      });
    }

    // Check if template exists
    const templateCheck = await checkTemplateExists(client, templateId);
    if (!templateCheck.exists) {
      return res.status(templateCheck.error.status).json({
        success: false,
        message: templateCheck.error.message
      });
    }

    const name = procedure_name || test_name;

    // Check for duplicate names
    const duplicateCheck = await checkDuplicateTemplateName(client, templateId, name);
    if (duplicateCheck.isDuplicate) {
      return res.status(duplicateCheck.error.status).json({
        success: false,
        message: duplicateCheck.error.message
      });
    }

    // Handle file upload
    const fileInfo = handleTemplateFileUpload(file, templateCheck.template.template_file_path);
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
      fileInfo.templateFilePath,
      fileInfo.templateFileName,
      fileInfo.templateFileSize,
      templateId
    ]);

    const template = result.rows[0];
    template.template_file_url = constructTemplateFileUrl(fileInfo.templateFilePath, req);

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

// Serve consent form files
export const serveConsentFormFile = async (req, res) => {
  try {
    // Get the validated file path from middleware (already normalized and validated)
    const fullPath = req.validatedFilePath;

    if (!fullPath) {
      setCorsHeaders(req, res);
      return res.status(400).json({
        success: false,
        message: 'File path is required'
      });
    }

    // Set CORS headers explicitly for file responses
    setCorsHeaders(req, res);

    // Log the path being checked for debugging
    console.log('[serveConsentFormFile] Checking file:', {
      validatedPath: fullPath,
      exists: fs.existsSync(fullPath),
      originalParam: req.params.filePath
    });

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error('[serveConsentFormFile] File not found:', {
        checkedPath: fullPath,
        originalParam: req.params.filePath,
        cwd: process.cwd(),
        baseDir: path.join(process.cwd(), 'uploads'),
        uploadsExists: fs.existsSync(path.join(process.cwd(), 'uploads')),
        templatesDirExists: fs.existsSync(path.join(process.cwd(), 'uploads', 'consent-forms', 'templates'))
      });
      
      setCorsHeaders(req, res);
      return res.status(404).json({
        success: false,
        message: 'File not found. Please verify the file exists on the server.',
        debug: {
          checkedPath: fullPath,
          originalParam: req.params.filePath
        }
      });
    }

    // Set appropriate headers for file download/viewing
    const ext = path.extname(fullPath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file with error handling
    const fileStream = fs.createReadStream(fullPath);

    fileStream.on('error', (error) => {
      console.error('Error reading consent form file stream:', error);
      if (!res.headersSent) {
        setCorsHeaders(req, res);
        res.status(500).json({
          success: false,
          message: 'Error reading file'
        });
      }
    });

    res.on('close', () => {
      if (!fileStream.destroyed) {
        fileStream.destroy();
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Serve consent form file error:', error);
    setCorsHeaders(req, res);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  }
};
