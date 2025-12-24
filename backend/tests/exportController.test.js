import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies
const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockConnect = jest.fn(() => Promise.resolve({
    query: mockQuery,
    release: mockRelease
}));

jest.unstable_mockModule('../config/database.js', () => ({
    default: { connect: mockConnect }
}));

jest.unstable_mockModule('../services/auditLogger.js', () => ({
    logDataExport: jest.fn().mockResolvedValue(undefined)
}));

// Import after mocking
const { exportPatientsToCSV, exportPatientsToExcel, getExportFields, _testHelpers } = await import('../controllers/exportController.js');
const { logDataExport } = await import('../services/auditLogger.js');

describe('exportController', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            query: {},
            user: { id: 1 }
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('_testHelpers.buildExportQuery', () => {
        it('uses default fields when none specified', () => {
            const result = _testHelpers.buildExportQuery({});
            expect(result.selectedFields).toEqual(_testHelpers.DEFAULT_FIELDS);
            expect(result.error).toBeUndefined();
        });

        it('parses comma-separated fields', () => {
            const result = _testHelpers.buildExportQuery({ fields: 'upi,first_name,last_name' });
            expect(result.selectedFields).toEqual(['upi', 'first_name', 'last_name']);
        });

        it('returns error for invalid fields', () => {
            const result = _testHelpers.buildExportQuery({ fields: 'invalid_field,another_invalid' });
            expect(result.error).toBe('No valid fields selected');
        });

        it('adds date filters for non-OPD Queue', () => {
            const result = _testHelpers.buildExportQuery({
                startDate: '2024-01-01',
                endDate: '2024-12-31'
            });
            expect(result.params).toContain('2024-01-01');
            expect(result.params).toContain('2024-12-31');
            expect(result.query).toContain('created_at >=');
            expect(result.query).toContain('created_at <=');
        });

        it('adds care pathway filter', () => {
            const result = _testHelpers.buildExportQuery({ carePathway: 'Surgery' });
            expect(result.params).toContain('Surgery');
            expect(result.query).toContain('care_pathway');
        });

        it('adds OPD Queue care pathway filter with null handling', () => {
            const result = _testHelpers.buildExportQuery({ carePathway: 'OPD Queue' });
            expect(result.query).toContain('care_pathway IS NULL');
        });

        it('adds status filter', () => {
            const result = _testHelpers.buildExportQuery({ status: 'Active' });
            expect(result.params).toContain('Active');
            expect(result.query).toContain('status');
        });

        it('uses appointment-based date filtering for OPD Queue', () => {
            const result = _testHelpers.buildExportQuery({
                carePathway: 'OPD Queue',
                startDate: '2024-01-01'
            });
            expect(result.query).toContain('appointments');
            expect(result.query).toContain('investigation_bookings');
        });
    });

    describe('_testHelpers.buildDateConditions', () => {
        it('builds conditions for startDate and endDate', () => {
            const params = [];
            const conditions = _testHelpers.buildDateConditions('2024-01-01', '2024-12-31', 1, params);
            expect(conditions.length).toBe(1);
            expect(params).toContain('2024-01-01');
            expect(params).toContain('2024-12-31');
        });

        it('builds conditions for startDate only', () => {
            const params = [];
            const conditions = _testHelpers.buildDateConditions('2024-01-01', null, 1, params);
            expect(conditions.length).toBe(1);
            expect(params).toEqual(['2024-01-01']);
        });

        it('builds conditions for endDate only', () => {
            const params = [];
            const conditions = _testHelpers.buildDateConditions(null, '2024-12-31', 1, params);
            expect(conditions.length).toBe(1);
            expect(params).toEqual(['2024-12-31']);
        });

        it('returns empty array when no dates provided', () => {
            const params = [];
            const conditions = _testHelpers.buildDateConditions(null, null, 1, params);
            expect(conditions).toEqual([]);
            expect(params).toEqual([]);
        });
    });

    describe('_testHelpers.convertToCSV', () => {
        it('converts rows to CSV format', () => {
            const rows = [
                { name: 'John', age: '30' },
                { name: 'Jane', age: '25' }
            ];
            const headers = ['name', 'age'];
            const csv = _testHelpers.convertToCSV(rows, headers);
            expect(csv).toContain('name,age');
            expect(csv).toContain('John,30');
            expect(csv).toContain('Jane,25');
        });

        it('handles null and undefined values', () => {
            const rows = [{ name: null, age: undefined }];
            const headers = ['name', 'age'];
            const csv = _testHelpers.convertToCSV(rows, headers);
            expect(csv).toContain(',');
        });

        it('escapes commas in values', () => {
            const rows = [{ name: 'Doe, John', age: '30' }];
            const headers = ['name', 'age'];
            const csv = _testHelpers.convertToCSV(rows, headers);
            expect(csv).toContain('"Doe, John"');
        });

        it('escapes quotes in values', () => {
            const rows = [{ name: 'John "Jack" Doe', age: '30' }];
            const headers = ['name', 'age'];
            const csv = _testHelpers.convertToCSV(rows, headers);
            expect(csv).toContain('""');
        });

        it('escapes newlines in values', () => {
            const rows = [{ name: 'John\nDoe', age: '30' }];
            const headers = ['name', 'age'];
            const csv = _testHelpers.convertToCSV(rows, headers);
            expect(csv).toContain('"John\nDoe"');
        });
    });

    describe('_testHelpers helper functions', () => {
        describe('addDateFilters', () => {
            it('adds start date filter', () => {
                const conditions = [];
                const params = [];
                _testHelpers.addDateFilters(conditions, params, '2024-01-01', null);
                expect(conditions.length).toBe(1);
                expect(params).toEqual(['2024-01-01']);
            });

            it('adds end date filter', () => {
                const conditions = [];
                const params = [];
                _testHelpers.addDateFilters(conditions, params, null, '2024-12-31');
                expect(conditions.length).toBe(1);
                expect(params).toEqual(['2024-12-31']);
            });

            it('adds both date filters', () => {
                const conditions = [];
                const params = [];
                _testHelpers.addDateFilters(conditions, params, '2024-01-01', '2024-12-31');
                expect(conditions.length).toBe(2);
                expect(params).toEqual(['2024-01-01', '2024-12-31']);
            });
        });

        describe('addCarePathwayFilter', () => {
            it('adds OPD Queue filter with null handling', () => {
                const conditions = [];
                const params = [];
                _testHelpers.addCarePathwayFilter(conditions, params, 'OPD Queue');
                expect(conditions[0]).toContain('IS NULL');
                expect(params).toEqual(['OPD Queue']);
            });

            it('adds regular care pathway filter', () => {
                const conditions = [];
                const params = [];
                _testHelpers.addCarePathwayFilter(conditions, params, 'Surgery');
                expect(conditions[0]).not.toContain('IS NULL');
                expect(params).toEqual(['Surgery']);
            });
        });

        describe('addStatusFilter', () => {
            it('adds status filter', () => {
                const conditions = [];
                const params = [];
                _testHelpers.addStatusFilter(conditions, params, 'Active');
                expect(conditions.length).toBe(1);
                expect(params).toEqual(['Active']);
            });
        });

        describe('buildQueryString', () => {
            it('builds query with no conditions', () => {
                const query = _testHelpers.buildQueryString(['p.upi AS "upi"'], []);
                expect(query).toContain('SELECT');
                expect(query).toContain('FROM patients p');
                expect(query).not.toContain('WHERE');
            });

            it('builds query with conditions', () => {
                const query = _testHelpers.buildQueryString(['p.upi AS "upi"'], ['p.status = $1']);
                expect(query).toContain('WHERE');
                expect(query).toContain('p.status = $1');
            });
        });

        describe('generateDateExistsCondition', () => {
            it('generates condition without next param index', () => {
                const condition = _testHelpers.generateDateExistsCondition(1, '>=');
                expect(condition).toContain('>= $1');
                expect(condition).not.toContain('$2');
            });

            it('generates condition with next param index', () => {
                const condition = _testHelpers.generateDateExistsCondition(1, '>=', 2);
                expect(condition).toContain('>= $1');
                expect(condition).toContain('<= $2');
            });
        });
    });

    describe('exportPatientsToCSV', () => {
        it('exports patients to CSV successfully', async () => {
            mockQuery.mockResolvedValue({
                rows: [{ upi: 'UPI001', first_name: 'John' }]
            });

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(mockRes.send).toHaveBeenCalled();
            expect(logDataExport).toHaveBeenCalled();
        });

        it('returns 400 for invalid fields', async () => {
            mockReq.query = { fields: 'invalid_field' };

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'No valid fields selected'
            });
        });

        it('returns 404 when no data found', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'No data found for export'
            });
        });

        it('handles database errors', async () => {
            mockQuery.mockRejectedValue(new Error('Database error'));

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: 'Internal server error'
            });
        });
    });

    describe('exportPatientsToExcel', () => {
        it('exports patients to Excel successfully', async () => {
            mockQuery.mockResolvedValue({
                rows: [{ upi: 'UPI001', first_name: 'John' }]
            });

            await exportPatientsToExcel(mockReq, mockRes);

            expect(mockRes.setHeader).toHaveBeenCalledWith(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            expect(mockRes.send).toHaveBeenCalled();
        });
    });

    describe('getExportFields', () => {
        it('returns all available export fields', async () => {
            await getExportFields(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalled();
            const response = mockRes.json.mock.calls[0][0];
            expect(response.success).toBe(true);
            expect(response.data.fields).toBeDefined();
            expect(response.data.fields.length).toBeGreaterThan(0);
        });

        it('includes fields from all categories', async () => {
            await getExportFields(mockReq, mockRes);

            const response = mockRes.json.mock.calls[0][0];
            const categories = [...new Set(response.data.fields.map(f => f.category))];
            expect(categories).toContain('basic');
            expect(categories).toContain('contact');
            expect(categories).toContain('clinical');
            expect(categories).toContain('medical');
            expect(categories).toContain('system');
        });

        it('handles errors gracefully', async () => {
            // Create a mock response that throws on json()
            const errorRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
                    .mockImplementationOnce(() => { throw new Error('Simulated error'); })
                    .mockReturnThis()
            };

            // Since the function catches errors internally, we need to mock console.error
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            // Call the function with broken response
            await getExportFields(mockReq, errorRes);

            // The error path should have been hit
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
});
