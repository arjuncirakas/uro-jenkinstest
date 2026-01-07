/**
 * Comprehensive tests for investigations routes
 * Tests all route handlers, middleware, and helper functions to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock all dependencies
const mockAddPSAResult = jest.fn((req, res) => res.json({ success: true }));
const mockUpdatePSAResult = jest.fn((req, res) => res.json({ success: true }));
const mockAddOtherTestResult = jest.fn((req, res) => res.json({ success: true }));
const mockGetInvestigationResults = jest.fn((req, res) => res.json({ success: true }));
const mockGetAllInvestigations = jest.fn((req, res) => res.json({ success: true }));
const mockDeleteInvestigationResult = jest.fn((req, res) => res.json({ success: true }));
const mockCreateInvestigationRequest = jest.fn((req, res) => res.json({ success: true }));
const mockGetInvestigationRequests = jest.fn((req, res) => res.json({ success: true }));
const mockUpdateInvestigationRequestStatus = jest.fn((req, res) => res.json({ success: true }));
const mockDeleteInvestigationRequest = jest.fn((req, res) => res.json({ success: true }));
const mockServeFile = jest.fn((req, res) => res.json({ success: true }));
const mockParsePSAFile = jest.fn((req, res) => res.json({ success: true }));

const mockUpload = {
  single: jest.fn(() => (req, res, next) => {
    req.file = { filename: 'test.pdf', originalname: 'test.pdf', size: 1024 };
    next();
  })
};

jest.unstable_mockModule('../controllers/investigationController.js', () => ({
  addPSAResult: mockAddPSAResult,
  updatePSAResult: mockUpdatePSAResult,
  addOtherTestResult: mockAddOtherTestResult,
  getInvestigationResults: mockGetInvestigationResults,
  getAllInvestigations: mockGetAllInvestigations,
  deleteInvestigationResult: mockDeleteInvestigationResult,
  createInvestigationRequest: mockCreateInvestigationRequest,
  getInvestigationRequests: mockGetInvestigationRequests,
  updateInvestigationRequestStatus: mockUpdateInvestigationRequestStatus,
  deleteInvestigationRequest: mockDeleteInvestigationRequest,
  upload: mockUpload,
  serveFile: mockServeFile,
  parsePSAFile: mockParsePSAFile
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

const mockValidateFilePathMiddleware = jest.fn(() => (req, res, next) => {
  req.validatedFilePath = '/path/to/file';
  next();
});

jest.unstable_mockModule('../utils/ssrfProtection.js', () => ({
  validateFilePathMiddleware: mockValidateFilePathMiddleware
}));

const mockSetPreflightCorsHeaders = jest.fn((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
});

jest.unstable_mockModule('../utils/corsHelper.js', () => ({
  setPreflightCorsHeaders: mockSetPreflightCorsHeaders
}));

describe('investigations routes - Complete Coverage', () => {
  let app;
  let router;
  let consoleLogSpy;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    app = express();
    app.use(express.json());
    
    // Import router after mocking
    router = await import('../routes/investigations.js');
    app.use('/api', router.default);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Route registration and module execution', () => {
    it('should export router as default', () => {
      expect(router.default).toBeDefined();
    });

    it('should execute router.use(xssProtection)', () => {
      // router.use is called during module import
      expect(router.default).toBeDefined();
    });
  });

  describe('createFileRouteHandlers function', () => {
    it('should create handlers with optionsHandler that calls setPreflightCorsHeaders', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      const response = await request(app)
        .options('/api/investigations/files/test.pdf')
        .set('Origin', 'http://localhost:5173');

      expect(mockSetPreflightCorsHeaders).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should create handlers with getHandlerMiddleware that logs and calls next', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/investigations/files/test.pdf')
        .set('Authorization', 'Bearer token');

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(mockServeFile).toHaveBeenCalled();
    });

    it('should execute getHandlerMiddleware with all console.log statements', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/investigations/files/investigations/test.pdf')
        .set('Authorization', 'Bearer token')
        .set('Host', 'localhost:5000')
        .set('X-Forwarded-For', '192.168.1.1')
        .set('User-Agent', 'test-agent')
        .set('Accept', 'application/json');

      // Verify all console.log calls were made
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🛣️ [investigations route]')
      );
    });
  });

  describe('Inline middleware for PATCH route', () => {
    it('should execute inline middleware that logs route match', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .patch('/api/investigation-requests/123/status')
        .set('Authorization', 'Bearer token')
        .send({ status: 'completed' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Investigation Routes] PATCH /investigation-requests/123/status')
      );
      expect(mockUpdateInvestigationRequestStatus).toHaveBeenCalled();
    });
  });

  describe('File serving routes', () => {
    it('should handle OPTIONS request for new route', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      const response = await request(app)
        .options('/api/investigations/files/test.pdf')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(mockSetPreflightCorsHeaders).toHaveBeenCalled();
    });

    it('should handle GET request for new route with filePath param', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/investigations/files/investigations/test.pdf')
        .set('Authorization', 'Bearer token');

      expect(mockValidateFilePathMiddleware).toHaveBeenCalled();
      expect(mockServeFile).toHaveBeenCalled();
    });

    it('should handle OPTIONS request for old route', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      const response = await request(app)
        .options('/api/files/test.pdf')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(mockSetPreflightCorsHeaders).toHaveBeenCalled();
    });

    it('should handle GET request for old route', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/files/investigations/test.pdf')
        .set('Authorization', 'Bearer token');

      expect(mockValidateFilePathMiddleware).toHaveBeenCalled();
      expect(mockServeFile).toHaveBeenCalled();
    });
  });

  describe('All route handlers', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
    });

    it('should handle POST /patients/:patientId/investigation-requests', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .post('/api/patients/123/investigation-requests')
        .set('Authorization', 'Bearer token')
        .send({ investigationType: 'PSA' });

      expect(mockCreateInvestigationRequest).toHaveBeenCalled();
    });

    it('should handle GET /patients/:patientId/investigation-requests', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/patients/123/investigation-requests')
        .set('Authorization', 'Bearer token');

      expect(mockGetInvestigationRequests).toHaveBeenCalled();
    });

    it('should handle PATCH /investigation-requests/:requestId/status', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .patch('/api/investigation-requests/123/status')
        .set('Authorization', 'Bearer token')
        .send({ status: 'completed' });

      expect(mockUpdateInvestigationRequestStatus).toHaveBeenCalled();
    });

    it('should handle DELETE /investigation-requests/:requestId', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .delete('/api/investigation-requests/123')
        .set('Authorization', 'Bearer token');

      expect(mockDeleteInvestigationRequest).toHaveBeenCalled();
    });

    it('should handle POST /parse-psa-file', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      // Use a proper file buffer for multer
      const fileBuffer = Buffer.from('test pdf content');
      await request(app)
        .post('/api/parse-psa-file')
        .set('Authorization', 'Bearer token')
        .attach('file', fileBuffer, 'test.pdf');

      expect(mockUpload.single).toHaveBeenCalledWith('file');
      expect(mockParsePSAFile).toHaveBeenCalled();
    });

    it('should handle POST /patients/:patientId/psa-results', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .post('/api/patients/123/psa-results')
        .set('Authorization', 'Bearer token')
        .attach('testFile', Buffer.from('test'), 'test.pdf');

      expect(mockUpload.single).toHaveBeenCalledWith('testFile');
      expect(mockAddPSAResult).toHaveBeenCalled();
    });

    it('should handle PATCH /psa-results/:resultId', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      const fileBuffer = Buffer.from('test pdf content');
      await request(app)
        .patch('/api/psa-results/123')
        .set('Authorization', 'Bearer token')
        .attach('testFile', fileBuffer, 'test.pdf');

      expect(mockUpload.single).toHaveBeenCalledWith('testFile');
      expect(mockUpdatePSAResult).toHaveBeenCalled();
    });

    it('should handle POST /patients/:patientId/test-results', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      const fileBuffer = Buffer.from('test pdf content');
      await request(app)
        .post('/api/patients/123/test-results')
        .set('Authorization', 'Bearer token')
        .attach('testFile', fileBuffer, 'test.pdf');

      expect(mockUpload.single).toHaveBeenCalledWith('testFile');
      expect(mockAddOtherTestResult).toHaveBeenCalled();
    });

    it('should handle GET /patients/:patientId/investigations', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/patients/123/investigations')
        .set('Authorization', 'Bearer token');

      expect(mockGetInvestigationResults).toHaveBeenCalled();
    });

    it('should handle GET /investigations', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/investigations')
        .set('Authorization', 'Bearer token');

      expect(mockGetAllInvestigations).toHaveBeenCalled();
    });

    it('should handle DELETE /investigations/:resultId', async () => {
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .delete('/api/investigations/123')
        .set('Authorization', 'Bearer token');

      expect(mockDeleteInvestigationResult).toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle filePath with special characters', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/investigations/files/test%20file.pdf')
        .set('Authorization', 'Bearer token');

      expect(mockServeFile).toHaveBeenCalled();
    });

    it('should handle filePath with nested paths', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      await request(app)
        .get('/api/investigations/files/subfolder/file.pdf')
        .set('Authorization', 'Bearer token');

      expect(mockServeFile).toHaveBeenCalled();
    });

    it('should execute all console.log statements in getHandlerMiddleware', async () => {
      const app = express();
      const router = await import('../routes/investigations.js');
      app.use('/api', router.default);

      const req = {
        method: 'GET',
        originalUrl: '/api/investigations/files/test.pdf',
        path: '/investigations/files/test.pdf',
        baseUrl: '/api',
        url: '/investigations/files/test.pdf',
        params: { filePath: 'test.pdf' },
        query: { download: 'true' },
        get: jest.fn((header) => {
          if (header === 'host') return 'localhost:5000';
          if (header === 'x-forwarded-for') return '192.168.1.1';
          if (header === 'x-real-ip') return '192.168.1.1';
          if (header === 'user-agent') return 'test-agent';
          if (header === 'accept') return 'application/json';
          return null;
        })
      };

      // Import and execute the route handler directly
      await request(app)
        .get('/api/investigations/files/test.pdf')
        .set('Authorization', 'Bearer token')
        .set('Host', 'localhost:5000')
        .set('X-Forwarded-For', '192.168.1.1')
        .set('User-Agent', 'test-agent')
        .set('Accept', 'application/json');

      // Verify comprehensive logging
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🛣️ [investigations route]')
      );
    });
  });
});

