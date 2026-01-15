import pool from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Import secure CORS helper - uses strict origin validation to prevent CORS misconfiguration attacks
import { setCorsHeaders } from '../utils/corsHelper.js';
import { encryptFile, decryptFile } from '../services/encryptionService.js';

// Configure multer for template uploads (memory storage for encryption)
const templateStorage = multer.memoryStorage();

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

// Configure multer for patient consent form uploads (memory storage for encryption)
const patientConsentStorage = multer.memoryStorage();

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
    let templateFileData = null;

    if (file) {
      templateFileName = file.originalname;
      templateFileSize = file.size;
      // Encrypt file buffer and store in database
      if (file.buffer) {
        templateFileData = encryptFile(file.buffer);
        // Generate reference file_path for frontend URL construction (file not actually stored here)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        templateFilePath = `consent-forms/templates/template-${uniqueSuffix}${path.extname(templateFileName)}`;
      }
    }

    // Insert new template
    const result = await client.query(`
      INSERT INTO consent_forms 
      (name, procedure_name, test_name, is_auto_generated, template_file_path, template_file_name, template_file_size, template_file_data, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING *
    `, [
      name.trim(),
      procedure_name ? procedure_name.trim() : null,
      test_name ? test_name.trim() : null,
      isAutoGen,
      templateFilePath,
      templateFileName,
      templateFileSize,
      templateFileData
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
      templateFileSize: null,
      templateFileData: null
    };
  }

  // Delete old file from filesystem if exists (backward compatibility)
  if (existingFilePath) {
    const oldFilePath = path.join(process.cwd(), existingFilePath);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.error('Error deleting old template file:', err);
      }
    }
  }

  // Encrypt file buffer and store in database
  let templateFileData = null;
  let templateFilePath = null;
  if (file.buffer) {
    templateFileData = encryptFile(file.buffer);
    // Generate reference file_path for frontend URL construction (file not actually stored here)
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    templateFilePath = `consent-forms/templates/template-${uniqueSuffix}${path.extname(file.originalname)}`;
  }

  return {
    templateFilePath: templateFilePath,
    templateFileName: file.originalname,
    templateFileSize: file.size,
    templateFileData: templateFileData
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
          template_file_path = CASE WHEN $5 IS NOT NULL THEN $5 ELSE template_file_path END,
          template_file_name = COALESCE($6, template_file_name),
          template_file_size = COALESCE($7, template_file_size),
          template_file_data = CASE WHEN $8::BYTEA IS NOT NULL THEN $8::BYTEA ELSE template_file_data END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      name.trim(),
      procedure_name ? procedure_name.trim() : null,
      test_name ? test_name.trim() : null,
      isAutoGen,
      fileInfo.templateFilePath,
      fileInfo.templateFileName,
      fileInfo.templateFileSize,
      fileInfo.templateFileData,
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

// Helper function to validate upload request
const validateConsentFormUpload = (consentFormId, file) => {
  if (!consentFormId) {
    return {
      isValid: false,
      error: { status: 400, message: 'Consent form ID is required' }
    };
  }
  if (!file) {
    return {
      isValid: false,
      error: { status: 400, message: 'File is required' }
    };
  }
  return { isValid: true };
};

// Helper function to prepare file data
const prepareFileData = (file) => {
  if (!file.buffer) {
    return { filePath: null, fileData: null };
  }
  const fileData = encryptFile(file.buffer);
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filePath = `consent-forms/patients/patient-consent-${uniqueSuffix}${path.extname(file.originalname)}`;
  return { filePath, fileData };
};

// Helper function to delete old file
const deleteOldFile = (oldFilePath) => {
  if (!oldFilePath) return;
  const fullOldFilePath = path.join(process.cwd(), oldFilePath);
  if (fs.existsSync(fullOldFilePath)) {
    try {
      fs.unlinkSync(fullOldFilePath);
    } catch (err) {
      console.error('Error deleting old patient consent file:', err);
    }
  }
};

// Helper function to update existing consent form
const updateExistingConsentForm = async (client, existingUpload, filePath, file, fileData) => {
  deleteOldFile(existingUpload.rows[0].file_path);
  const result = await client.query(
    `UPDATE patient_consent_forms 
     SET file_path = $1, file_name = $2, file_size = $3, file_data = $4, uploaded_at = CURRENT_TIMESTAMP
     WHERE id = $5
     RETURNING *`,
    [filePath, file.originalname, file.size, fileData, existingUpload.rows[0].id]
  );
  return result;
};

// Helper function to insert new consent form
const insertNewConsentForm = async (client, patientId, consentFormId, filePath, file, fileData) => {
  const result = await client.query(
    `INSERT INTO patient_consent_forms 
     (patient_id, consent_form_id, file_path, file_name, file_size, file_data, uploaded_at) 
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP) 
     RETURNING *`,
    [patientId, consentFormId, filePath, file.originalname, file.size, fileData]
  );
  return result;
};

// Upload patient consent form
export const uploadPatientConsentForm = async (req, res) => {
  const client = await pool.connect();

  try {
    const { patientId } = req.params;
    const { consentFormId } = req.body;
    const file = req.file;

    const validation = validateConsentFormUpload(consentFormId, file);
    if (!validation.isValid) {
      return res.status(validation.error.status).json({
        success: false,
        message: validation.error.message
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

    // Prepare file data
    const { filePath, fileData } = prepareFileData(file);

    // Check if patient already has this consent form uploaded
    const existingUpload = await client.query(
      `SELECT id, file_path FROM patient_consent_forms 
       WHERE patient_id = $1 AND consent_form_id = $2`,
      [patientId, consentFormId]
    );

    if (existingUpload.rows.length > 0) {
      const result = await updateExistingConsentForm(client, existingUpload, filePath, file, fileData);
      return res.status(200).json({
        success: true,
        message: 'Consent form file updated successfully',
        data: result.rows[0]
      });
    } else {
      const result = await insertNewConsentForm(client, patientId, consentFormId, filePath, file, fileData);
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
  const client = await pool.connect();
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

    // Extract relative path for database lookup
    // Remove 'uploads/' prefix if present, normalize path separators
    let relativePath = fullPath.replace(/\\/g, '/');
    if (relativePath.startsWith('uploads/')) {
      relativePath = relativePath.replace(/^uploads\//, '');
    }
    // Also handle case where path might already be relative (no uploads/ prefix)
    // Ensure we have a clean relative path for database lookup
    console.log('[serveConsentFormFile] Checking file:', {
      validatedPath: fullPath,
      relativePath: relativePath,
      originalParam: req.params.filePath
    });

    // Check database first for encrypted files (check both template and patient consent tables)
    let fileBuffer = null;
    let fileName = null;
    let mimeType;

    // Check consent_forms table (templates)
    // Try exact match first, then try with different path formats
    let templateResult = await client.query(
      'SELECT template_file_path, template_file_name, template_file_data FROM consent_forms WHERE template_file_path = $1',
      [relativePath]
    );

    // If not found, try alternative path formats (with/without uploads prefix)
    if (templateResult.rows.length === 0) {
      const altPath1 = relativePath.startsWith('uploads/') ? relativePath.replace(/^uploads\//, '') : `uploads/${relativePath}`;
      templateResult = await client.query(
        'SELECT template_file_path, template_file_name, template_file_data FROM consent_forms WHERE template_file_path = $1 OR template_file_path = $2',
        [relativePath, altPath1]
      );
    }

    if (templateResult.rows.length > 0 && templateResult.rows[0].template_file_data) {
      // Encrypted template file from database
      console.log('[serveConsentFormFile] Found encrypted template file in database');
      try {
        fileBuffer = decryptFile(templateResult.rows[0].template_file_data);
        fileName = templateResult.rows[0].template_file_name || path.basename(relativePath);
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
          '.pdf': 'application/pdf',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        mimeType = mimeTypes[ext] ?? 'application/octet-stream';
      } catch (decryptError) {
        console.error('[serveConsentFormFile] Decryption failed:', decryptError);
        setCorsHeaders(req, res);
        return res.status(500).json({
          success: false,
          message: 'Error decrypting file'
        });
      }
    } else {
      // Check patient_consent_forms table
      // Try exact match first, then try with different path formats
      let patientResult = await client.query(
        'SELECT file_path, file_name, file_data FROM patient_consent_forms WHERE file_path = $1',
        [relativePath]
      );

      // If not found, try alternative path formats (with/without uploads prefix)
      if (patientResult.rows.length === 0) {
        const altPath1 = relativePath.startsWith('uploads/') ? relativePath.replace(/^uploads\//, '') : `uploads/${relativePath}`;
        patientResult = await client.query(
          'SELECT file_path, file_name, file_data FROM patient_consent_forms WHERE file_path = $1 OR file_path = $2',
          [relativePath, altPath1]
        );
      }

      if (patientResult.rows.length > 0 && patientResult.rows[0].file_data) {
        // Encrypted patient consent file from database
        console.log('[serveConsentFormFile] Found encrypted patient consent file in database');
        try {
          fileBuffer = decryptFile(patientResult.rows[0].file_data);
          fileName = patientResult.rows[0].file_name || path.basename(relativePath);
          const ext = path.extname(fileName).toLowerCase();
          const mimeTypes = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          };
          mimeType = mimeTypes[ext] ?? 'application/octet-stream';
        } catch (decryptError) {
          console.error('[serveConsentFormFile] Decryption failed:', decryptError);
          setCorsHeaders(req, res);
          return res.status(500).json({
            success: false,
            message: 'Error decrypting file'
          });
        }
      } else if (fs.existsSync(fullPath)) {
        // Old file from filesystem (backward compatibility)
        console.log('[serveConsentFormFile] Serving from filesystem (backward compatibility)');
        fileBuffer = fs.readFileSync(fullPath);
        fileName = path.basename(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        const mimeTypes = {
          '.pdf': 'application/pdf',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.doc': 'application/msword',
          '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        mimeType = mimeTypes[ext] ?? 'application/octet-stream';
      } else {
        // File not found - log detailed information for debugging
        console.error('[serveConsentFormFile] File not found in database or filesystem', {
          validatedPath: fullPath,
          relativePath: relativePath,
          originalParam: req.params.filePath,
          checkedTemplatePath: relativePath,
          checkedPatientPath: relativePath
        });
        
        // Try to find similar paths in database for debugging
        const debugTemplateQuery = await client.query(
          'SELECT template_file_path FROM consent_forms WHERE template_file_path LIKE $1 LIMIT 5',
          [`%${relativePath.split('/').pop() || relativePath.split('\\').pop() || ''}%`]
        );
        if (debugTemplateQuery.rows.length > 0) {
          console.log('[serveConsentFormFile] Found similar template paths in database:', debugTemplateQuery.rows.map(r => r.template_file_path));
        }
        
        setCorsHeaders(req, res);
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }
    }

    // Set headers and send file
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(fileBuffer);

  } catch (error) {
    console.error('Serve consent form file error:', error);
    setCorsHeaders(req, res);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  } finally {
    client.release();
  }
};
