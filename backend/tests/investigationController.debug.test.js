import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock the database pool
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockPool = {
    connect: jest.fn().mockResolvedValue({
        query: mockQuery,
        release: mockRelease
    }),
    query: mockQuery
};

// Replace the pool in the controller with our mock
jest.unstable_mockModule('../config/database.js', () => ({
    default: mockPool
}));

// We need to await the import of the controller after mocking the module
const investigationController = await import('../controllers/investigationController.js');

describe('investigationController DEBUG', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: {},
            body: {},
            query: {},
            user: { id: 1, role: 'urologist' }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn(),
            on: jest.fn(),
            headersSent: false
        };
    });

    describe('addPSAResult', () => {
        it('should add PSA result successfully', async () => {
            req.params.patientId = '1';
            req.body = { testDate: '2024-01-01', result: '5.5' };

            // 1. patientCheck
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 1, date_of_birth: '1980-01-01' }] });
            // 2. insert
            mockQuery.mockResolvedValueOnce({ rows: [{ id: 101 }] });

            await investigationController.addPSAResult(req, res);

            if (res.status.mock.calls.length > 0) {
                console.log('Status called with:', res.status.mock.calls[0][0]);
            }
            if (res.json.mock.calls.length > 0) {
                console.log('JSON called with:', JSON.stringify(res.json.mock.calls[0][0]));
            }

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true
            }));
        });
    });
});
