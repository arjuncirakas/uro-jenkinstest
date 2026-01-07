import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock database pool
const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockClient))
};

jest.unstable_mockModule('../config/database.js', () => ({
  default: mockPool
}));

// Mock auditLogger
const mockLogDataExport = jest.fn();
jest.unstable_mockModule('../services/auditLogger.js', () => ({
  logDataExport: mockLogDataExport
}));

describe('exportController', () => {
  let exportController;
  let testHelpers;

  beforeEach(async () => {
    jest.clearAllMocks();
    exportController = await import('../controllers/exportController.js');
    testHelpers = exportController._testHelpers;
  });

  describe('Top-level code execution', () => {
    it('should execute top-level code and export _testHelpers object', async () => {
      // Verify that top-level code executed by checking _testHelpers exists
      expect(exportController._testHelpers).toBeDefined();
      expect(typeof exportController._testHelpers).toBe('object');
      
      // Verify all helper functions are exported
      expect(typeof testHelpers.buildExportQuery).toBe('function');
      expect(typeof testHelpers.convertToCSV).toBe('function');
      expect(typeof testHelpers.buildDateConditions).toBe('function');
      expect(typeof testHelpers.generateDateExistsCondition).toBe('function');
      expect(typeof testHelpers.addDateFilters).toBe('function');
      expect(typeof testHelpers.addCarePathwayFilter).toBe('function');
      expect(typeof testHelpers.addStatusFilter).toBe('function');
      expect(typeof testHelpers.buildQueryString).toBe('function');
    });

    it('should export main controller functions', () => {
      expect(typeof exportController.getExportFields).toBe('function');
      expect(typeof exportController.exportPatientsToCSV).toBe('function');
      expect(typeof exportController.exportPatientsToExcel).toBe('function');
    });
  });

  describe('getExportFields', () => {
    it('should return all available export fields', async () => {
      const mockReq = {};
      const mockRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };

      await exportController.getExportFields(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          fields: expect.arrayContaining([
            expect.objectContaining({ id: 'upi', label: 'UPI' }),
            expect.objectContaining({ id: 'first_name', label: 'First Name' })
          ])
        }
      });
    });

    it('should handle errors', async () => {
      const mockReq = {};
      const mockRes = {
        json: jest.fn(() => {
          throw new Error('Test error');
        }),
        status: jest.fn().mockReturnThis()
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await exportController.getExportFields(mockReq, mockRes);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error'
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('exportPatientsToCSV', () => {
    it('should export patients to CSV successfully', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name,last_name',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          carePathway: 'Active Monitoring',
          status: 'Active'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockRows = [
        { upi: 'UPI1', first_name: 'John', last_name: 'Doe' },
        { upi: 'UPI2', first_name: 'Jane', last_name: 'Smith' }
      ];

      mockClient.query.mockResolvedValue({ rows: mockRows });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.csv')
      );
      expect(mockRes.send).toHaveBeenCalled();
      expect(mockLogDataExport).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle invalid fields error', async () => {
      const mockReq = {
        query: {
          fields: 'invalid_field,another_invalid'
        }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No valid fields selected'
      });
    });

    it('should handle no data found', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name'
        }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'No data found for export'
      });
    });

    it('should handle database errors', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name'
        }
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const dbError = new Error('Database error');
      mockClient.query.mockRejectedValue(dbError);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('exportPatientsToExcel', () => {
    it('should export patients to Excel successfully', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [{ upi: 'UPI1', first_name: 'John' }]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToExcel(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('.xlsx')
      );
      expect(mockRes.send).toHaveBeenCalled();
      expect(mockLogDataExport).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle Excel export with database errors', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name'
        }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await exportController.exportPatientsToExcel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle Excel export with connection errors', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name'
        }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      // Reset mock to reject on next call
      mockPool.connect.mockReset();
      mockPool.connect.mockRejectedValueOnce(new Error('Connection failed'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await exportController.exportPatientsToExcel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      // Restore mock for other tests
      mockPool.connect.mockResolvedValue(mockClient);
    });

    it('should handle OPD Queue with date filters in Excel export', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name',
          carePathway: 'OPD Queue',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [{ upi: 'UPI1', first_name: 'John' }]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToExcel(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Helper Functions', () => {
    describe('buildExportQuery', () => {
      it('should build query with default fields', () => {
        const result = testHelpers.buildExportQuery({});

        expect(result.query).toBeDefined();
        expect(result.params).toBeDefined();
        expect(result.selectedFields).toBeDefined();
      });

      it('should build query with custom fields', () => {
        const result = testHelpers.buildExportQuery({
          fields: 'upi,first_name,last_name'
        });

        expect(result.selectedFields).toContain('upi');
        expect(result.selectedFields).toContain('first_name');
      });

      it('should add date filters', () => {
        const result = testHelpers.buildExportQuery({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

        expect(result.params).toContain('2024-01-01');
        expect(result.params).toContain('2024-12-31');
      });

      it('should add care pathway filter', () => {
        const result = testHelpers.buildExportQuery({
          carePathway: 'Active Monitoring'
        });

        expect(result.params).toContain('Active Monitoring');
      });

      it('should add status filter', () => {
        const result = testHelpers.buildExportQuery({
          status: 'Active'
        });

        expect(result.params).toContain('Active');
      });

      it('should handle OPD Queue with date filters', () => {
        const result = testHelpers.buildExportQuery({
          carePathway: 'OPD Queue',
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        });

        expect(result.query).toContain('EXISTS');
      });

      it('should return error for invalid fields', () => {
        const result = testHelpers.buildExportQuery({
          fields: 'invalid_field'
        });

        expect(result.error).toBe('No valid fields selected');
      });
    });

    describe('convertToCSV', () => {
      it('should convert rows to CSV format', () => {
        const rows = [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 }
        ];
        const headers = ['name', 'age'];

        const csv = testHelpers.convertToCSV(rows, headers);

        expect(csv).toContain('name,age');
        expect(csv).toContain('John,30');
        expect(csv).toContain('Jane,25');
      });

      it('should handle null and undefined values', () => {
        const rows = [
          { name: 'John', age: null, city: undefined }
        ];
        const headers = ['name', 'age', 'city'];

        const csv = testHelpers.convertToCSV(rows, headers);

        expect(csv).toContain('John,,');
      });

      it('should escape commas in values', () => {
        const rows = [
          { name: 'John, Jr.', age: 30 }
        ];
        const headers = ['name', 'age'];

        const csv = testHelpers.convertToCSV(rows, headers);

        expect(csv).toContain('"John, Jr."');
      });

      it('should escape quotes in values', () => {
        const rows = [
          { name: 'John "Johnny" Doe', age: 30 }
        ];
        const headers = ['name', 'age'];

        const csv = testHelpers.convertToCSV(rows, headers);

        expect(csv).toContain('"John ""Johnny"" Doe"');
      });

      it('should escape newlines in values', () => {
        const rows = [
          { name: 'John\nDoe', age: 30 }
        ];
        const headers = ['name', 'age'];

        const csv = testHelpers.convertToCSV(rows, headers);

        expect(csv).toContain('"John\nDoe"');
      });
    });

    describe('buildDateConditions', () => {
      it('should build conditions with start and end date', () => {
        const params = [];
        const conditions = testHelpers.buildDateConditions('2024-01-01', '2024-12-31', 1, params);

        expect(conditions.length).toBeGreaterThan(0);
        expect(params).toContain('2024-01-01');
        expect(params).toContain('2024-12-31');
      });

      it('should build condition with only start date', () => {
        const params = [];
        const conditions = testHelpers.buildDateConditions('2024-01-01', null, 1, params);

        expect(conditions.length).toBeGreaterThan(0);
        expect(params).toContain('2024-01-01');
      });

      it('should build condition with only end date', () => {
        const params = [];
        const conditions = testHelpers.buildDateConditions(null, '2024-12-31', 1, params);

        expect(conditions.length).toBeGreaterThan(0);
        expect(params).toContain('2024-12-31');
      });

      it('should return empty array when no dates provided', () => {
        const params = [];
        const conditions = testHelpers.buildDateConditions(null, null, 1, params);

        expect(conditions).toEqual([]);
        expect(params).toEqual([]);
      });
    });

    describe('generateDateExistsCondition', () => {
      it('should generate condition with both parameters', () => {
        const condition = testHelpers.generateDateExistsCondition(1, '>=', 2);

        expect(condition).toContain('>=');
        expect(condition).toContain('<=');
        expect(condition).toContain('$1');
        expect(condition).toContain('$2');
      });

      it('should generate condition with single parameter', () => {
        const condition = testHelpers.generateDateExistsCondition(1, '>=');

        expect(condition).toContain('>=');
        expect(condition).toContain('$1');
        expect(condition).not.toContain('$2');
      });
    });

    describe('addDateFilters', () => {
      it('should add start date filter', () => {
        const whereConditions = [];
        const params = [];
        testHelpers.addDateFilters(whereConditions, params, '2024-01-01', null);

        expect(whereConditions.length).toBe(1);
        expect(params).toContain('2024-01-01');
      });

      it('should add end date filter', () => {
        const whereConditions = [];
        const params = [];
        testHelpers.addDateFilters(whereConditions, params, null, '2024-12-31');

        expect(whereConditions.length).toBe(1);
        expect(params).toContain('2024-12-31');
      });

      it('should add both date filters', () => {
        const whereConditions = [];
        const params = [];
        testHelpers.addDateFilters(whereConditions, params, '2024-01-01', '2024-12-31');

        expect(whereConditions.length).toBe(2);
        expect(params).toContain('2024-01-01');
        expect(params).toContain('2024-12-31');
      });
    });

    describe('addCarePathwayFilter', () => {
      it('should add OPD Queue filter with special logic', () => {
        const whereConditions = [];
        const params = [];
        testHelpers.addCarePathwayFilter(whereConditions, params, 'OPD Queue');

        expect(whereConditions[0]).toContain('OR');
        expect(params).toContain('OPD Queue');
      });

      it('should add regular care pathway filter', () => {
        const whereConditions = [];
        const params = [];
        testHelpers.addCarePathwayFilter(whereConditions, params, 'Active Monitoring');

        expect(whereConditions[0]).not.toContain('OR');
        expect(params).toContain('Active Monitoring');
      });
    });

    describe('addStatusFilter', () => {
      it('should add status filter', () => {
        const whereConditions = [];
        const params = [];
        testHelpers.addStatusFilter(whereConditions, params, 'Active');

        expect(whereConditions.length).toBe(1);
        expect(params).toContain('Active');
      });
    });

    describe('buildQueryString', () => {
      it('should build query with where clause', () => {
        const selectFields = ['p.upi AS "upi"', 'p.first_name AS "first_name"'];
        const whereConditions = ['p.status = $1'];

        const query = testHelpers.buildQueryString(selectFields, whereConditions);

        expect(query).toContain('SELECT');
        expect(query).toContain('WHERE');
        expect(query).toContain('ORDER BY');
      });

      it('should build query without where clause', () => {
        const selectFields = ['p.upi AS "upi"'];
        const whereConditions = [];

        const query = testHelpers.buildQueryString(selectFields, whereConditions);

        expect(query).toContain('SELECT');
        expect(query).not.toContain('WHERE');
        expect(query).toContain('ORDER BY');
      });
    });
  });

  describe('convertToCSV - additional edge cases', () => {
    it('should escape value with comma and quote', () => {
      const rows = [
        { name: 'John, "Johnny" Doe', age: 30 }
      ];
      const headers = ['name', 'age'];

      const csv = testHelpers.convertToCSV(rows, headers);

      expect(csv).toContain('"John, ""Johnny"" Doe"');
    });

    it('should escape value with comma and newline', () => {
      const rows = [
        { name: 'John,\nDoe', age: 30 }
      ];
      const headers = ['name', 'age'];

      const csv = testHelpers.convertToCSV(rows, headers);

      expect(csv).toContain('"John,\nDoe"');
    });

    it('should escape value with quote and newline', () => {
      const rows = [
        { name: 'John "Johnny"\nDoe', age: 30 }
      ];
      const headers = ['name', 'age'];

      const csv = testHelpers.convertToCSV(rows, headers);

      expect(csv).toContain('"John ""Johnny""\nDoe"');
    });

    it('should escape value with comma, quote, and newline', () => {
      const rows = [
        { name: 'John, "Johnny"\nDoe', age: 30 }
      ];
      const headers = ['name', 'age'];

      const csv = testHelpers.convertToCSV(rows, headers);

      expect(csv).toContain('"John, ""Johnny""\nDoe"');
    });

    it('should handle empty string values', () => {
      const rows = [
        { name: '', age: 30 }
      ];
      const headers = ['name', 'age'];

      const csv = testHelpers.convertToCSV(rows, headers);

      expect(csv).toContain(',30');
    });

    it('should handle zero values', () => {
      const rows = [
        { name: 'John', age: 0 }
      ];
      const headers = ['name', 'age'];

      const csv = testHelpers.convertToCSV(rows, headers);

      expect(csv).toContain('John,0');
    });

    it('should handle boolean values', () => {
      const rows = [
        { name: 'John', active: true }
      ];
      const headers = ['name', 'active'];

      const csv = testHelpers.convertToCSV(rows, headers);

      expect(csv).toContain('John,true');
    });
  });

  describe('buildExportQuery - additional edge cases', () => {
    it('should handle OPD Queue with only startDate', () => {
      const result = testHelpers.buildExportQuery({
        carePathway: 'OPD Queue',
        startDate: '2024-01-01'
      });

      expect(result.query).toContain('EXISTS');
      expect(result.params).toContain('2024-01-01');
    });

    it('should handle OPD Queue with only endDate', () => {
      const result = testHelpers.buildExportQuery({
        carePathway: 'OPD Queue',
        endDate: '2024-12-31'
      });

      expect(result.query).toContain('EXISTS');
      expect(result.params).toContain('2024-12-31');
    });

    it('should handle OPD Queue without dates (no appointment join)', () => {
      const result = testHelpers.buildExportQuery({
        carePathway: 'OPD Queue'
      });

      expect(result.query).not.toContain('EXISTS');
      expect(result.params).toContain('OPD Queue');
    });

    it('should handle fields with whitespace', () => {
      const result = testHelpers.buildExportQuery({
        fields: ' upi , first_name , last_name '
      });

      expect(result.selectedFields).toContain('upi');
      expect(result.selectedFields).toContain('first_name');
      expect(result.selectedFields).toContain('last_name');
    });

    it('should filter out invalid fields from custom fields list', () => {
      const result = testHelpers.buildExportQuery({
        fields: 'upi,invalid_field,first_name,another_invalid'
      });

      expect(result.selectedFields).toContain('upi');
      expect(result.selectedFields).toContain('first_name');
      expect(result.selectedFields).not.toContain('invalid_field');
      expect(result.selectedFields).not.toContain('another_invalid');
    });

    it('should handle empty fields string', () => {
      const result = testHelpers.buildExportQuery({
        fields: ''
      });

      // Should use default fields
      expect(result.selectedFields).toEqual(testHelpers.DEFAULT_FIELDS);
    });

    it('should handle null fields', () => {
      const result = testHelpers.buildExportQuery({
        fields: null
      });

      // Should use default fields
      expect(result.selectedFields).toEqual(testHelpers.DEFAULT_FIELDS);
    });

    it('should handle undefined fields', () => {
      const result = testHelpers.buildExportQuery({
        fields: undefined
      });

      // Should use default fields
      expect(result.selectedFields).toEqual(testHelpers.DEFAULT_FIELDS);
    });

    it('should handle all filters together', () => {
      const result = testHelpers.buildExportQuery({
        fields: 'upi,first_name',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        carePathway: 'Active Monitoring',
        status: 'Active'
      });

      expect(result.params).toContain('2024-01-01');
      expect(result.params).toContain('2024-12-31');
      expect(result.params).toContain('Active Monitoring');
      expect(result.params).toContain('Active');
    });

    it('should handle OPD Queue with all filters including dates', () => {
      const result = testHelpers.buildExportQuery({
        fields: 'upi,first_name',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        carePathway: 'OPD Queue',
        status: 'Active'
      });

      expect(result.query).toContain('EXISTS');
      expect(result.params).toContain('2024-01-01');
      expect(result.params).toContain('2024-12-31');
      expect(result.params).toContain('OPD Queue');
      expect(result.params).toContain('Active');
    });
  });

  describe('exportPatientsToCSV - additional edge cases', () => {
    it('should handle OPD Queue with only startDate', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name',
          carePathway: 'OPD Queue',
          startDate: '2024-01-01'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [{ upi: 'UPI1', first_name: 'John' }]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle OPD Queue with only endDate', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name',
          carePathway: 'OPD Queue',
          endDate: '2024-12-31'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [{ upi: 'UPI1', first_name: 'John' }]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle OPD Queue without dates', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name',
          carePathway: 'OPD Queue'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [{ upi: 'UPI1', first_name: 'John' }]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle CSV export with mixed null/undefined values', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name,last_name'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [
          { upi: 'UPI1', first_name: 'John', last_name: null },
          { upi: 'UPI2', first_name: undefined, last_name: 'Doe' }
        ]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
      const csvContent = mockRes.send.mock.calls[0][0];
      expect(csvContent).toContain('UPI1,John,');
      expect(csvContent).toContain('UPI2,,Doe');
    });

    it('should handle CSV export with special characters in data', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [
          { upi: 'UPI1', first_name: 'John, "Johnny" Doe' },
          { upi: 'UPI2', first_name: 'Jane\nSmith' }
        ]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToCSV(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
      const csvContent = mockRes.send.mock.calls[0][0];
      expect(csvContent).toContain('"John, ""Johnny"" Doe"');
      expect(csvContent).toContain('"Jane\nSmith"');
    });
  });

  describe('exportPatientsToExcel - additional edge cases', () => {
    it('should handle Excel export with OPD Queue and only startDate', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name',
          carePathway: 'OPD Queue',
          startDate: '2024-01-01'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [{ upi: 'UPI1', first_name: 'John' }]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToExcel(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should handle Excel export with OPD Queue and only endDate', async () => {
      const mockReq = {
        query: {
          fields: 'upi,first_name',
          carePathway: 'OPD Queue',
          endDate: '2024-12-31'
        },
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [{ upi: 'UPI1', first_name: 'John' }]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToExcel(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should handle Excel export with default fields', async () => {
      const mockReq = {
        query: {},
        user: { id: 1 }
      };
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      mockClient.query.mockResolvedValue({
        rows: [{ upi: 'UPI1', first_name: 'John' }]
      });
      mockLogDataExport.mockResolvedValue(undefined);

      await exportController.exportPatientsToExcel(mockReq, mockRes);

      expect(mockRes.send).toHaveBeenCalled();
    });
  });

  describe('generateDateExistsCondition - additional edge cases', () => {
    it('should generate condition with <= operator', () => {
      const condition = testHelpers.generateDateExistsCondition(1, '<=');

      expect(condition).toContain('<=');
      expect(condition).toContain('$1');
    });

    it('should generate condition with > operator', () => {
      const condition = testHelpers.generateDateExistsCondition(1, '>');

      expect(condition).toContain('>');
      expect(condition).toContain('$1');
    });

    it('should generate condition with < operator', () => {
      const condition = testHelpers.generateDateExistsCondition(1, '<');

      expect(condition).toContain('<');
      expect(condition).toContain('$1');
    });

    it('should generate condition with = operator and both parameters', () => {
      const condition = testHelpers.generateDateExistsCondition(1, '=', 2);

      expect(condition).toContain('=');
      expect(condition).toContain('$1');
      expect(condition).toContain('$2');
    });
  });

  describe('addDateFilters - additional edge cases', () => {
    it('should not add filters when both dates are null', () => {
      const whereConditions = [];
      const params = [];
      testHelpers.addDateFilters(whereConditions, params, null, null);

      expect(whereConditions.length).toBe(0);
      expect(params.length).toBe(0);
    });

    it('should not add filters when both dates are undefined', () => {
      const whereConditions = [];
      const params = [];
      testHelpers.addDateFilters(whereConditions, params, undefined, undefined);

      expect(whereConditions.length).toBe(0);
      expect(params.length).toBe(0);
    });
  });

  describe('addCarePathwayFilter - additional edge cases', () => {
    it('should handle empty string care pathway', () => {
      const whereConditions = [];
      const params = [];
      testHelpers.addCarePathwayFilter(whereConditions, params, '');

      expect(whereConditions.length).toBe(1);
      expect(params).toContain('');
    });

    it('should handle null care pathway', () => {
      const whereConditions = [];
      const params = [];
      testHelpers.addCarePathwayFilter(whereConditions, params, null);

      expect(whereConditions.length).toBe(1);
      expect(params).toContain(null);
    });
  });

  describe('addStatusFilter - additional edge cases', () => {
    it('should handle empty string status', () => {
      const whereConditions = [];
      const params = [];
      testHelpers.addStatusFilter(whereConditions, params, '');

      expect(whereConditions.length).toBe(1);
      expect(params).toContain('');
    });

    it('should handle null status', () => {
      const whereConditions = [];
      const params = [];
      testHelpers.addStatusFilter(whereConditions, params, null);

      expect(whereConditions.length).toBe(1);
      expect(params).toContain(null);
    });
  });
});
