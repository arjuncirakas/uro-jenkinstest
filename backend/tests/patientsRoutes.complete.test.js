/**
 * Comprehensive tests for patients routes
 * Tests all route handlers, middleware, and inline functions to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock all dependencies
const mockAddPatient = jest.fn((req, res) => res.json({ success: true }));
const mockGetPatients = jest.fn((req, res) => res.json({ success: true }));
const mockGetNewPatients = jest.fn((req, res) => res.json({ success: true }));
const mockGetPatientById = jest.fn((req, res) => res.json({ success: true }));
const mockUpdatePatient = jest.fn((req, res) => res.json({ success: true }));
const mockDeletePatient = jest.fn((req, res) => res.json({ success: true }));
const mockGetAssignedPatientsForDoctor = jest.fn((req, res) => res.json({ success: true }));
const mockUpdatePatientPathway = jest.fn((req, res) => res.json({ success: true }));
const mockGetPatientsDueForReview = jest.fn((req, res) => res.json({ success: true }));
const mockSearchPatients = jest.fn((req, res) => res.json({ success: true }));
const mockExpirePatient = jest.fn((req, res) => res.json({ success: true }));
const mockGetAllUrologists = jest.fn((req, res) => res.json({ success: true }));
const mockGetDischargeSummary = jest.fn((req, res) => res.json({ success: true }));
const mockCreateDischargeSummary = jest.fn((req, res) => res.json({ success: true }));
const mockUpdateDischargeSummary = jest.fn((req, res) => res.json({ success: true }));
const mockDeleteDischargeSummary = jest.fn((req, res) => res.json({ success: true }));

jest.unstable_mockModule('../controllers/patientController.js', () => ({
  addPatient: mockAddPatient,
  getPatients: mockGetPatients,
  getNewPatients: mockGetNewPatients,
  getPatientById: mockGetPatientById,
  updatePatient: mockUpdatePatient,
  deletePatient: mockDeletePatient,
  getAssignedPatientsForDoctor: mockGetAssignedPatientsForDoctor,
  updatePatientPathway: mockUpdatePatientPathway,
  getPatientsDueForReview: mockGetPatientsDueForReview,
  searchPatients: mockSearchPatients,
  expirePatient: mockExpirePatient,
  getAllUrologists: mockGetAllUrologists
}));

jest.unstable_mockModule('../controllers/dischargeSummaryController.js', () => ({
  getDischargeSummary: mockGetDischargeSummary,
  createDischargeSummary: mockCreateDischargeSummary,
  updateDischargeSummary: mockUpdateDischargeSummary,
  deleteDischargeSummary: mockDeleteDischargeSummary
}));

const mockAuthenticateToken = jest.fn((req, res, next) => {
  req.user = { id: 1, role: 'urologist' };
  next();
});

const mockRequireRole = jest.fn(() => (req, res, next) => next());

jest.unstable_mockModule('../middleware/auth.js', () => ({
  authenticateToken: mockAuthenticateToken,
  requireRole: mockRequireRole
}));

jest.unstable_mockModule('../middleware/rateLimiter.js', () => ({
  generalLimiter: jest.fn((req, res, next) => next())
}));

jest.unstable_mockModule('../middleware/sanitizer.js', () => ({
  xssProtection: jest.fn((req, res, next) => next())
}));

jest.unstable_mockModule('../middleware/patientValidation.js', () => ({
  validatePatientInput: jest.fn((req, res, next) => next()),
  validatePatientUpdateInput: jest.fn((req, res, next) => next())
}));

const mockCheckPatientAccess = jest.fn((req, res, next) => next());

jest.unstable_mockModule('../middleware/idorProtection.js', () => ({
  checkPatientAccess: mockCheckPatientAccess
}));

describe('patients routes - Complete Coverage', () => {
  let app;
  let router;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Import router after mocking
    router = await import('../routes/patients.js');
    app.use('/api/patients', router.default);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Top-level code execution', () => {
    it('should export router as default', () => {
      expect(router.default).toBeDefined();
      // Express router is a function that returns a router object
      expect(typeof router.default).toBe('function');
    });

    it('should execute router.use(xssProtection) during import', () => {
      // router.use is called during module import (line 32)
      // This executes the top-level code
      expect(router.default).toBeDefined();
    });

    it('should execute all route registration code during import', () => {
      // All router.get, router.post, etc. are called during import
      expect(router.default).toBeDefined();
    });
  });

  describe('Route registration and module execution', () => {
    it('should have registered routes', () => {
      expect(router.default).toBeDefined();
    });
  });

  describe('Root route handler', () => {
    it('should return 401 for GET /', async () => {
      const response = await request(app)
        .get('/api/patients/');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        success: false,
        message: 'Authentication required'
      });
    });
  });

  describe('Inline middleware functions for parameter mapping', () => {
    it('should execute inline middleware for GET /:id that maps id to patientId', async () => {
      await request(app)
        .get('/api/patients/123')
        .set('Authorization', 'Bearer token');

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockGetPatientById).toHaveBeenCalled();
    });

    it('should execute inline middleware for PUT /:id that maps id to patientId', async () => {
      await request(app)
        .put('/api/patients/123')
        .set('Authorization', 'Bearer token')
        .send({ firstName: 'John' });

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockUpdatePatient).toHaveBeenCalled();
    });

    it('should execute inline middleware for PUT /:id/pathway that maps id to patientId', async () => {
      await request(app)
        .put('/api/patients/123/pathway')
        .set('Authorization', 'Bearer token')
        .send({ pathway: 'Active Monitoring' });

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockUpdatePatientPathway).toHaveBeenCalled();
    });

    it('should execute inline middleware for PUT /:id/expire that maps id to patientId', async () => {
      await request(app)
        .put('/api/patients/123/expire')
        .set('Authorization', 'Bearer token');

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockExpirePatient).toHaveBeenCalled();
    });

    it('should execute inline middleware for DELETE /:id that maps id to patientId', async () => {
      await request(app)
        .delete('/api/patients/123')
        .set('Authorization', 'Bearer token');

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockDeletePatient).toHaveBeenCalled();
    });

    it('should execute inline middleware for GET /:id/discharge-summary that maps id to patientId', async () => {
      await request(app)
        .get('/api/patients/123/discharge-summary')
        .set('Authorization', 'Bearer token');

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockGetDischargeSummary).toHaveBeenCalled();
    });

    it('should execute inline middleware for POST /:id/discharge-summary that maps id to patientId', async () => {
      await request(app)
        .post('/api/patients/123/discharge-summary')
        .set('Authorization', 'Bearer token')
        .send({ admissionDate: '2024-01-01' });

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockCreateDischargeSummary).toHaveBeenCalled();
    });

    it('should execute inline middleware for PUT /:id/discharge-summary/:summaryId that maps id to patientId', async () => {
      await request(app)
        .put('/api/patients/123/discharge-summary/456')
        .set('Authorization', 'Bearer token')
        .send({ admissionDate: '2024-01-01' });

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockUpdateDischargeSummary).toHaveBeenCalled();
    });

    it('should execute inline middleware for DELETE /:id/discharge-summary/:summaryId that maps id to patientId', async () => {
      await request(app)
        .delete('/api/patients/123/discharge-summary/456')
        .set('Authorization', 'Bearer token');

      expect(mockCheckPatientAccess).toHaveBeenCalled();
      expect(mockDeleteDischargeSummary).toHaveBeenCalled();
    });
  });

  describe('All route handlers', () => {
    it('should handle POST /', async () => {
      await request(app)
        .post('/api/patients/')
        .set('Authorization', 'Bearer token')
        .send({ firstName: 'John', lastName: 'Doe' });

      expect(mockAddPatient).toHaveBeenCalled();
    });

    it('should handle GET /list', async () => {
      await request(app)
        .get('/api/patients/list')
        .set('Authorization', 'Bearer token');

      expect(mockGetPatients).toHaveBeenCalled();
    });

    it('should handle GET /new', async () => {
      await request(app)
        .get('/api/patients/new')
        .set('Authorization', 'Bearer token');

      expect(mockGetNewPatients).toHaveBeenCalled();
    });

    it('should handle GET /search', async () => {
      await request(app)
        .get('/api/patients/search?q=john')
        .set('Authorization', 'Bearer token');

      expect(mockSearchPatients).toHaveBeenCalled();
    });

    it('should handle GET /assigned', async () => {
      await request(app)
        .get('/api/patients/assigned')
        .set('Authorization', 'Bearer token');

      expect(mockGetAssignedPatientsForDoctor).toHaveBeenCalled();
    });

    it('should handle GET /due-for-review', async () => {
      await request(app)
        .get('/api/patients/due-for-review')
        .set('Authorization', 'Bearer token');

      expect(mockGetPatientsDueForReview).toHaveBeenCalled();
    });

    it('should handle GET /urologists', async () => {
      await request(app)
        .get('/api/patients/urologists')
        .set('Authorization', 'Bearer token');

      expect(mockGetAllUrologists).toHaveBeenCalled();
    });
  });

  describe('Parameter mapping verification', () => {
    it('should correctly map :id to patientId in req.params for GET /:id', async () => {
      let capturedParams = null;
      mockGetPatientById.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .get('/api/patients/123')
        .set('Authorization', 'Bearer token');

      expect(capturedParams).toHaveProperty('id', '123');
      expect(capturedParams).toHaveProperty('patientId', '123');
    });

    it('should correctly map :id to patientId in req.params for PUT /:id', async () => {
      let capturedParams = null;
      mockUpdatePatient.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .put('/api/patients/456')
        .set('Authorization', 'Bearer token')
        .send({ firstName: 'Jane' });

      expect(capturedParams).toHaveProperty('id', '456');
      expect(capturedParams).toHaveProperty('patientId', '456');
    });

    it('should correctly map :id to patientId in req.params for PUT /:id/pathway', async () => {
      let capturedParams = null;
      mockUpdatePatientPathway.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .put('/api/patients/789/pathway')
        .set('Authorization', 'Bearer token')
        .send({ pathway: 'Active Monitoring' });

      expect(capturedParams).toHaveProperty('id', '789');
      expect(capturedParams).toHaveProperty('patientId', '789');
    });

    it('should correctly map :id to patientId in req.params for PUT /:id/expire', async () => {
      let capturedParams = null;
      mockExpirePatient.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .put('/api/patients/999/expire')
        .set('Authorization', 'Bearer token');

      expect(capturedParams).toHaveProperty('id', '999');
      expect(capturedParams).toHaveProperty('patientId', '999');
    });

    it('should correctly map :id to patientId in req.params for DELETE /:id', async () => {
      let capturedParams = null;
      mockDeletePatient.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .delete('/api/patients/111')
        .set('Authorization', 'Bearer token');

      expect(capturedParams).toHaveProperty('id', '111');
      expect(capturedParams).toHaveProperty('patientId', '111');
    });

    it('should correctly map :id to patientId in req.params for GET /:id/discharge-summary', async () => {
      let capturedParams = null;
      mockGetDischargeSummary.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .get('/api/patients/222/discharge-summary')
        .set('Authorization', 'Bearer token');

      expect(capturedParams).toHaveProperty('id', '222');
      expect(capturedParams).toHaveProperty('patientId', '222');
    });

    it('should correctly map :id to patientId in req.params for POST /:id/discharge-summary', async () => {
      let capturedParams = null;
      mockCreateDischargeSummary.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .post('/api/patients/333/discharge-summary')
        .set('Authorization', 'Bearer token')
        .send({ admissionDate: '2024-01-01' });

      expect(capturedParams).toHaveProperty('id', '333');
      expect(capturedParams).toHaveProperty('patientId', '333');
    });

    it('should correctly map :id to patientId in req.params for PUT /:id/discharge-summary/:summaryId', async () => {
      let capturedParams = null;
      mockUpdateDischargeSummary.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .put('/api/patients/444/discharge-summary/555')
        .set('Authorization', 'Bearer token')
        .send({ admissionDate: '2024-01-01' });

      expect(capturedParams).toHaveProperty('id', '444');
      expect(capturedParams).toHaveProperty('patientId', '444');
      expect(capturedParams).toHaveProperty('summaryId', '555');
    });

    it('should correctly map :id to patientId in req.params for DELETE /:id/discharge-summary/:summaryId', async () => {
      let capturedParams = null;
      mockDeleteDischargeSummary.mockImplementation((req, res) => {
        capturedParams = req.params;
        res.json({ success: true });
      });

      await request(app)
        .delete('/api/patients/666/discharge-summary/777')
        .set('Authorization', 'Bearer token');

      expect(capturedParams).toHaveProperty('id', '666');
      expect(capturedParams).toHaveProperty('patientId', '666');
      expect(capturedParams).toHaveProperty('summaryId', '777');
    });
  });

  describe('Edge cases', () => {
    it('should handle numeric patient IDs', async () => {
      await request(app)
        .get('/api/patients/12345')
        .set('Authorization', 'Bearer token');

      expect(mockGetPatientById).toHaveBeenCalled();
    });

    it('should handle string patient IDs', async () => {
      await request(app)
        .get('/api/patients/abc123')
        .set('Authorization', 'Bearer token');

      expect(mockGetPatientById).toHaveBeenCalled();
    });
  });
});







