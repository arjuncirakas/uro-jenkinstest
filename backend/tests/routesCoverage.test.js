/**
 * Routes coverage tests
 * These tests import and verify route configurations
 */
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock all dependencies before importing routes
const mockPool = {
    connect: jest.fn(),
    query: jest.fn()
};

jest.unstable_mockModule('../config/database.js', () => ({
    default: mockPool
}));

jest.unstable_mockModule('../middleware/auth.js', () => ({
    authenticateToken: (req, res, next) => next(),
    requireRole: () => (req, res, next) => next()
}));

jest.unstable_mockModule('../middleware/rateLimiter.js', () => ({
    generalLimiter: (req, res, next) => next()
}));

jest.unstable_mockModule('../middleware/sanitizer.js', () => ({
    xssProtection: (req, res, next) => next()
}));

jest.unstable_mockModule('../utils/ssrfProtection.js', () => ({
    validateFilePathMiddleware: () => (req, res, next) => next()
}));

jest.unstable_mockModule('../utils/corsHelper.js', () => ({
    setPreflightCorsHeaders: (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
}));

jest.unstable_mockModule('../middleware/patientValidation.js', () => ({
    validatePatientInput: (req, res, next) => next(),
    validatePatientUpdateInput: (req, res, next) => next()
}));

jest.unstable_mockModule('../middleware/idorProtection.js', () => ({
    checkPatientAccess: (req, res, next) => next()
}));

jest.unstable_mockModule('../utils/validation.js', () => ({
    validateRequest: () => (req, res, next) => next(),
    addPatientSchema: {},
    updatePatientSchema: {}
}));

// Mock all controllers
jest.unstable_mockModule('../controllers/investigationController.js', () => ({
    addPSAResult: (req, res) => res.json({ success: true }),
    updatePSAResult: (req, res) => res.json({ success: true }),
    addOtherTestResult: (req, res) => res.json({ success: true }),
    getInvestigationResults: (req, res) => res.json({ success: true }),
    getAllInvestigations: (req, res) => res.json({ success: true }),
    deleteInvestigationResult: (req, res) => res.json({ success: true }),
    createInvestigationRequest: (req, res) => res.json({ success: true }),
    getInvestigationRequests: (req, res) => res.json({ success: true }),
    updateInvestigationRequestStatus: (req, res) => res.json({ success: true }),
    deleteInvestigationRequest: (req, res) => res.json({ success: true }),
    upload: { single: () => (req, res, next) => next() },
    serveFile: (req, res) => res.json({ success: true }),
    parsePSAFile: (req, res) => res.json({ success: true })
}));

jest.unstable_mockModule('../controllers/patientController.js', () => ({
    addPatient: (req, res) => res.json({ success: true }),
    getPatients: (req, res) => res.json({ success: true }),
    getNewPatients: (req, res) => res.json({ success: true }),
    getPatientById: (req, res) => res.json({ success: true }),
    updatePatient: (req, res) => res.json({ success: true }),
    deletePatient: (req, res) => res.json({ success: true }),
    getAssignedPatientsForDoctor: (req, res) => res.json({ success: true }),
    updatePatientPathway: (req, res) => res.json({ success: true }),
    getPatientsDueForReview: (req, res) => res.json({ success: true }),
    searchPatients: (req, res) => res.json({ success: true }),
    expirePatient: (req, res) => res.json({ success: true }),
    getAllUrologists: (req, res) => res.json({ success: true })
}));

jest.unstable_mockModule('../controllers/dischargeSummaryController.js', () => ({
    getDischargeSummary: (req, res) => res.json({ success: true }),
    createDischargeSummary: (req, res) => res.json({ success: true }),
    updateDischargeSummary: (req, res) => res.json({ success: true }),
    deleteDischargeSummary: (req, res) => res.json({ success: true })
}));

// ... imports
import request from 'supertest';
import express from 'express';

// ... existing mocks ...

describe('Routes Coverage', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
    });

    describe('investigations.js routes', () => {
        it('should import investigations routes successfully', async () => {
            const investigationsRouter = await import('../routes/investigations.js');
            expect(investigationsRouter.default).toBeDefined();
            expect(typeof investigationsRouter.default).toBe('function');
        });

        it('should handle OPTIONS preflight for files', async () => {
            const investigationsRouter = await import('../routes/investigations.js');
            app.use('/api', investigationsRouter.default);

            const res = await request(app)
                .options('/api/files/test.pdf')
                .set('Origin', 'http://localhost:5173');

            expect(res.status).toBe(200);
            expect(res.header['access-control-allow-origin']).toBe('*');
        });

        it('should execute status update logging middleware', async () => {
            const investigationsRouter = await import('../routes/investigations.js');
            app.use('/api', investigationsRouter.default);

            // Mock console.log to verify it's called
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            await request(app)
                .patch('/api/investigation-requests/123/status')
                .send({ status: 'completed' });

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Investigation Routes] PATCH'));
            consoleSpy.mockRestore();
        });
    });

    describe('patients.js routes', () => {
        it('should import patients routes successfully', async () => {
            const patientsRouter = await import('../routes/patients.js');
            expect(patientsRouter.default).toBeDefined();
            expect(typeof patientsRouter.default).toBe('function');
        });

        // Add more patient route tests if specific lines need coverage
        // e.g. checking specific middleware chains are present
    });
});
