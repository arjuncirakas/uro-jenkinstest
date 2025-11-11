import pool from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/investigations';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow PDF, DOC, DOCX, JPG, PNG files
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, DOCX, JPG, and PNG files are allowed'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Add PSA result
export const addPSAResult = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { 
      testDate, 
      result, 
      referenceRange, 
      notes, 
      status = 'Normal' 
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!testDate || !result) {
      return res.status(400).json({
        success: false,
        message: 'Test date and result are required'
      });
    }

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get user details
    const userCheck = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    const authorName = userCheck.rows.length > 0 
      ? `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`
      : 'Unknown User';

    // Handle file upload
    let filePath = null;
    let fileName = null;
    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname;
    }

    // Insert PSA result
    const result_query = await client.query(
      `INSERT INTO investigation_results (
        patient_id, test_type, test_name, test_date, result, reference_range, 
        status, notes, file_path, file_name, author_id, author_name, author_role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        patientId, 
        'psa', 
        'PSA (Prostate Specific Antigen)', 
        testDate, 
        result, 
        '0.0 - 4.0', // Default reference range
        status, 
        notes || '', 
        filePath, 
        fileName, 
        userId, 
        authorName, 
        userRole
      ]
    );

    const newResult = result_query.rows[0];

    res.json({
      success: true,
      message: 'PSA result added successfully',
      data: {
        id: newResult.id,
        patientId: newResult.patient_id,
        testType: newResult.test_type,
        testName: newResult.test_name,
        testDate: newResult.test_date,
        result: newResult.result,
        referenceRange: newResult.reference_range,
        status: newResult.status,
        notes: newResult.notes,
        filePath: newResult.file_path,
        fileName: newResult.file_name,
        authorName: newResult.author_name,
        authorRole: newResult.author_role,
        createdAt: newResult.created_at,
        updatedAt: newResult.updated_at
      }
    });

  } catch (error) {
    console.error('Add PSA result error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Add other test result with file upload
export const addOtherTestResult = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { 
      testName, 
      testDate, 
      notes
    } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validate required fields
    if (!testName || !testDate) {
      return res.status(400).json({
        success: false,
        message: 'Test name and test date are required'
      });
    }

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get user details
    const userCheck = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    const authorName = userCheck.rows.length > 0 
      ? `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`
      : 'Unknown User';

    // Handle file upload
    let filePath = null;
    let fileName = null;
    if (req.file) {
      filePath = req.file.path;
      fileName = req.file.originalname;
    }

    // Insert test result
    const result_query = await client.query(
      `INSERT INTO investigation_results (
        patient_id, test_type, test_name, test_date, result, reference_range, 
        status, notes, file_path, file_name, author_id, author_name, author_role
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        patientId, 
        testName, // Use testName as testType
        testName, // Use testName as testName
        testDate, 
        '', // Empty result
        '', // Empty reference range
        'Normal', // Default status 
        notes || '', 
        filePath, 
        fileName, 
        userId, 
        authorName, 
        userRole
      ]
    );

    const newResult = result_query.rows[0];

    res.json({
      success: true,
      message: 'Test result added successfully',
      data: {
        id: newResult.id,
        patientId: newResult.patient_id,
        testType: newResult.test_type,
        testName: newResult.test_name,
        testDate: newResult.test_date,
        result: newResult.result,
        referenceRange: newResult.reference_range,
        status: newResult.status,
        notes: newResult.notes,
        filePath: newResult.file_path,
        fileName: newResult.file_name,
        authorName: newResult.author_name,
        authorRole: newResult.author_role,
        createdAt: newResult.created_at,
        updatedAt: newResult.updated_at
      }
    });

  } catch (error) {
    console.error('Add test result error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get investigation results for a patient
export const getInvestigationResults = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { testType } = req.query; // Optional filter by test type

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build query with optional test type filter
    let query = `
      SELECT 
        id,
        test_type,
        test_name,
        test_date,
        result,
        reference_range,
        status,
        notes,
        file_path,
        file_name,
        author_name,
        author_role,
        created_at,
        updated_at
      FROM investigation_results
      WHERE patient_id = $1
    `;
    
    const queryParams = [patientId];
    
    if (testType) {
      query += ' AND test_type = $2';
      queryParams.push(testType);
    }
    
    query += ' ORDER BY test_date DESC, created_at DESC';

    const result = await client.query(query, queryParams);

    // Format results for frontend
    const formattedResults = result.rows.map(row => ({
      id: row.id,
      testType: row.test_type,
      testName: row.test_name,
      testDate: row.test_date,
      result: row.result,
      referenceRange: row.reference_range,
      status: row.status,
      notes: row.notes,
      filePath: row.file_path,
      fileName: row.file_name,
      authorName: row.author_name,
      authorRole: row.author_role,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      formattedDate: new Date(row.test_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }));

    res.json({
      success: true,
      message: 'Investigation results retrieved successfully',
      data: {
        results: formattedResults,
        count: formattedResults.length
      }
    });

  } catch (error) {
    console.error('Get investigation results error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Delete investigation result
export const deleteInvestigationResult = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { resultId } = req.params;
    const userId = req.user.id;

    // Check if result exists and user has permission
    const resultCheck = await client.query(
      'SELECT id, author_id, file_path FROM investigation_results WHERE id = $1',
      [resultId]
    );

    if (resultCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Investigation result not found'
      });
    }

    // Check if user is the author (or admin)
    if (resultCheck.rows[0].author_id !== userId && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own investigation results'
      });
    }

    // Delete associated file if it exists
    const filePath = resultCheck.rows[0].file_path;
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete from database
    await client.query('DELETE FROM investigation_results WHERE id = $1', [resultId]);

    res.json({
      success: true,
      message: 'Investigation result deleted successfully'
    });

  } catch (error) {
    console.error('Delete investigation result error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Get all investigations with patient details
export const getAllInvestigations = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { testType, status } = req.query; // Optional filters
    
    // Build query to get all patients with investigation bookings
    // This includes both patients with scheduled investigations and those with results
    let query = `
      SELECT DISTINCT
        p.id as patient_id,
        p.first_name,
        p.last_name,
        p.upi,
        EXTRACT(YEAR FROM AGE(p.date_of_birth)) as age,
        p.gender,
        p.initial_psa as psa,
        -- Get investigation booking details (primary source for investigation management)
        ib.scheduled_date as appointment_date,
        ib.scheduled_time as appointment_time,
        ib.investigation_name as urologist,
        ib.created_at as booking_created_at
      FROM patients p
      INNER JOIN investigation_bookings ib ON p.id = ib.patient_id 
        AND ib.status IN ('scheduled', 'confirmed', 'completed')
      WHERE ib.id IS NOT NULL
      ORDER BY ib.created_at DESC
    `;
    
    const result = await client.query(query);
    
    // Get all investigation results to determine test status
    let resultsQuery = { rows: [] };
    
    if (result.rows.length > 0) {
      resultsQuery = await client.query(`
        SELECT 
          patient_id,
          test_type,
          test_name
        FROM investigation_results
        WHERE patient_id = ANY($1)
      `, [result.rows.map(r => r.patient_id)]);
    }
    
    // Create a map of patient test results
    const patientResults = {};
    resultsQuery.rows.forEach(row => {
      if (!patientResults[row.patient_id]) {
        patientResults[row.patient_id] = {
          mri: false,
          biopsy: false,
          trus: false
        };
      }
      const testType = (row.test_type || row.test_name || '').toLowerCase();
      if (testType === 'mri') {
        patientResults[row.patient_id].mri = true;
      } else if (testType === 'biopsy') {
        patientResults[row.patient_id].biopsy = true;
      } else if (testType === 'trus') {
        patientResults[row.patient_id].trus = true;
      }
    });
    
    // Helper function to format date
    const formatDate = (dateValue) => {
      if (!dateValue) return null;
      try {
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Date formatting error:', error);
        return null;
      }
    };
    
    // Helper function to format time
    const formatTime = (timeValue) => {
      if (!timeValue) return null;
      try {
        // If it's already in HH:MM format, return as is
        if (typeof timeValue === 'string' && timeValue.match(/^\d{2}:\d{2}/)) {
          return timeValue.substring(0, 5); // Return HH:MM
        }
        return timeValue;
      } catch (error) {
        console.error('Time formatting error:', error);
        return null;
      }
    };
    
    // Group results by patient and determine test status
    const patientTests = {};
    
    result.rows.forEach(row => {
      const patientId = row.patient_id;
      if (!patientTests[patientId]) {
        const results = patientResults[patientId] || { mri: false, biopsy: false, trus: false };
        
        patientTests[patientId] = {
          id: patientId,
          patientName: `${row.first_name} ${row.last_name}`,
          upi: row.upi,
          age: row.age,
          gender: row.gender,
          psa: row.psa,
          appointmentDate: formatDate(row.appointment_date),
          appointmentTime: formatTime(row.appointment_time),
          urologist: row.urologist || 'Not Assigned',
          mri: results.mri ? 'completed' : 'pending',
          biopsy: results.biopsy ? 'completed' : 'pending',
          trus: results.trus ? 'completed' : 'pending',
          lastUpdated: row.booking_created_at
        };
      }
    });
    
    // Convert to array
    const investigations = Object.values(patientTests);
    
    res.json({
      success: true,
      message: 'Investigations retrieved successfully',
      data: {
        investigations,
        count: investigations.length
      }
    });
    
  } catch (error) {
    console.error('Get all investigations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Create investigation request
export const createInvestigationRequest = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { 
      investigationType,
      testName,
      customTestName,
      priority = 'routine',
      notes,
      scheduledDate,
      scheduledTime
    } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!investigationType) {
      return res.status(400).json({
        success: false,
        message: 'Investigation type is required'
      });
    }

    // Determine the final test name
    const finalTestName = investigationType === 'custom' ? customTestName : testName;
    
    if (!finalTestName || finalTestName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Test name is required'
      });
    }

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get user details
    const userCheck = await client.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    const creatorName = userCheck.rows.length > 0 
      ? `${userCheck.rows[0].first_name} ${userCheck.rows[0].last_name}`
      : 'Unknown User';

    // Set default scheduled date and time if not provided
    const finalScheduledDate = scheduledDate || new Date().toISOString().split('T')[0];
    const finalScheduledTime = scheduledTime || '09:00:00';

    // Insert investigation request/booking
    const result = await client.query(
      `INSERT INTO investigation_bookings (
        patient_id, investigation_type, investigation_name, 
        scheduled_date, scheduled_time, status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        patientId,
        investigationType,
        finalTestName,
        finalScheduledDate,
        finalScheduledTime,
        priority === 'urgent' ? 'urgent' : 'scheduled',
        notes || '',
        userId
      ]
    );

    const newRequest = result.rows[0];

    // Create a clinical note for the investigation request
    try {
      const noteContent = `
INVESTIGATION REQUEST

Type: ${investigationType.toUpperCase()}
Test: ${finalTestName}
Priority: ${priority.charAt(0).toUpperCase() + priority.slice(1)}
${scheduledDate ? `Scheduled Date: ${new Date(scheduledDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
${notes ? `\nClinical Notes:\n${notes}` : ''}
      `.trim();

      await client.query(
        `INSERT INTO patient_notes (
          patient_id, note_content, note_type, author_id, author_name, author_role
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [patientId, noteContent, 'investigation_request', userId, creatorName, req.user.role]
      );
      
      console.log('✅ Clinical note created for investigation request');
    } catch (noteError) {
      console.error('❌ Error creating clinical note:', noteError);
      // Don't fail the request if note creation fails
    }

    res.json({
      success: true,
      message: 'Investigation request created successfully',
      data: {
        id: newRequest.id,
        patientId: newRequest.patient_id,
        investigationType: newRequest.investigation_type,
        investigationName: newRequest.investigation_name,
        scheduledDate: newRequest.scheduled_date,
        scheduledTime: newRequest.scheduled_time,
        status: newRequest.status,
        notes: newRequest.notes,
        createdAt: newRequest.created_at,
        updatedAt: newRequest.updated_at
      }
    });

  } catch (error) {
    console.error('Create investigation request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get investigation requests for a patient
export const getInvestigationRequests = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { patientId } = req.params;
    const { status } = req.query; // Optional filter by status

    // Check if patient exists
    const patientCheck = await client.query(
      'SELECT id, first_name, last_name FROM patients WHERE id = $1',
      [patientId]
    );

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Build query with optional status filter
    let query = `
      SELECT 
        id,
        investigation_type,
        investigation_name,
        scheduled_date,
        scheduled_time,
        status,
        notes,
        created_at,
        updated_at
      FROM investigation_bookings
      WHERE patient_id = $1
    `;
    
    const queryParams = [patientId];
    
    if (status) {
      query += ' AND status = $2';
      queryParams.push(status);
    }
    
    query += ' ORDER BY scheduled_date DESC, created_at DESC';

    const result = await client.query(query, queryParams);

    // Format results for frontend
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      investigationType: row.investigation_type,
      investigationName: row.investigation_name,
      scheduledDate: row.scheduled_date,
      scheduledTime: row.scheduled_time,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      formattedDate: new Date(row.scheduled_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }));

    res.json({
      success: true,
      message: 'Investigation requests retrieved successfully',
      data: {
        requests: formattedRequests,
        count: formattedRequests.length
      }
    });

  } catch (error) {
    console.error('Get investigation requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Delete investigation request
export const deleteInvestigationRequest = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { requestId } = req.params;
    const userId = req.user.id;

    // Check if request exists
    const requestCheck = await client.query(
      'SELECT id, created_by FROM investigation_bookings WHERE id = $1',
      [requestId]
    );

    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Investigation request not found'
      });
    }

    // Check if user is the creator (or admin/superadmin/urologist/doctor)
    if (requestCheck.rows[0].created_by !== userId && 
        !['superadmin', 'urologist', 'doctor'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own investigation requests'
      });
    }

    // Delete from database
    await client.query('DELETE FROM investigation_bookings WHERE id = $1', [requestId]);

    res.json({
      success: true,
      message: 'Investigation request deleted successfully'
    });

  } catch (error) {
    console.error('Delete investigation request error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  } finally {
    client.release();
  }
};

// Helper function to set CORS headers for file responses
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  
  // List of allowed localhost origins
  const allowedLocalhostOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  ];
  
  // In development, allow all origins; in production, check against allowed list
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isAllowedOrigin = !origin || isDevelopment || 
    allowedLocalhostOrigins.includes(origin) ||
    (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes(origin));
  
  if (origin && isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
  } else if (!origin) {
    // Allow requests with no origin (server-to-server, Postman, etc.)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
};

// Serve investigation files
export const serveFile = async (req, res) => {
  try {
    console.log('📁 [serveFile] Request received');
    console.log('📁 [serveFile] Method:', req.method);
    console.log('📁 [serveFile] Original URL:', req.originalUrl);
    console.log('📁 [serveFile] Path:', req.path);
    console.log('📁 [serveFile] Params:', req.params);
    
    let filePath = req.params.filePath; // Get the file path from the parameter
    
    // Decode the file path (it might be URL encoded)
    try {
      filePath = decodeURIComponent(filePath);
    } catch (e) {
      console.log('File path is not URL encoded or decode failed, using as-is');
    }
    
    console.log('📁 [serveFile] Requested file path (raw):', req.params.filePath);
    console.log('📁 [serveFile] Requested file path (decoded):', filePath);
    
    // Set CORS headers explicitly for file responses
    setCorsHeaders(req, res);
    
    // The filePath should already be the full path from the database
    // But let's handle both cases - relative and absolute paths
    let fullPath;
    if (path.isAbsolute(filePath)) {
      fullPath = filePath;
    } else {
      fullPath = path.join(process.cwd(), filePath);
    }
    
    console.log('Full file path:', fullPath);
    console.log('File exists:', fs.existsSync(fullPath));
    
    // Security check - ensure the file is within the uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fullPath.startsWith(uploadsDir)) {
      console.log('Security check failed - file not in uploads directory');
      // Ensure CORS headers are set even in error responses
      setCorsHeaders(req, res);
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.log('File not found:', fullPath);
      // Ensure CORS headers are set even in error responses
      setCorsHeaders(req, res);
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    console.log('Serving file:', fullPath);
    
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
    console.log('Setting Content-Type:', mimeType);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(fullPath)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Get file stats for logging
    const stats = fs.statSync(fullPath);
    console.log('File size:', stats.size, 'bytes');
    
    // Stream the file with error handling
    const fileStream = fs.createReadStream(fullPath);
    
    fileStream.on('error', (error) => {
      console.error('Error reading file stream:', error);
      if (!res.headersSent) {
        setCorsHeaders(req, res);
        res.status(500).json({
          success: false,
          message: 'Error reading file'
        });
      }
    });
    
    fileStream.on('open', () => {
      console.log('File stream opened successfully');
    });
    
    res.on('close', () => {
      console.log('Response closed, destroying file stream');
      if (!fileStream.destroyed) {
        fileStream.destroy();
      }
    });
    
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Serve file error:', error);
    // Ensure CORS headers are set even in error responses
    setCorsHeaders(req, res);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  }
};
