import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Create mock functions
const mockGetConsentFormTemplates = jest.fn();
const mockCreateConsentFormTemplate = jest.fn();
const mockUpdateConsentFormTemplate = jest.fn();
const mockDeleteConsentFormTemplate = jest.fn();
const mockGetPatientConsentForms = jest.fn();
const mockUploadPatientConsentForm = jest.fn();
const mockServeConsentFormFile = jest.fn();

// Mock multer upload
const mockUploadTemplate = {
    single: () => (req, res, next) => next()
};

const mockUploadPatientConsent = {
    single: () => (req, res, next) => next()
};

// Mock consentFormController
jest.unstable_mockModule('../controllers/consentFormController.js', () => ({
    getConsentFormTemplates: mockGetConsentFormTemplates,
    createConsentFormTemplate: mockCreateConsentFormTemplate,
    updateConsentFormTemplate: mockUpdateConsentFormTemplate,
    deleteConsentFormTemplate: mockDeleteConsentFormTemplate,
    getPatientConsentForms: mockGetPatientConsentForms,
    uploadPatientConsentForm: mockUploadPatientConsentForm,
    uploadTemplate: mockUploadTemplate,
    uploadPatientConsent: mockUploadPatientConsent,
    serveConsentFormFile: mockServeConsentFormFile
}));

// Mock middleware
jest.unstable_mockModule('../middleware/auth.js', () => ({
    authenticateToken: (req, res, next) => {
        req.user = { id: 1, email: 'test@example.com', role: 'superadmin' };
        next();
    },
    requireRole: (roles) => (req, res, next) => {
        if (roles.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Forbidden' });
        }
    }
}));

jest.unstable_mockModule('../middleware/rateLimiter.js', () => ({
    generalLimiter: (req, res, next) => next()
}));

jest.unstable_mockModule('../utils/ssrfProtection.js', () => ({
    validateFilePathMiddleware: () => (req, res, next) => next()
}));

const consentFormsRouter = (await import('../routes/consentForms.js')).default;

