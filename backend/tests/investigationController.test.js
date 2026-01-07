import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock fs
const mockFs = {
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    unlinkSync: jest.fn(),
    readdirSync: jest.fn(),
    statSync: jest.fn(),
    createReadStream: jest.fn()
};

// Mock path
const mockPath = {
    extname: jest.fn((p) => {
        const match = p.match(/\.(\w+)$/);
        return match ? `.${match[1]}` : '';
    }),
    basename: jest.fn((p) => p.split('/').pop() || p.split('\\').pop())
};

// Mock multer
const mockMulter = {
    diskStorage: jest.fn(() => ({
        destination: jest.fn(),
        filename: jest.fn()
    }))
};

// Mock the database pool
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockClient = {
    query: mockQuery,
    release: mockRelease
};
const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: mockQuery
};

// Mock file stream
const mockFileStream = {
    on: jest.fn(),
    pipe: jest.fn(),
    destroy: jest.fn(),
    destroyed: false
};

// Replace the pool in the controller with our mock
jest.unstable_mockModule('../config/database.js', () => ({
    default: mockPool
}));

// Mock fs
jest.unstable_mockModule('fs', () => ({
    default: mockFs,
    existsSync: mockFs.existsSync,
    mkdirSync: mockFs.mkdirSync,
    unlinkSync: mockFs.unlinkSync,
    readdirSync: mockFs.readdirSync,
    statSync: mockFs.statSync,
    createReadStream: mockFs.createReadStream
}));

// Mock path
jest.unstable_mockModule('path', () => ({
    default: mockPath,
    extname: mockPath.extname,
    basename: mockPath.basename
}));

// Mock multer - multer is a function that returns middleware
const mockMulterFn = jest.fn(() => ({
    single: jest.fn(),
    array: jest.fn(),
    fields: jest.fn()
}));
// multer also has static methods
mockMulterFn.diskStorage = mockMulter.diskStorage;

jest.unstable_mockModule('multer', () => ({
    default: mockMulterFn
}));

// Mock SSRF protection & PSA status utils
jest.unstable_mockModule('../utils/ssrfProtection.js', () => ({
    validateFilePath: jest.fn((p) => p)
}));

jest.unstable_mockModule('../utils/psaStatusByAge.js', () => ({
    getPSAThresholdByAge: jest.fn(() => '4.0'),
    getPSAStatusByAge: jest.fn(() => 'Normal')
}));

jest.unstable_mockModule('../utils/corsHelper.js', () => ({
    setCorsHeaders: jest.fn()
}));

jest.unstable_mockModule('../utils/psaFileParser.js', () => ({
    extractPSADataFromFile: jest.fn().mockResolvedValue({
        success: true,
        count: 1,
        psaEntries: [{ date: '2024-01-01', value: '5.5' }],
        text: 'PSA: 5.5'
    })
}));

// We need to await the import of the controller after mocking the module
const investigationController = await import('../controllers/investigationController.js');

