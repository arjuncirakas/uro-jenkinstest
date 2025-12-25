import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock dependencies
await jest.unstable_mockModule('../config/database.js', () => ({
    default: {
        connect: jest.fn()
    }
}));

await jest.unstable_mockModule('../services/auditLogger.js', () => ({
    logDataExport: jest.fn()
}));

// Dynamic import
const exportController = await import('../controllers/exportController.js');
const { logDataExport } = await import('../services/auditLogger.js');
const { default: poolMock } = await import('../config/database.js');

describe('Export Controller', () => {
    // Destructure exported functions
    const {
        exportPatientsToCSV,
        exportPatientsToExcel,
        getExportFields,
        _testHelpers
    } = exportController;

    // Destructure helpers from _testHelpers
    const {
        buildExportQuery,
        buildDateConditions,
        generateDateExistsCondition,
        addDateFilters,
        addCarePathwayFilter,
        addStatusFilter,
        convertToCSV,
        FIELD_MAP
    } = _testHelpers;

    describe('Helper Functions', () => {
        describe('generateDateExistsCondition', () => {
            it('should generate correct SQL for single operator', () => {
                const sql = generateDateExistsCondition(1, '>=');
                expect(sql).toContain('appointment_date >= $1');
                expect(sql).toContain('scheduled_date >= $1');
                expect(sql).toContain('created_at >= $1');
            });

            it('should generate correct SQL for range', () => {
                const sql = generateDateExistsCondition(1, '>=', 2);
                expect(sql).toContain('appointment_date >= $1 AND a.appointment_date <= $2');
            });
        });

        describe('buildDateConditions', () => {
            it('should return empty if no dates', () => {
                const params = [];
                const res = buildDateConditions(null, null, 1, params);
                expect(res).toEqual([]);
                expect(params).toHaveLength(0);
            });

            it('should handle start date only', () => {
                const params = [];
                const res = buildDateConditions('2023-01-01', null, 1, params);
                expect(res).toHaveLength(1);
                expect(params).toEqual(['2023-01-01']);
            });

            it('should handle end date only', () => {
                const params = [];
                const res = buildDateConditions(null, '2023-01-01', 1, params);
                expect(res).toHaveLength(1);
                expect(params).toEqual(['2023-01-01']);
            });

            it('should handle both dates', () => {
                const params = [];
                const res = buildDateConditions('2023-01-01', '2023-12-31', 1, params);
                expect(res).toHaveLength(1);
                expect(params).toEqual(['2023-01-01', '2023-12-31']);
            });
        });

        describe('addDateFilters', () => {
            it('should add simple date filters', () => {
                const conditions = [];
                const params = [];
                addDateFilters(conditions, params, '2023-01-01', '2023-02-01');
                expect(conditions).toHaveLength(2);
                expect(conditions[0]).toBe('p.created_at >= $1');
                expect(conditions[1]).toBe('p.created_at <= $2');
                expect(params).toEqual(['2023-01-01', '2023-02-01']);
            });
        });

        describe('addCarePathwayFilter', () => {
            it('should add specific pathway', () => {
                const conditions = [];
                const params = [];
                addCarePathwayFilter(conditions, params, 'Cancer');
                expect(conditions[0]).toBe('p.care_pathway = $1');
                expect(params).toEqual(['Cancer']);
            });

            it('should add OPD Queue logic', () => {
                const conditions = [];
                const params = [];
                addCarePathwayFilter(conditions, params, 'OPD Queue');
                expect(conditions[0]).toContain('(p.care_pathway = $1 OR p.care_pathway IS NULL');
            });
        });

        describe('convertToCSV', () => {
            it('should handle nulls and special chars', () => {
                const headers = ['name', 'note'];
                const rows = [{ name: 'Test', note: null }, { name: 'Test,2', note: 'Line\nBreak' }];
                const csv = convertToCSV(rows, headers);
                expect(csv).toContain('name,note');
                expect(csv).toContain('Test,');
                expect(csv).toContain('"Test,2","Line\nBreak"');
            });
        });
    });

    describe('buildExportQuery', () => {
        it('should use default fields if none provided', () => {
            const result = buildExportQuery({});
            expect(result.selectFields.length).toBeGreaterThan(0);
        });

        it('should error on invalid fields', () => {
            const result = buildExportQuery({ fields: 'invalid_field' });
            expect(result.error).toBeDefined();
        });

        it('should build complex OPD Queue query', () => {
            const result = buildExportQuery({
                carePathway: 'OPD Queue',
                startDate: '2023-01-01'
            });
            expect(result.query).toContain('EXISTS'); // Implies separate date logic used
        });

        it('should build standard query with status', () => {
            const result = buildExportQuery({
                status: 'Active'
            });
            expect(result.query).toContain('p.status = $1');
        });
    });

    describe('exportPatients (Controller)', () => {
        let mockReq, mockRes, mockClient;

        beforeEach(() => {
            mockReq = { query: {} };
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
                setHeader: jest.fn(),
                send: jest.fn()
            };
            mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };
            poolMock.connect.mockResolvedValue(mockClient);
        });

        it('should handle CSV export success', async () => {
            mockClient.query.mockResolvedValue({
                rows: [{ 'p.first_name': 'John' }]
            });

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
            expect(mockRes.send).toHaveBeenCalled();
            expect(logDataExport).toHaveBeenCalled();
        });

        it('should handle Excel export success', async () => {
            mockClient.query.mockResolvedValue({
                rows: [{ 'p.first_name': 'John' }]
            });

            await exportPatientsToExcel(mockReq, mockRes);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('spreadsheetml'));
        });

        it('should handle validation error', async () => {
            mockReq.query.fields = 'invalid';
            await exportPatientsToCSV(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should handle no data found', async () => {
            mockClient.query.mockResolvedValue({ rows: [] });
            await exportPatientsToCSV(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should handle database errors', async () => {
            mockClient.query.mockRejectedValue(new Error('DB Error'));
            await exportPatientsToCSV(mockReq, mockRes);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('getExportFields', () => {
        it('should return fields list', async () => {
            const req = {}, res = { json: jest.fn(), status: jest.fn() };
            await getExportFields(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.any(Object)
            }));
        });

        it('should handle error', async () => {
            const req = {};
            const res = {
                json: jest.fn().mockImplementation(() => { throw new Error('Fail') }),
                status: jest.fn().mockReturnThis()
            };
            await expect(getExportFields(req, res)).rejects.toThrow('Fail');
        });

        it('should catch internal errors', async () => {
            const req = {};
            const res = {
                json: jest.fn(),
                status: jest.fn().mockReturnThis()
            };

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            res.json.mockImplementationOnce(() => { throw new Error('Response Error'); });

            await getExportFields(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            consoleSpy.mockRestore();
        });
    });

    describe('addStatusFilter', () => {
        it('should add status filter to conditions', () => {
            const conditions = [];
            const params = [];
            addStatusFilter(conditions, params, 'Active');
            expect(conditions[0]).toBe('p.status = $1');
            expect(params).toEqual(['Active']);
        });

        it('should handle multiple filters', () => {
            const conditions = [];
            const params = ['existing'];
            addStatusFilter(conditions, params, 'Inactive');
            expect(conditions[0]).toBe('p.status = $2');
            expect(params).toEqual(['existing', 'Inactive']);
        });
    });

    describe('buildQueryString', () => {
        it('should build query without where clause', () => {
            const selectFields = ['p.first_name AS "first_name"'];
            const whereConditions = [];
            const query = buildQueryString(selectFields, whereConditions);
            expect(query).toContain('SELECT');
            expect(query).toContain('FROM patients p');
            expect(query).not.toContain('WHERE');
        });

        it('should build query with where clause', () => {
            const selectFields = ['p.first_name AS "first_name"'];
            const whereConditions = ['p.status = $1'];
            const query = buildQueryString(selectFields, whereConditions);
            expect(query).toContain('WHERE');
            expect(query).toContain('p.status = $1');
        });

        it('should build query with multiple where conditions', () => {
            const selectFields = ['p.first_name AS "first_name"'];
            const whereConditions = ['p.status = $1', 'p.care_pathway = $2'];
            const query = buildQueryString(selectFields, whereConditions);
            expect(query).toContain('p.status = $1 AND p.care_pathway = $2');
        });

        it('should include ORDER BY clause', () => {
            const selectFields = ['p.first_name AS "first_name"'];
            const whereConditions = [];
            const query = buildQueryString(selectFields, whereConditions);
            expect(query).toContain('ORDER BY p.created_at DESC');
        });
    });

    describe('buildExportQuery edge cases', () => {
        it('should handle comma-separated fields', () => {
            const result = buildExportQuery({ fields: 'first_name,last_name,upi' });
            expect(result.selectFields.length).toBe(3);
            expect(result.error).toBeUndefined();
        });

        it('should filter out invalid fields', () => {
            const result = buildExportQuery({ fields: 'first_name,invalid_field,last_name' });
            expect(result.selectFields.length).toBe(2);
            expect(result.error).toBeUndefined();
        });

        it('should return error when all fields are invalid', () => {
            const result = buildExportQuery({ fields: 'invalid1,invalid2' });
            expect(result.error).toBe('No valid fields selected');
        });

        it('should handle OPD Queue with start date only', () => {
            const result = buildExportQuery({
                carePathway: 'OPD Queue',
                startDate: '2023-01-01'
            });
            expect(result.query).toContain('EXISTS');
            expect(result.params).toContain('2023-01-01');
        });

        it('should handle OPD Queue with end date only', () => {
            const result = buildExportQuery({
                carePathway: 'OPD Queue',
                endDate: '2023-12-31'
            });
            expect(result.query).toContain('EXISTS');
            expect(result.params).toContain('2023-12-31');
        });

        it('should handle OPD Queue with both dates', () => {
            const result = buildExportQuery({
                carePathway: 'OPD Queue',
                startDate: '2023-01-01',
                endDate: '2023-12-31'
            });
            expect(result.query).toContain('EXISTS');
            expect(result.params).toContain('2023-01-01');
            expect(result.params).toContain('2023-12-31');
        });

        it('should handle care pathway without OPD Queue', () => {
            const result = buildExportQuery({
                carePathway: 'Cancer'
            });
            expect(result.query).toContain('p.care_pathway = $1');
            expect(result.params).toEqual(['Cancer']);
        });

        it('should handle multiple filters together', () => {
            const result = buildExportQuery({
                carePathway: 'Cancer',
                status: 'Active',
                startDate: '2023-01-01',
                endDate: '2023-12-31'
            });
            expect(result.query).toContain('p.care_pathway');
            expect(result.query).toContain('p.status');
            expect(result.query).toContain('p.created_at');
        });
    });

    describe('convertToCSV edge cases', () => {
        it('should handle empty rows', () => {
            const headers = ['name', 'age'];
            const rows = [];
            const csv = convertToCSV(rows, headers);
            expect(csv).toBe('name,age');
        });

        it('should handle rows with quotes', () => {
            const headers = ['name'];
            const rows = [{ name: 'Test "Quote"' }];
            const csv = convertToCSV(rows, headers);
            expect(csv).toContain('""');
        });

        it('should handle rows with newlines', () => {
            const headers = ['note'];
            const rows = [{ note: 'Line1\nLine2' }];
            const csv = convertToCSV(rows, headers);
            expect(csv).toContain('"Line1');
        });

        it('should handle rows with commas', () => {
            const headers = ['address'];
            const rows = [{ address: '123 Main St, Apt 4' }];
            const csv = convertToCSV(rows, headers);
            expect(csv).toContain('"123 Main St, Apt 4"');
        });

        it('should handle undefined values', () => {
            const headers = ['name', 'age'];
            const rows = [{ name: 'Test', age: undefined }];
            const csv = convertToCSV(rows, headers);
            expect(csv).toContain('Test,');
        });

        it('should handle numeric values', () => {
            const headers = ['age'];
            const rows = [{ age: 30 }];
            const csv = convertToCSV(rows, headers);
            expect(csv).toContain('30');
        });
    });

    describe('exportPatients edge cases', () => {
        it('should handle Excel export format', async () => {
            mockClient.query.mockResolvedValue({
                rows: [{ 'p.first_name': 'John' }]
            });

            await exportPatientsToExcel(mockReq, mockRes);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', expect.stringContaining('spreadsheetml'));
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.xlsx'));
        });

        it('should handle CSV export with filename', async () => {
            mockClient.query.mockResolvedValue({
                rows: [{ 'p.first_name': 'John' }]
            });

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.csv'));
        });

        it('should handle database connection errors', async () => {
            poolMock.connect.mockRejectedValueOnce(new Error('Connection failed'));

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });

        it('should handle query execution errors', async () => {
            mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should always release client in finally block', async () => {
            mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

            await exportPatientsToCSV(mockReq, mockRes);

            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('generateDateExistsCondition edge cases', () => {
        it('should handle different operators', () => {
            const sql = generateDateExistsCondition(1, '<=');
            expect(sql).toContain('appointment_date <= $1');
        });

        it('should handle range with different operators', () => {
            const sql = generateDateExistsCondition(1, '>=', 2);
            expect(sql).toContain('appointment_date >= $1 AND a.appointment_date <= $2');
        });
    });

    describe('addDateFilters edge cases', () => {
        it('should handle only start date', () => {
            const conditions = [];
            const params = [];
            addDateFilters(conditions, params, '2023-01-01', null);
            expect(conditions.length).toBe(1);
            expect(conditions[0]).toContain('>=');
        });

        it('should handle only end date', () => {
            const conditions = [];
            const params = [];
            addDateFilters(conditions, params, null, '2023-12-31');
            expect(conditions.length).toBe(1);
            expect(conditions[0]).toContain('<=');
        });

        it('should handle both dates', () => {
            const conditions = [];
            const params = [];
            addDateFilters(conditions, params, '2023-01-01', '2023-12-31');
            expect(conditions.length).toBe(2);
        });

        it('should handle existing params', () => {
            const conditions = [];
            const params = ['existing'];
            addDateFilters(conditions, params, '2023-01-01', '2023-12-31');
            expect(params.length).toBe(3);
        });
    });

    describe('addCarePathwayFilter edge cases', () => {
        it('should handle empty string care pathway', () => {
            const conditions = [];
            const params = [];
            addCarePathwayFilter(conditions, params, '');
            expect(conditions[0]).toContain('p.care_pathway = $1');
        });

        it('should handle non-OPD Queue pathway', () => {
            const conditions = [];
            const params = [];
            addCarePathwayFilter(conditions, params, 'Cancer');
            expect(conditions[0]).toBe('p.care_pathway = $1');
            expect(conditions[0]).not.toContain('OR');
        });
    });
});