describe('Consent Forms Routes', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();
        app = express();
        app.use(express.json());
        app.use('/api/consent-forms', consentFormsRouter);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('GET /api/consent-forms/templates', () => {
        it('should call getConsentFormTemplates controller', async () => {
            mockGetConsentFormTemplates.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            const response = await request(app)
                .get('/api/consent-forms/templates')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(200);
            expect(mockGetConsentFormTemplates).toHaveBeenCalled();
        });

        it('should return templates list', async () => {
            const mockTemplates = [
                { id: 1, procedure_name: 'Biopsy', is_required: true },
                { id: 2, procedure_name: 'MRI', is_required: false }
            ];

            mockGetConsentFormTemplates.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: mockTemplates });
            });

            const response = await request(app)
                .get('/api/consent-forms/templates');

            expect(response.body.data).toHaveLength(2);
        });
    });

    describe('POST /api/consent-forms/templates', () => {
        it('should call createConsentFormTemplate controller for superadmin', async () => {
            mockCreateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/consent-forms/templates')
                .send({
                    procedure_name: 'New Procedure',
                    description: 'Description',
                    is_required: true
                });

            expect(mockCreateConsentFormTemplate).toHaveBeenCalled();
        });

        it('should allow doctor to create custom test templates', async () => {
            // Change user role to urologist
            jest.unstable_mockModule('../middleware/auth.js', () => ({
                authenticateToken: (req, res, next) => {
                    req.user = { id: 1, email: 'doctor@example.com', role: 'urologist' };
                    next();
                },
                requireRole: (roles) => (req, res, next) => next()
            }));

            mockCreateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/consent-forms/templates')
                .send({
                    procedure_name: 'Custom Test',
                    test_name: 'Custom Blood Test',
                    is_auto_generated: true
                });

            expect(mockCreateConsentFormTemplate).toHaveBeenCalled();
        });
    });

    describe('PUT /api/consent-forms/templates/:templateId', () => {
        it('should call updateConsentFormTemplate controller', async () => {
            mockUpdateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app)
                .put('/api/consent-forms/templates/1')
                .send({
                    procedure_name: 'Updated Procedure',
                    description: 'Updated Description'
                });

            expect(mockUpdateConsentFormTemplate).toHaveBeenCalled();
        });
    });

    describe('DELETE /api/consent-forms/templates/:templateId', () => {
        it('should call deleteConsentFormTemplate controller', async () => {
            mockDeleteConsentFormTemplate.mockImplementation((req, res) => {
                res.status(200).json({ success: true });
            });

            await request(app).delete('/api/consent-forms/templates/1');

            expect(mockDeleteConsentFormTemplate).toHaveBeenCalled();
        });
    });

    describe('GET /api/consent-forms/patients/:patientId', () => {
        it('should call getPatientConsentForms controller', async () => {
            mockGetPatientConsentForms.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/consent-forms/patients/1');

            expect(mockGetPatientConsentForms).toHaveBeenCalled();
        });

        it('should return patient consent forms', async () => {
            const mockForms = [
                { id: 1, patient_id: 1, template_id: 1, signed: true },
                { id: 2, patient_id: 1, template_id: 2, signed: false }
            ];

            mockGetPatientConsentForms.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: mockForms });
            });

            const response = await request(app).get('/api/consent-forms/patients/1');

            expect(response.body.data).toHaveLength(2);
        });
    });

    describe('POST /api/consent-forms/patients/:patientId', () => {
        it('should call uploadPatientConsentForm controller', async () => {
            mockUploadPatientConsentForm.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/consent-forms/patients/1')
                .send({
                    template_id: 1
                });

            expect(mockUploadPatientConsentForm).toHaveBeenCalled();
        });
    });

    describe('GET /api/consent-forms/files/:filePath', () => {
        it('should call serveConsentFormFile controller', async () => {
            mockServeConsentFormFile.mockImplementation((req, res) => {
                res.status(200).sendFile('/path/to/file.pdf');
            });

            await request(app).get('/api/consent-forms/files/consent-forms/1/form.pdf');

            expect(mockServeConsentFormFile).toHaveBeenCalled();
        });
    });

    describe('Middleware: checkTemplateCreationPermission', () => {
        it('should allow superadmin to create any template', async () => {
            mockCreateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            const response = await request(app)
                .post('/api/consent-forms/templates')
                .send({ procedure_name: 'Standard Test' });

            expect(response.status).toBe(201);
        });

        it('should check for custom test names', async () => {
            mockCreateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            await request(app)
                .post('/api/consent-forms/templates')
                .send({
                    procedure_name: 'Custom Test',
                    test_name: 'My Custom Test',
                    is_auto_generated: 'true'
                });

            expect(mockCreateConsentFormTemplate).toHaveBeenCalled();
        });
    });

    describe('Request Logging', () => {
        it('should log incoming requests', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            mockGetConsentFormTemplates.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).get('/api/consent-forms/templates');

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should log request method and path', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            mockGetConsentFormTemplates.mockImplementation((req, res) => {
                res.status(200).json({ success: true, data: [] });
            });

            await request(app).post('/api/consent-forms/templates');

            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[Consent Forms]'));
            consoleSpy.mockRestore();
        });
    });

    describe('checkTemplateCreationPermission Middleware', () => {
        it('should deny non-superadmin creating standard test templates', async () => {
            // Change user role to urologist
            jest.unstable_mockModule('../middleware/auth.js', () => ({
                authenticateToken: (req, res, next) => {
                    req.user = { id: 1, email: 'doctor@example.com', role: 'urologist' };
                    next();
                },
                requireRole: (roles) => (req, res, next) => next()
            }));

            const response = await request(app)
                .post('/api/consent-forms/templates')
                .send({
                    procedure_name: 'MRI',
                    test_name: 'MRI Scan'
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should allow doctor to create auto-generated templates', async () => {
            jest.unstable_mockModule('../middleware/auth.js', () => ({
                authenticateToken: (req, res, next) => {
                    req.user = { id: 1, email: 'doctor@example.com', role: 'urologist' };
                    next();
                },
                requireRole: (roles) => (req, res, next) => next()
            }));

            mockCreateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            const response = await request(app)
                .post('/api/consent-forms/templates')
                .send({
                    procedure_name: 'Custom Test',
                    is_auto_generated: true
                });

            expect(response.status).toBe(201);
        });

        it('should allow nurse to create custom test templates', async () => {
            jest.unstable_mockModule('../middleware/auth.js', () => ({
                authenticateToken: (req, res, next) => {
                    req.user = { id: 1, email: 'nurse@example.com', role: 'urology_nurse' };
                    next();
                },
                requireRole: (roles) => (req, res, next) => next()
            }));

            mockCreateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            const response = await request(app)
                .post('/api/consent-forms/templates')
                .send({
                    procedure_name: 'Custom Blood Test',
                    test_name: 'My Custom Test'
                });

            expect(response.status).toBe(201);
        });

        it('should handle is_auto_generated as boolean true', async () => {
            jest.unstable_mockModule('../middleware/auth.js', () => ({
                authenticateToken: (req, res, next) => {
                    req.user = { id: 1, email: 'doctor@example.com', role: 'urologist' };
                    next();
                },
                requireRole: (roles) => (req, res, next) => next()
            }));

            mockCreateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            const response = await request(app)
                .post('/api/consent-forms/templates')
                .send({
                    procedure_name: 'Test',
                    is_auto_generated: true
                });

            expect(response.status).toBe(201);
        });

        it('should handle is_auto_generated as string "1"', async () => {
            jest.unstable_mockModule('../middleware/auth.js', () => ({
                authenticateToken: (req, res, next) => {
                    req.user = { id: 1, email: 'doctor@example.com', role: 'urologist' };
                    next();
                },
                requireRole: (roles) => (req, res, next) => next()
            }));

            mockCreateConsentFormTemplate.mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            });

            const response = await request(app)
                .post('/api/consent-forms/templates')
                .send({
                    procedure_name: 'Test',
                    is_auto_generated: '1'
                });

            expect(response.status).toBe(201);
        });

        it('should check for standard test names (MRI, TRUS, BIOPSY, PSA)', async () => {
            jest.unstable_mockModule('../middleware/auth.js', () => ({
                authenticateToken: (req, res, next) => {
                    req.user = { id: 1, email: 'doctor@example.com', role: 'urologist' };
                    next();
                },
                requireRole: (roles) => (req, res, next) => next()
            }));

            const standardTests = ['MRI', 'TRUS', 'BIOPSY', 'PSA'];
            for (const testName of standardTests) {
                const response = await request(app)
                    .post('/api/consent-forms/templates')
                    .send({
                        procedure_name: testName
                    });

                expect(response.status).toBe(403);
            }
        });
    });
});