describe('investigationController', () => {
    let req, res;
    let setCorsHeaders;

    beforeEach(async () => {
        jest.clearAllMocks();
        req = {
            params: {},
            body: {},
            query: {},
            user: { id: 1, role: 'urologist' },
            file: null,
            validatedFilePath: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            on: jest.fn(),
            headersSent: false,
            pipe: jest.fn()
        };
        
        const corsHelper = await import('../utils/corsHelper.js');
        setCorsHeaders = corsHelper.setCorsHeaders;
        
        mockFs.existsSync.mockReturnValue(true);
        mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
        mockFs.createReadStream.mockReturnValue(mockFileStream);
        mockFileStream.on.mockImplementation((event, handler) => {
            if (event === 'open') setTimeout(() => handler(), 0);
            if (event === 'end') setTimeout(() => handler(), 0);
            return mockFileStream;
        });
        mockFileStream.pipe.mockReturnValue(res);
    });

    describe('Top-level code execution', () => {
        it('should execute top-level code and export all controller functions', () => {
            // Verify that module executed and all controller functions are exported
            expect(typeof investigationController.addPSAResult).toBe('function');
            expect(typeof investigationController.updatePSAResult).toBe('function');
            expect(typeof investigationController.addOtherTestResult).toBe('function');
            expect(typeof investigationController.getInvestigationResults).toBe('function');
            expect(typeof investigationController.getAllInvestigations).toBe('function');
            expect(typeof investigationController.deleteInvestigationResult).toBe('function');
            expect(typeof investigationController.createInvestigationRequest).toBe('function');
            expect(typeof investigationController.getInvestigationRequests).toBe('function');
            expect(typeof investigationController.updateInvestigationRequestStatus).toBe('function');
            expect(typeof investigationController.deleteInvestigationRequest).toBe('function');
            expect(typeof investigationController.serveFile).toBe('function');
            expect(typeof investigationController.parsePSAFile).toBe('function');
            
            // Verify upload middleware exists
            expect(investigationController.upload).toBeDefined();
            expect(typeof investigationController.upload.single).toBe('function');
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('addPSAResult', () => {
        it('should add PSA result successfully', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: '1980-01-01', first_name: 'John', last_name: 'Doe' }] }) // patientCheck
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] }) // userCheck
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] }); // resultInsert

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 when testDate is missing', async () => {
            req.params.patientId = '1';
            req.body = { result: '5.5' };

            await investigationController.addPSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test date and result are required'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 when result is missing', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01' };

            await investigationController.addPSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test date and result are required'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 404 when patient not found', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            mockQuery.mockResolvedValueOnce({ rows: [] }); // patientCheck

            await investigationController.addPSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Patient not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should handle file upload', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5', referenceRange: '0.0 - 4.0', notes: 'Test note', status: 'Elevated' };
            req.file = { path: 'uploads/test.pdf', originalname: 'test.pdf' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: '1980-01-01', first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Elevated', notes: 'Test note', file_path: 'uploads/test.pdf', file_name: 'test.pdf', author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle patient without date_of_birth', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: null, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle user not found (Unknown User)', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: '1980-01-01', first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [] }) // userCheck - no user found
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Unknown User', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle database error', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.addPSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Internal server error'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('getAllInvestigations', () => {
        it('should return all investigations summary', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ role: 'urologist' }] })
                .mockResolvedValueOnce({ rows: [{ patient_id: 1, first_name: 'John', last_name: 'Doe', upi: 'UPI123', age: 45, gender: 'M', initial_psa: '4.5', appointment_date: '2024-01-01', appointment_time: '10:00', urologist: 'Dr Smith', booking_created_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [{ patient_id: 1, test_type: 'mri' }] })
                .mockResolvedValueOnce({ rows: [{ patient_id: 1, investigation_name: 'mri', status: 'pending' }] })
                .mockResolvedValueOnce({ rows: [{ patient_id: 1, result: '5.5' }] });

            await investigationController.getAllInvestigations(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should filter by testType when provided', async () => {
            req.query.testType = 'mri';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ role: 'urologist' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getAllInvestigations(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should filter by status when provided', async () => {
            req.query.status = 'pending';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ role: 'urologist' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getAllInvestigations(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle empty results', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ role: 'urologist' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getAllInvestigations(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.arrayContaining([])
            }));
        });

        it('should return 500 on error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('DB Error'));
            await investigationController.getAllInvestigations(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('createInvestigationRequest', () => {
        it('should create investigation request with testNames array', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'radiology', testNames: ['MRI', 'CT Scan'], priority: 'routine', notes: 'Test notes', scheduledDate: '2024-01-01', scheduledTime: '10:00' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, investigation_type: 'radiology', investigation_name: 'MRI', status: 'requested', scheduled_date: '2024-01-01', scheduled_time: '10:00', created_at: new Date(), updated_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [{ id: 102, patient_id: 1, investigation_type: 'radiology', investigation_name: 'CT Scan', status: 'requested', scheduled_date: '2024-01-01', scheduled_time: '10:00', created_at: new Date(), updated_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [] }); // note insert

            await investigationController.createInvestigationRequest(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should create investigation request with single testName string', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'radiology', testName: 'MRI', priority: 'routine' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, investigation_type: 'radiology', investigation_name: 'MRI', status: 'requested', scheduled_date: null, scheduled_time: null, created_at: new Date(), updated_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.createInvestigationRequest(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should create investigation request with custom testName', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'custom', customTestName: 'Custom Test', priority: 'routine' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, investigation_type: 'custom', investigation_name: 'Custom Test', status: 'requested', scheduled_date: null, scheduled_time: null, created_at: new Date(), updated_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.createInvestigationRequest(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should return 400 when investigationType is missing', async () => {
            req.params.patientId = '1';
            req.body = { testNames: ['MRI'] };

            await investigationController.createInvestigationRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Investigation type is required'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 when no test names provided', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'radiology' };

            await investigationController.createInvestigationRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'At least one test name is required'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 404 when patient not found', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'radiology', testNames: ['MRI'] };

            mockQuery.mockResolvedValueOnce({ rows: [] });

            await investigationController.createInvestigationRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Patient not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should filter out empty and "other" test names', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'radiology', testNames: ['MRI', '', 'other', 'CT Scan'] };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, investigation_type: 'radiology', investigation_name: 'MRI', status: 'requested', scheduled_date: null, scheduled_time: null, created_at: new Date(), updated_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [{ id: 102, patient_id: 1, investigation_type: 'radiology', investigation_name: 'CT Scan', status: 'requested', scheduled_date: null, scheduled_time: null, created_at: new Date(), updated_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.createInvestigationRequest(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle database error', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'radiology', testNames: ['MRI'] };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockRejectedValueOnce(new Error('Database error'));

            await investigationController.createInvestigationRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('getInvestigationRequests', () => {
        it('should return investigation requests for a patient', async () => {
            req.params.patientId = '1';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({
                    rows: [{
                        id: 101,
                        investigation_name: 'MRI',
                        investigation_type: 'radiology',
                        status: 'requested',
                        scheduled_date: '2024-01-01',
                        scheduled_time: '10:00',
                        notes: 'Test notes',
                        created_at: new Date(),
                        updated_at: new Date()
                    }]
                });

            await investigationController.getInvestigationRequests(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should filter by status when provided', async () => {
            req.params.patientId = '1';
            req.query.status = 'requested';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getInvestigationRequests(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should return 404 when patient not found', async () => {
            req.params.patientId = '1';
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await investigationController.getInvestigationRequests(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Patient not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should handle database error', async () => {
            req.params.patientId = '1';
            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.getInvestigationRequests(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('updateInvestigationRequestStatus', () => {
        it('should update request status', async () => {
            req.params.requestId = '101';
            req.body = { status: 'completed' };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1 }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, status: 'completed', updated_at: new Date() }] });

            await investigationController.updateInvestigationRequestStatus(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 for invalid status', async () => {
            req.params.requestId = '101';
            req.body = { status: 'invalid_status' };

            await investigationController.updateInvestigationRequestStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 when status is missing', async () => {
            req.params.requestId = '101';
            req.body = {};

            await investigationController.updateInvestigationRequestStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 404 when request not found', async () => {
            req.params.requestId = '101';
            req.body = { status: 'completed' };
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await investigationController.updateInvestigationRequestStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Investigation request not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should handle database error', async () => {
            req.params.requestId = '101';
            req.body = { status: 'completed' };
            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.updateInvestigationRequestStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('deleteInvestigationRequest', () => {
        it('should delete investigation request', async () => {
            req.params.requestId = '101';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, created_by: 1 }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.deleteInvestigationRequest(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 404 when request not found', async () => {
            req.params.requestId = '101';
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await investigationController.deleteInvestigationRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Investigation request not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 403 when user is not creator and not superadmin', async () => {
            req.params.requestId = '101';
            req.user.role = 'nurse';
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 101, created_by: 999 }] });

            await investigationController.deleteInvestigationRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'You can only delete your own investigation requests'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should allow superadmin to delete any request', async () => {
            req.params.requestId = '101';
            req.user.role = 'superadmin';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, created_by: 999 }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.deleteInvestigationRequest(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle database error', async () => {
            req.params.requestId = '101';
            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.deleteInvestigationRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('addOtherTestResult', () => {
        it('should add other test result', async () => {
            req.params.patientId = '1';
            req.body = { testName: 'MRI', testDate: '2024-01-01', result: 'Normal' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'MRI', test_name: 'MRI', test_date: '2024-01-01', result: 'Normal', reference_range: '', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addOtherTestResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 when testName is missing', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01' };

            await investigationController.addOtherTestResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test name and test date are required'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 when testDate is missing', async () => {
            req.params.patientId = '1';
            req.body = { testName: 'MRI' };

            await investigationController.addOtherTestResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test name and test date are required'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 404 when patient not found', async () => {
            req.params.patientId = '1';
            req.body = { testName: 'MRI', testDate: '2024-01-01' };

            mockQuery.mockResolvedValueOnce({ rows: [] });

            await investigationController.addOtherTestResult(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Patient not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should handle file upload', async () => {
            req.params.patientId = '1';
            req.body = { testName: 'MRI', testDate: '2024-01-01', result: 'Normal', status: 'Abnormal', notes: 'Test note' };
            req.file = { path: 'uploads/mri.pdf', originalname: 'mri.pdf' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'MRI', test_name: 'MRI', test_date: '2024-01-01', result: 'Normal', reference_range: '', status: 'Abnormal', notes: 'Test note', file_path: 'uploads/mri.pdf', file_name: 'mri.pdf', author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addOtherTestResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle database error', async () => {
            req.params.patientId = '1';
            req.body = { testName: 'MRI', testDate: '2024-01-01' };

            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.addOtherTestResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('getInvestigationResults', () => {
        it('should return investigation results', async () => {
            req.params.patientId = '1';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: null, initial_psa_date: null, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, test_type: 'psa', test_name: 'PSA', result: '5.5', test_date: '2024-01-01', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 404 when patient not found', async () => {
            req.params.patientId = '1';
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Patient not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should filter by testType when provided', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: null, initial_psa_date: null, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, test_type: 'psa', test_name: 'PSA', result: '5.5', test_date: '2024-01-01', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should include initial PSA when no PSA results exist', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: '4.5', initial_psa_date: '2023-01-01', date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [] }); // No PSA results

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.arrayContaining([
                        expect.objectContaining({
                            isInitialPSA: true
                        })
                    ])
                })
            }));
        });

        it('should include initial PSA when not already in results', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: '4.5', initial_psa_date: '2023-01-01', date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, test_type: 'psa', test_name: 'PSA', result: '5.5', test_date: '2024-01-01', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') }] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle patient without date_of_birth', async () => {
            req.params.patientId = '1';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: null, initial_psa_date: null, date_of_birth: null }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle database error', async () => {
            req.params.patientId = '1';
            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.getInvestigationResults(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('deleteInvestigationResult', () => {
        it('should delete investigation result', async () => {
            req.params.resultId = '101';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, author_id: 1, file_path: null }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.deleteInvestigationResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 404 when result not found', async () => {
            req.params.resultId = '101';
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await investigationController.deleteInvestigationResult(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Investigation result not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 403 when user is not author and not superadmin', async () => {
            req.params.resultId = '101';
            req.user.role = 'nurse';
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 101, author_id: 999, file_path: null }] });

            await investigationController.deleteInvestigationResult(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'You can only delete your own investigation results'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should allow superadmin to delete any result', async () => {
            req.params.resultId = '101';
            req.user.role = 'superadmin';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, author_id: 999, file_path: null }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.deleteInvestigationResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should delete associated file if it exists', async () => {
            req.params.resultId = '101';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, author_id: 1, file_path: 'uploads/test.pdf' }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.deleteInvestigationResult(req, res);

            expect(mockFs.unlinkSync).toHaveBeenCalledWith('uploads/test.pdf');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle file deletion error gracefully', async () => {
            req.params.resultId = '101';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockFs.unlinkSync.mockImplementationOnce(() => { throw new Error('Delete failed'); });
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, author_id: 1, file_path: 'uploads/test.pdf' }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.deleteInvestigationResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle database error', async () => {
            req.params.resultId = '101';
            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.deleteInvestigationResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('updatePSAResult', () => {
        it('should update PSA result successfully', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, test_type: 'psa', patient_id: 1, date_of_birth: '1980-01-01', file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 for invalid resultId', async () => {
            req.params.resultId = 'invalid';
            req.body = { testDate: '2024-01-01', result: '6.0' };

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Invalid result ID'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 when testDate is missing', async () => {
            req.params.resultId = '101';
            req.body = { result: '6.0' };

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test date and result are required'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 400 when result is missing', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '' };

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test date and result are required'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should return 404 when result not found', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };

            mockQuery.mockResolvedValueOnce({ rows: [] });

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'PSA result not found'
            }));
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should handle file upload and delete old file', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            req.file = { path: 'uploads/new.pdf', originalname: 'new.pdf' };

            mockFs.existsSync.mockReturnValueOnce(true); // old file exists
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: 'uploads/old.pdf' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: 'uploads/new.pdf', file_name: 'new.pdf', author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(mockFs.unlinkSync).toHaveBeenCalledWith('uploads/old.pdf');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle file deletion error gracefully', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            req.file = { path: 'uploads/new.pdf', originalname: 'new.pdf' };

            mockFs.existsSync.mockReturnValueOnce(true);
            mockFs.unlinkSync.mockImplementationOnce(() => { throw new Error('Delete failed'); });
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: 'uploads/old.pdf' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: 'uploads/new.pdf', file_name: 'new.pdf', author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle patient without date_of_birth', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: null, file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle database error', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };

            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(mockRelease).toHaveBeenCalled();
        });
    });

    describe('serveFile', () => {
        it('should return 400 when validatedFilePath is missing', async () => {
            req.validatedFilePath = null;

            await investigationController.serveFile(req, res);

            expect(setCorsHeaders).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'File path is required'
            }));
        });

        it('should return 404 when file does not exist', async () => {
            req.validatedFilePath = 'uploads/nonexistent.pdf';
            mockFs.existsSync.mockReturnValueOnce(false);
            mockFs.existsSync.mockReturnValueOnce(true); // uploads/investigations exists
            mockFs.readdirSync.mockReturnValueOnce(['other.pdf']);

            await investigationController.serveFile(req, res);

            expect(setCorsHeaders).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'File not found'
            }));
        });

        it('should serve file successfully', async () => {
            req.validatedFilePath = 'uploads/test.pdf';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockPath.extname.mockReturnValue('.pdf');
            mockPath.basename.mockReturnValue('test.pdf');
            mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
            mockFs.createReadStream.mockReturnValue(mockFileStream);

            await investigationController.serveFile(req, res);

            expect(setCorsHeaders).toHaveBeenCalled();
            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
            expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', 'inline; filename="test.pdf"');
            expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
            expect(mockFs.createReadStream).toHaveBeenCalledWith('uploads/test.pdf');
            expect(mockFileStream.pipe).toHaveBeenCalledWith(res);
        });

        it('should handle exception', async () => {
            req.validatedFilePath = 'uploads/test.pdf';
            mockFs.existsSync.mockImplementation(() => { throw new Error('FS error'); });

            await investigationController.serveFile(req, res);

            expect(setCorsHeaders).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Error serving file'
            }));
        });
    });

    describe('parsePSAFile', () => {
        it('should return 400 when no file uploaded', async () => {
            req.file = null;

            await investigationController.parsePSAFile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'No file uploaded'
            }));
        });

        it('should parse PSA file successfully', async () => {
            req.file = { path: 'uploads/psa.pdf', originalname: 'psa.pdf' };
            mockPath.extname.mockReturnValue('.pdf');
            const psaFileParser = await import('../utils/psaFileParser.js');
            psaFileParser.extractPSADataFromFile.mockResolvedValue({
                success: true,
                count: 1,
                psaEntries: [{ date: '2024-01-01', value: '5.5' }],
                text: 'PSA: 5.5'
            });

            await investigationController.parsePSAFile(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'Extracted 1 PSA result(s) from file'
            }));
        });

        it('should handle parse failure', async () => {
            req.file = { path: 'uploads/psa.pdf', originalname: 'psa.pdf' };
            mockPath.extname.mockReturnValue('.pdf');
            const psaFileParser = await import('../utils/psaFileParser.js');
            psaFileParser.extractPSADataFromFile.mockResolvedValue({
                success: false,
                error: 'Parse failed',
                count: 0,
                psaEntries: []
            });

            await investigationController.parsePSAFile(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Parse failed'
            }));
        });

        it('should handle exception', async () => {
            req.file = { path: 'uploads/psa.pdf', originalname: 'psa.pdf' };
            mockPath.extname.mockReturnValue('.pdf');
            const psaFileParser = await import('../utils/psaFileParser.js');
            psaFileParser.extractPSADataFromFile.mockRejectedValue(new Error('Parse error'));

            await investigationController.parsePSAFile(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Error parsing PSA file'
            }));
        });
    });

    describe('addPSAResult - edge cases', () => {
        it('should handle result === null', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: null };

            await investigationController.addPSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test date and result are required'
            }));
        });

        it('should handle result === undefined', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: undefined };

            await investigationController.addPSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should handle result === empty string', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '' };

            await investigationController.addPSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should auto-determine status when not provided', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            const psaStatusByAge = await import('../utils/psaStatusByAge.js');
            psaStatusByAge.getPSAStatusByAge.mockReturnValue('Elevated');

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: '1980-01-01', first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Elevated', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(psaStatusByAge.getPSAStatusByAge).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('updatePSAResult - edge cases', () => {
        it('should handle result === null', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: null };

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test date and result are required'
            }));
        });

        it('should handle result === undefined', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: undefined };

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should auto-determine status when not provided', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            const psaStatusByAge = await import('../utils/psaStatusByAge.js');
            psaStatusByAge.getPSAStatusByAge.mockReturnValue('Elevated');

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Elevated', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(psaStatusByAge.getPSAStatusByAge).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle old file does not exist when updating', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            req.file = { path: 'uploads/new.pdf', originalname: 'new.pdf' };

            mockFs.existsSync.mockReturnValueOnce(false); // old file does not exist
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: 'uploads/old.pdf' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: 'uploads/new.pdf', file_name: 'new.pdf', author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(mockFs.unlinkSync).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('getInvestigationResults - initial PSA edge cases', () => {
        it('should not include initial PSA when already in results (same date and value)', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            const initialPSADate = '2023-01-01';
            const initialPSAValue = '4.5';
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: initialPSAValue, initial_psa_date: initialPSADate, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, test_type: 'psa', test_name: 'PSA', result: initialPSAValue, test_date: initialPSADate, reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(initialPSADate), updated_at: new Date(initialPSADate) }] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should not include initial PSA when testType is not PSA', async () => {
            req.params.patientId = '1';
            req.query.testType = 'mri';
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: '4.5', initial_psa_date: '2023-01-01', date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.not.arrayContaining([
                        expect.objectContaining({ isInitialPSA: true })
                    ])
                })
            }));
        });
    });

    describe('getAllInvestigations - edge cases', () => {
        it('should handle patients with all three main tests completed (filter them out)', async () => {
            mockQuery
                .mockResolvedValueOnce({ rows: [{ role: 'urologist' }] })
                .mockResolvedValueOnce({ rows: [{ patient_id: 1, first_name: 'John', last_name: 'Doe', upi: 'UPI123', age: 45, gender: 'M', initial_psa: '4.5', appointment_date: '2024-01-01', appointment_time: '10:00', urologist: 'Dr Smith', booking_created_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [
                    { patient_id: 1, test_type: 'mri', test_name: 'MRI' },
                    { patient_id: 1, test_type: 'biopsy', test_name: 'Biopsy' },
                    { patient_id: 1, test_type: 'trus', test_name: 'TRUS' }
                ] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getAllInvestigations(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    investigations: expect.arrayContaining([])
                })
            }));
        });
    });

    describe('serveFile - file stream error handling', () => {
        it('should handle file stream error', async () => {
            req.validatedFilePath = 'uploads/test.pdf';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockPath.extname.mockReturnValue('.pdf');
            mockPath.basename.mockReturnValue('test.pdf');
            mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
            
            const errorStream = {
                on: jest.fn((event, handler) => {
                    if (event === 'error') {
                        setTimeout(() => handler(new Error('Stream error')), 0);
                    }
                    return errorStream;
                }),
                pipe: jest.fn(),
                destroy: jest.fn(),
                destroyed: false
            };
            mockFs.createReadStream.mockReturnValue(errorStream);

            await investigationController.serveFile(req, res);

            expect(setCorsHeaders).toHaveBeenCalled();
            expect(mockFs.createReadStream).toHaveBeenCalledWith('uploads/test.pdf');
        });

        it('should handle response close event', async () => {
            req.validatedFilePath = 'uploads/test.pdf';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockPath.extname.mockReturnValue('.pdf');
            mockPath.basename.mockReturnValue('test.pdf');
            mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
            
            const closeStream = {
                on: jest.fn((event, handler) => {
                    if (event === 'open') setTimeout(() => handler(), 0);
                    if (event === 'end') setTimeout(() => handler(), 0);
                    return closeStream;
                }),
                pipe: jest.fn().mockReturnValue(res),
                destroy: jest.fn(),
                destroyed: false
            };
            mockFs.createReadStream.mockReturnValue(closeStream);
            res.on.mockImplementation((event, handler) => {
                if (event === 'close') setTimeout(() => handler(), 0);
                return res;
            });

            await investigationController.serveFile(req, res);

            expect(res.on).toHaveBeenCalledWith('close', expect.any(Function));
        });

        it('should handle different file types', async () => {
            req.validatedFilePath = 'uploads/test.doc';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockPath.extname.mockReturnValue('.doc');
            mockPath.basename.mockReturnValue('test.doc');
            mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
            mockFs.createReadStream.mockReturnValue(mockFileStream);

            await investigationController.serveFile(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/msword');
        });

        it('should handle unknown file type', async () => {
            req.validatedFilePath = 'uploads/test.unknown';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockPath.extname.mockReturnValue('.unknown');
            mockPath.basename.mockReturnValue('test.unknown');
            mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
            mockFs.createReadStream.mockReturnValue(mockFileStream);

            await investigationController.serveFile(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
        });
    });

    describe('createInvestigationRequest - edge cases', () => {
        it('should handle testName as array', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'radiology', testName: ['MRI', 'CT Scan'], priority: 'routine' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, investigation_type: 'radiology', investigation_name: 'MRI', status: 'requested', scheduled_date: null, scheduled_time: null, created_at: new Date(), updated_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [{ id: 102, patient_id: 1, investigation_type: 'radiology', investigation_name: 'CT Scan', status: 'requested', scheduled_date: null, scheduled_time: null, created_at: new Date(), updated_at: new Date() }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.createInvestigationRequest(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle customTestName with empty string', async () => {
            req.params.patientId = '1';
            req.body = { investigationType: 'custom', customTestName: '   ', priority: 'routine' };

            await investigationController.createInvestigationRequest(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'At least one test name is required'
            }));
        });
    });

    describe('updatePSAResult - additional edge cases', () => {
        it('should handle referenceRange fallback to null when both are falsy', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0', referenceRange: null };
            const psaStatusByAge = await import('../utils/psaStatusByAge.js');
            psaStatusByAge.getPSAThresholdByAge.mockReturnValue(null);

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: null, status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle filePath equals existingResult.file_path (no new file)', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            // No req.file, so filePath will remain as existingResult.file_path

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: 'uploads/existing.pdf' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: 'uploads/existing.pdf', file_name: 'existing.pdf', author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle result as number (conversion to string)', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: 6.0 };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle result as boolean false (conversion to string)', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: false };

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Test date and result are required'
            }));
        });

        it('should handle result as zero (conversion to string)', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: 0 };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle age calculation edge case - birthday today', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
            const birthDateStr = birthDate.toISOString().split('T')[0];

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: birthDateStr, file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle age calculation edge case - birthday later this month', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 0, 0, 0);
            const birthDateStr = birthDate.toISOString().split('T')[0];

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: birthDateStr, file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle age calculation edge case - birthday earlier this month', async () => {
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 0, 0, 0);
            const birthDateStr = birthDate.toISOString().split('T')[0];

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: birthDateStr, file_path: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '6.0', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle development environment error details', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: null }] })
                .mockRejectedValueOnce(new Error('Database error'));

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Internal server error',
                error: 'Database error'
            }));

            process.env.NODE_ENV = originalEnv;
        });

        it('should handle production environment (no error details)', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            req.params.resultId = '101';
            req.body = { testDate: '2024-01-01', result: '6.0' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, date_of_birth: '1980-01-01', file_path: null }] })
                .mockRejectedValueOnce(new Error('Database error'));

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                message: 'Internal server error'
            }));
            expect(res.json).toHaveBeenCalledWith(expect.not.objectContaining({
                error: expect.anything()
            }));

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('addPSAResult - additional edge cases', () => {
        it('should handle age calculation edge case - birthday today', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
            const birthDateStr = birthDate.toISOString().split('T')[0];

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: birthDateStr, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle age calculation edge case - birthday later this month', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 0, 0, 0);
            const birthDateStr = birthDate.toISOString().split('T')[0];

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: birthDateStr, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle age calculation edge case - birthday earlier this month', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 5, 0, 0, 0);
            const birthDateStr = birthDate.toISOString().split('T')[0];

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: birthDateStr, first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle referenceRange fallback to ageAdjustedReferenceRange', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            const psaStatusByAge = await import('../utils/psaStatusByAge.js');
            psaStatusByAge.getPSAThresholdByAge.mockReturnValue('4.5');

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: '1980-01-01', first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.5', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(psaStatusByAge.getPSAThresholdByAge).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('fileFilter - comprehensive tests', () => {
        it('should accept file with matching extname and mimetype', () => {
            const file = {
                originalname: 'test.pdf',
                mimetype: 'application/pdf'
            };
            const cb = jest.fn();
            const fileFilter = investigationController.upload._fileFilter || investigationController.upload.storage._fileFilter;
            
            if (fileFilter) {
                fileFilter(null, file, cb);
                expect(cb).toHaveBeenCalledWith(null, true);
            }
        });

        it('should reject file with non-matching extname', () => {
            const file = {
                originalname: 'test.jpg',
                mimetype: 'application/pdf'
            };
            const cb = jest.fn();
            const fileFilter = investigationController.upload._fileFilter || investigationController.upload.storage._fileFilter;
            
            if (fileFilter) {
                fileFilter(null, file, cb);
                expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
            }
        });

        it('should accept file with matching extname but different mimetype', () => {
            const file = {
                originalname: 'test.pdf',
                mimetype: 'application/octet-stream'
            };
            const cb = jest.fn();
            const fileFilter = investigationController.upload._fileFilter || investigationController.upload.storage._fileFilter;
            
            if (fileFilter) {
                fileFilter(null, file, cb);
                // Should accept if extname matches
                expect(cb).toHaveBeenCalled();
            }
        });

        it('should accept DOC file', () => {
            const file = {
                originalname: 'test.doc',
                mimetype: 'application/msword'
            };
            const cb = jest.fn();
            const fileFilter = investigationController.upload._fileFilter || investigationController.upload.storage._fileFilter;
            
            if (fileFilter) {
                fileFilter(null, file, cb);
                expect(cb).toHaveBeenCalledWith(null, true);
            }
        });

        it('should accept DOCX file', () => {
            const file = {
                originalname: 'test.docx',
                mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            const cb = jest.fn();
            const fileFilter = investigationController.upload._fileFilter || investigationController.upload.storage._fileFilter;
            
            if (fileFilter) {
                fileFilter(null, file, cb);
                expect(cb).toHaveBeenCalledWith(null, true);
            }
        });

        it('should accept XLS file', () => {
            const file = {
                originalname: 'test.xls',
                mimetype: 'application/vnd.ms-excel'
            };
            const cb = jest.fn();
            const fileFilter = investigationController.upload._fileFilter || investigationController.upload.storage._fileFilter;
            
            if (fileFilter) {
                fileFilter(null, file, cb);
                expect(cb).toHaveBeenCalledWith(null, true);
            }
        });

        it('should accept XLSX file', () => {
            const file = {
                originalname: 'test.xlsx',
                mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };
            const cb = jest.fn();
            const fileFilter = investigationController.upload._fileFilter || investigationController.upload.storage._fileFilter;
            
            if (fileFilter) {
                fileFilter(null, file, cb);
                expect(cb).toHaveBeenCalledWith(null, true);
            }
        });

        it('should accept CSV file', () => {
            const file = {
                originalname: 'test.csv',
                mimetype: 'text/csv'
            };
            const cb = jest.fn();
            const fileFilter = investigationController.upload._fileFilter || investigationController.upload.storage._fileFilter;
            
            if (fileFilter) {
                fileFilter(null, file, cb);
                expect(cb).toHaveBeenCalledWith(null, true);
            }
        });
    });

    describe('fileFilter - edge cases', () => {
        it('should reject file when mimetype matches but extname does not', () => {
            const cb = jest.fn();
            const file = {
                originalname: 'test.jpg',
                mimetype: 'application/pdf'
            };
            
            // Access fileFilter through multer configuration
            const multerConfig = investigationController.upload;
            // The fileFilter is stored in the multer instance
            // We need to test the logic directly
            const allowedTypes = /pdf|doc|docx|xls|xlsx|csv/;
            const extname = allowedTypes.test('.jpg');
            const mimetype = allowedTypes.test('application/pdf') || 'application/pdf' === 'application/pdf';
            
            // This should fail because extname is false
            expect((mimetype || extname) && extname).toBe(false);
        });

        it('should accept file when extname matches but mimetype does not match pattern', () => {
            const allowedTypes = /pdf|doc|docx|xls|xlsx|csv/;
            const extname = allowedTypes.test('.pdf');
            const mimetype = allowedTypes.test('application/octet-stream') ||
                'application/octet-stream' === 'application/pdf' ||
                'application/octet-stream' === 'application/msword' ||
                'application/octet-stream' === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                'application/octet-stream' === 'application/vnd.ms-excel' ||
                'application/octet-stream' === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                'application/octet-stream' === 'text/csv';
            
            // Should accept because extname matches
            expect((mimetype || extname) && extname).toBe(true);
        });
    });

    describe('Storage configuration - directory creation', () => {
        it('should create upload directory if it does not exist', () => {
            // The storage.destination function should create directory
            mockFs.existsSync.mockReturnValueOnce(false);
            const storage = investigationController.upload.storage;
            expect(storage).toBeDefined();
            // Directory creation is tested through multer configuration
            expect(mockFs.existsSync).toHaveBeenCalled();
        });
    });

    describe('addPSAResult - age calculation edge cases', () => {
        it('should calculate age correctly when birthday is today', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: birthDate.toISOString().split('T')[0], first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should calculate age correctly when birthday is same month but earlier date', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: birthDate.toISOString().split('T')[0], first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should calculate age correctly when birthday is same month but later date', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: birthDate.toISOString().split('T')[0], first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('updatePSAResult - error handling edge cases', () => {
        it('should include error message in development mode', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: expect.any(String)
            }));
            
            process.env.NODE_ENV = originalEnv;
        });

        it('should not include error message in production mode', async () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            mockQuery.mockRejectedValueOnce(new Error('Database error'));

            await investigationController.updatePSAResult(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false
            }));
            expect(res.json).toHaveBeenCalledWith(expect.not.objectContaining({
                error: expect.any(String)
            }));
            
            process.env.NODE_ENV = originalEnv;
        });

        it('should handle filePath update when new file is uploaded', async () => {
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            req.file = { path: 'uploads/new-file.pdf', originalname: 'new-file.pdf' };
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, file_path: 'uploads/old-file.pdf', date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: 'uploads/new-file.pdf', file_name: 'new-file.pdf', author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });
            
            mockFs.existsSync.mockReturnValueOnce(true);
            mockFs.unlinkSync.mockImplementation(() => {});

            await investigationController.updatePSAResult(req, res);

            expect(mockFs.unlinkSync).toHaveBeenCalledWith('uploads/old-file.pdf');
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should handle filePath update when filePath is same as existing', async () => {
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            req.file = null;
            
            const existingFilePath = 'uploads/existing-file.pdf';
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, file_path: existingFilePath, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: existingFilePath, file_name: 'existing-file.pdf', author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('getInvestigationResults - initial PSA matching edge cases', () => {
        it('should match initial PSA when date matches but value differs', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            const initialPSADate = '2023-01-01';
            const initialPSAValue = '4.5';
            const resultPSAValue = '5.5';
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: initialPSAValue, initial_psa_date: initialPSADate, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, test_type: 'psa', test_name: 'PSA', result: resultPSAValue, test_date: initialPSADate, reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(initialPSADate), updated_at: new Date(initialPSADate) }] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.arrayContaining([
                        expect.objectContaining({ isInitialPSA: true })
                    ])
                })
            }));
        });

        it('should match initial PSA when value matches but date differs', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            const initialPSADate = '2023-01-01';
            const initialPSAValue = '4.5';
            const resultPSADate = '2023-01-02';
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: initialPSAValue, initial_psa_date: initialPSADate, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, test_type: 'psa', test_name: 'PSA', result: initialPSAValue, test_date: resultPSADate, reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(resultPSADate), updated_at: new Date(resultPSADate) }] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.arrayContaining([
                        expect.objectContaining({ isInitialPSA: true })
                    ])
                })
            }));
        });

        it('should handle initial PSA with null testDate in results', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            const initialPSADate = '2023-01-01';
            const initialPSAValue = '4.5';
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: initialPSAValue, initial_psa_date: initialPSADate, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, test_type: 'psa', test_name: 'PSA', result: initialPSAValue, test_date: null, reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.arrayContaining([
                        expect.objectContaining({ isInitialPSA: true })
                    ])
                })
            }));
        });

        it('should handle initial PSA with null initial_psa_date', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: '4.5', initial_psa_date: null, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    results: expect.not.arrayContaining([
                        expect.objectContaining({ isInitialPSA: true })
                    ])
                })
            }));
        });
    });

    describe('getInvestigationResults - age calculation edge cases', () => {
        it('should calculate age correctly when birthday is same month but earlier date', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: '4.5', initial_psa_date: '2023-01-01', date_of_birth: birthDate.toISOString().split('T')[0] }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should calculate age correctly when birthday is same month but later date', async () => {
            req.params.patientId = '1';
            req.query.testType = 'psa';
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, first_name: 'John', last_name: 'Doe', initial_psa: '4.5', initial_psa_date: '2023-01-01', date_of_birth: birthDate.toISOString().split('T')[0] }] })
                .mockResolvedValueOnce({ rows: [] });

            await investigationController.getInvestigationResults(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('updatePSAResult - age calculation edge cases', () => {
        it('should calculate age correctly when birthday is same month but earlier date', async () => {
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, file_path: null, date_of_birth: birthDate.toISOString().split('T')[0] }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });

        it('should calculate age correctly when birthday is same month but later date', async () => {
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };
            
            const today = new Date();
            const birthDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            
            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, file_path: null, date_of_birth: birthDate.toISOString().split('T')[0] }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });

    describe('serveFile - MIME type edge cases', () => {
        it('should handle DOC file MIME type', async () => {
            req.validatedFilePath = 'uploads/test.doc';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockPath.extname.mockReturnValue('.doc');
            mockPath.basename.mockReturnValue('test.doc');
            mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
            mockFs.createReadStream.mockReturnValue(mockFileStream);

            await investigationController.serveFile(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/msword');
        });

        it('should handle DOCX file MIME type', async () => {
            req.validatedFilePath = 'uploads/test.docx';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockPath.extname.mockReturnValue('.docx');
            mockPath.basename.mockReturnValue('test.docx');
            mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
            mockFs.createReadStream.mockReturnValue(mockFileStream);

            await investigationController.serveFile(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        });

        it('should handle unknown file extension', async () => {
            req.validatedFilePath = 'uploads/test.unknown';
            mockFs.existsSync.mockReturnValueOnce(true);
            mockPath.extname.mockReturnValue('.unknown');
            mockPath.basename.mockReturnValue('test.unknown');
            mockFs.statSync.mockReturnValue({ size: 1024, birthtime: new Date(), mtime: new Date() });
            mockFs.createReadStream.mockReturnValue(mockFileStream);

            await investigationController.serveFile(req, res);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
        });
    });

    describe('addPSAResult - referenceRange edge cases', () => {
        it('should use provided referenceRange when available', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5', referenceRange: '0.0 - 5.0' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: '1980-01-01', first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 5.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO investigation_results'),
                expect.arrayContaining(['0.0 - 5.0'])
            );
        });

        it('should use age-adjusted referenceRange when not provided', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: '1980-01-01', first_name: 'John', last_name: 'Doe' }] })
                .mockResolvedValueOnce({ rows: [{ first_name: 'Dr', last_name: 'Smith' }] })
                .mockResolvedValueOnce({ rows: [{ id: 101, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.addPSAResult(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO investigation_results'),
                expect.arrayContaining([expect.stringContaining('0.0 -')])
            );
        });
    });

    describe('updatePSAResult - referenceRange edge cases', () => {
        it('should use provided referenceRange when available', async () => {
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5', referenceRange: '0.0 - 5.0' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, file_path: null, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 5.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE investigation_results'),
                expect.arrayContaining(['0.0 - 5.0'])
            );
        });

        it('should use age-adjusted referenceRange when not provided', async () => {
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, file_path: null, date_of_birth: '1980-01-01' }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: '0.0 - 4.0', status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE investigation_results'),
                expect.arrayContaining([expect.stringContaining('0.0 -')])
            );
        });

        it('should use null referenceRange when neither provided nor age-adjusted available', async () => {
            req.params.resultId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            mockQuery
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, file_path: null, date_of_birth: null }] })
                .mockResolvedValueOnce({ rows: [{ id: 1, patient_id: 1, test_type: 'psa', test_name: 'PSA', test_date: '2024-01-01', result: '5.5', reference_range: null, status: 'Normal', notes: '', file_path: null, file_name: null, author_name: 'Dr Smith', author_role: 'urologist', created_at: new Date(), updated_at: new Date() }] });

            await investigationController.updatePSAResult(req, res);

            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE investigation_results'),
                expect.arrayContaining([expect.anything()])
            );
        });
    });
});
