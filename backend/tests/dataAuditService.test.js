/**
 * Comprehensive tests for dataAuditService.js
 * Tests all functions to achieve 100% coverage
 */
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock database
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

// Mock dataClassificationService
const mockGetTableClassification = jest.fn();
jest.unstable_mockModule('../services/dataClassificationService.js', () => ({
  getTableClassification: mockGetTableClassification
}));

describe('dataAuditService', () => {
  let dataAuditService;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset mock implementation
    mockGetTableClassification.mockImplementation(async (tableName) => {
      if (tableName === 'patients') {
        return { classification_level: 4, classification_label: 'Highly Sensitive' };
      } else if (tableName === 'users') {
        return { classification_level: 2, classification_label: 'Internal' };
      } else if (tableName === 'audit_logs') {
        return { classification_level: 1, classification_label: 'Non-Sensitive' };
      }
      return { classification_level: 3, classification_label: 'Sensitive' };
    });
    dataAuditService = await import('../services/dataAuditService.js');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDataInventory', () => {
    beforeEach(() => {
      mockGetTableClassification.mockImplementation(async (tableName) => {
        return {
          table_name: tableName,
          classification_level: tableName === 'patients' ? 4 : 2,
          classification_label: tableName === 'patients' ? 'Highly Sensitive' : 'Internal'
        };
      });
    });

    it('should return inventory data successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { tablename: 'users', size: '1 MB', size_bytes: 1048576 },
            { tablename: 'patients', size: '2 MB', size_bytes: 2097152 }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockResolvedValueOnce({ rows: [{ count: '200' }] });

      const result = await dataAuditService.getDataInventory();

      expect(mockPool.connect).toHaveBeenCalled();
      expect(result).toHaveProperty('inventory');
      expect(result).toHaveProperty('totals');
      expect(result).toHaveProperty('byCategory');
      expect(result.inventory[0]).toHaveProperty('classificationLevel');
      expect(result.inventory[0]).toHaveProperty('classificationLabel');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty database', async () => {
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await dataAuditService.getDataInventory();

      expect(result.inventory).toEqual([]);
      expect(result.totals.totalTables).toBe(0);
    });

    it('should handle table query errors gracefully', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { tablename: 'users', size: '1 MB', size_bytes: 1048576 },
            { tablename: 'invalid_table', size: '1 MB', size_bytes: 1048576 }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] })
        .mockRejectedValueOnce(new Error('Table does not exist'));

      const result = await dataAuditService.getDataInventory();

      expect(result.inventory).toHaveLength(2);
      expect(result.inventory[1]).toHaveProperty('error');
      expect(result.inventory[1]).toHaveProperty('classificationLevel');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle classification errors gracefully', async () => {
      mockGetTableClassification.mockRejectedValueOnce(new Error('Classification error'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { tablename: 'users', size: '1 MB', size_bytes: 1048576 }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      const result = await dataAuditService.getDataInventory();

      expect(result.inventory[0]).toHaveProperty('classificationLevel');
      expect(result.inventory[0].classificationLevel).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should categorize tables correctly', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { tablename: 'patients', size: '1 MB', size_bytes: 1048576 },
            { tablename: 'users', size: '1 MB', size_bytes: 1048576 },
            { tablename: 'audit_logs', size: '1 MB', size_bytes: 1048576 }
          ]
        })
        .mockResolvedValue({ rows: [{ count: '100' }] });

      // Mock getTableClassification
      const mockGetTableClassification = vi.fn();
      mockGetTableClassification
        .mockResolvedValueOnce({ classification_level: 4, classification_label: 'Highly Sensitive' })
        .mockResolvedValueOnce({ classification_level: 2, classification_label: 'Internal' })
        .mockResolvedValueOnce({ classification_level: 1, classification_label: 'Non-Sensitive' });

      // Mock the service module
      vi.doMock('../services/dataClassificationService.js', () => ({
        getTableClassification: mockGetTableClassification
      }));

      const result = await dataAuditService.getDataInventory();

      expect(result.byCategory).toHaveProperty('Medical/PHI');
      expect(result.byCategory).toHaveProperty('Demographic');
      expect(result.byCategory).toHaveProperty('System Usage');
    });

    it('should include classification levels in inventory', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { tablename: 'patients', size: '1 MB', size_bytes: 1048576 }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      const result = await dataAuditService.getDataInventory();

      expect(result.inventory[0]).toHaveProperty('classificationLevel');
      expect(result.inventory[0]).toHaveProperty('classificationLabel');
      expect(result.inventory[0].classificationLevel).toBe(4);
      expect(result.inventory[0].classificationLabel).toBe('Highly Sensitive');
    });

    it('should handle classification errors gracefully', async () => {
      mockGetTableClassification.mockRejectedValueOnce(new Error('Classification error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { tablename: 'patients', size: '1 MB', size_bytes: 1048576 }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      const result = await dataAuditService.getDataInventory();

      // Should still return inventory even if classification fails
      expect(result.inventory).toHaveLength(1);
      expect(result.inventory[0].tableName).toBe('patients');
      expect(result.inventory[0].classificationLevel).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle null classification gracefully', async () => {
      mockGetTableClassification.mockResolvedValueOnce(null);

      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            { tablename: 'patients', size: '1 MB', size_bytes: 1048576 }
          ]
        })
        .mockResolvedValueOnce({ rows: [{ count: '100' }] });

      const result = await dataAuditService.getDataInventory();

      // Classification should be null if not available
      expect(result.inventory[0].classificationLevel).toBeNull();
      expect(result.inventory[0].classificationLabel).toBeNull();
    });
  });

  describe('getAccessLogs', () => {
    it('should return access logs with no filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '50' }] })
        .mockResolvedValueOnce({
          rows: [
            { id: 1, action: 'phi.view', timestamp: new Date() }
          ]
        });

      const result = await dataAuditService.getAccessLogs();

      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('pagination');
      expect(result.logs).toHaveLength(1);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should apply all filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '10' }] })
        .mockResolvedValueOnce({
          rows: [{ id: 1, action: 'phi.view' }]
        });

      const filters = {
        userId: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        actionType: 'phi',
        resourceType: 'patient',
        status: 'success',
        page: 1,
        limit: 50
      };

      const result = await dataAuditService.getAccessLogs(filters);

      expect(result.logs).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should handle pagination', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await dataAuditService.getAccessLogs({ page: 2, limit: 25 });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(25);
      expect(result.pagination.totalPages).toBe(4);
    });

    it('should handle empty results', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await dataAuditService.getAccessLogs();

      expect(result.logs).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should handle partial filters', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ total: '5' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await dataAuditService.getAccessLogs({ userId: 1 });

      expect(result.pagination.total).toBe(5);
    });
  });

  describe('getProcessingActivities', () => {
    it('should return processing activities successfully', async () => {
      mockClient.query.mockResolvedValue({
        rows: [
          {
            action: 'phi.view',
            resource_type: 'patient',
            count: '100',
            first_occurrence: new Date('2024-01-01'),
            last_occurrence: new Date('2024-01-31'),
            unique_users: '5'
          }
        ]
      });

      const result = await dataAuditService.getProcessingActivities();

      expect(result).toHaveProperty('activities');
      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].count).toBe(100);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should apply date filters', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await dataAuditService.getProcessingActivities({
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.activities).toEqual([]);
    });

    it('should apply action type filter', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await dataAuditService.getProcessingActivities({
        actionType: 'phi'
      });

      expect(result.activities).toEqual([]);
    });

    it('should handle empty results', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await dataAuditService.getProcessingActivities();

      expect(result.activities).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(dataAuditService.getProcessingActivities()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getRetentionInfo', () => {
    it('should return retention info successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'created_at' }] })
        .mockResolvedValueOnce({
          rows: [{
            oldest_date: new Date('2022-01-01'),
            total_count: '1000'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            newest_date: new Date('2024-01-01')
          }]
        })
        .mockResolvedValueOnce({ rows: [{ column_name: 'created_at' }] })
        .mockResolvedValueOnce({
          rows: [{
            oldest_date: new Date('2023-01-01'),
            total_count: '500'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            newest_date: new Date('2024-01-01')
          }]
        })
        .mockResolvedValueOnce({ rows: [{ column_name: 'timestamp' }] })
        .mockResolvedValueOnce({
          rows: [{
            oldest_date: new Date('2021-01-01'),
            total_count: '2000'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            newest_date: new Date('2024-01-01')
          }]
        })
        .mockResolvedValueOnce({ rows: [{ column_name: 'created_at' }] })
        .mockResolvedValueOnce({
          rows: [{
            oldest_date: new Date('2023-06-01'),
            total_count: '300'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            newest_date: new Date('2024-01-01')
          }]
        })
        .mockResolvedValueOnce({ rows: [{ column_name: 'created_at' }] })
        .mockResolvedValueOnce({
          rows: [{
            oldest_date: new Date('2023-01-01'),
            total_count: '150'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            newest_date: new Date('2024-01-01')
          }]
        });

      const result = await dataAuditService.getRetentionInfo();

      expect(result).toHaveProperty('retentionData');
      expect(result).toHaveProperty('summary');
      expect(result.retentionData).toHaveLength(5);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle tables without date columns', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await dataAuditService.getRetentionInfo();

      expect(result.retentionData[0]).toHaveProperty('error');
    });

    it('should calculate age correctly', async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'created_at' }] })
        .mockResolvedValueOnce({
          rows: [{
            oldest_date: twoYearsAgo,
            total_count: '100'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            newest_date: new Date()
          }]
        })
        .mockResolvedValue({ rows: [] });

      const result = await dataAuditService.getRetentionInfo();

      expect(result.retentionData[0].ageInYears).toBeGreaterThan(1.9);
      expect(result.retentionData[0].ageInYears).toBeLessThan(2.1);
    });

    it('should identify tables approaching deletion', async () => {
      const elevenYearsAgo = new Date();
      elevenYearsAgo.setFullYear(elevenYearsAgo.getFullYear() - 11);

      mockClient.query
        .mockResolvedValueOnce({ rows: [{ column_name: 'created_at' }] })
        .mockResolvedValueOnce({
          rows: [{
            oldest_date: elevenYearsAgo,
            total_count: '100'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            newest_date: new Date()
          }]
        })
        .mockResolvedValue({ rows: [] });

      const result = await dataAuditService.getRetentionInfo();

      expect(result.retentionData[0].approachingDeletion).toBe(true);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(dataAuditService.getRetentionInfo()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getThirdPartySharing', () => {
    it('should return sharing events successfully', async () => {
      mockClient.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            timestamp: new Date(),
            user_id: 1,
            user_email: 'test@example.com',
            action: 'export',
            resource_type: 'patient',
            resource_id: 1,
            ip_address: '127.0.0.1',
            metadata: JSON.stringify({ format: 'csv' })
          }
        ]
      });

      const result = await dataAuditService.getThirdPartySharing();

      expect(result).toHaveProperty('sharingEvents');
      expect(result.sharingEvents).toHaveLength(1);
      expect(result.sharingEvents[0].action).toBe('export');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should apply filters', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await dataAuditService.getThirdPartySharing({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        userId: 1
      });

      expect(result.sharingEvents).toEqual([]);
    });

    it('should handle empty results', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await dataAuditService.getThirdPartySharing();

      expect(result.sharingEvents).toEqual([]);
    });

    it('should parse JSON metadata', async () => {
      mockClient.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            timestamp: new Date(),
            user_id: 1,
            user_email: 'test@example.com',
            action: 'export',
            resource_type: 'patient',
            resource_id: 1,
            ip_address: '127.0.0.1',
            metadata: JSON.stringify({ format: 'csv', count: 10 })
          }
        ]
      });

      const result = await dataAuditService.getThirdPartySharing();

      expect(result.sharingEvents[0].metadata).toEqual({ format: 'csv', count: 10 });
    });

    it('should handle non-JSON metadata', async () => {
      mockClient.query.mockResolvedValue({
        rows: [
          {
            id: 1,
            timestamp: new Date(),
            user_id: 1,
            user_email: 'test@example.com',
            action: 'export',
            resource_type: 'patient',
            resource_id: 1,
            ip_address: '127.0.0.1',
            metadata: { format: 'csv' }
          }
        ]
      });

      const result = await dataAuditService.getThirdPartySharing();

      expect(result.sharingEvents[0].metadata).toEqual({ format: 'csv' });
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(dataAuditService.getThirdPartySharing()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getComplianceMetrics', () => {
    it('should return compliance metrics successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // totalVerifiedUsers
        .mockResolvedValueOnce({ rows: [{ count: '200' }] }) // successfulLogins
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // failedLogins
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // phiAccessCount
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // accountLockouts
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // suspiciousActivities
        .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // uniqueUsersAccessingPHI
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }); // exportCount

      const result = await dataAuditService.getComplianceMetrics();

      expect(result).toHaveProperty('successfulLoginAttempts30Days');
      expect(result).toHaveProperty('failedLoginAttempts30Days');
      expect(result).toHaveProperty('phiAccessEvents30Days');
      expect(result).toHaveProperty('accountLockouts30Days');
      expect(result).toHaveProperty('suspiciousActivities30Days');
      expect(result).toHaveProperty('uniqueUsersAccessingPHI30Days');
      expect(result).toHaveProperty('dataExports30Days');
      expect(result).toHaveProperty('totalVerifiedUsers');
      expect(result).toHaveProperty('lastUpdated');
      expect(result.successfulLoginAttempts30Days).toBe(200);
      expect(result.failedLoginAttempts30Days).toBe(10);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return all required metrics', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // totalVerifiedUsers
        .mockResolvedValueOnce({ rows: [{ count: '90' }] }) // successfulLogins
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // failedLogins
        .mockResolvedValueOnce({ rows: [{ count: '50' }] }) // phiAccessCount
        .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // uniqueUsersAccessingPHI
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // exportCount
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // accountLockouts
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }); // suspiciousActivities

      const result = await dataAuditService.getComplianceMetrics();

      expect(result.successfulLoginAttempts30Days).toBe(90);
      expect(result.failedLoginAttempts30Days).toBe(10);
      expect(result.phiAccessEvents30Days).toBe(50);
      expect(result.uniqueUsersAccessingPHI30Days).toBe(15);
      expect(result.dataExports30Days).toBe(5);
      expect(result.accountLockouts30Days).toBe(2);
      expect(result.suspiciousActivities30Days).toBe(1);
    });

    it('should handle zero login attempts', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: '100' }] }) // totalVerifiedUsers
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // successfulLogins
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // failedLogins
        .mockResolvedValue({ rows: [{ count: '0' }] }); // other queries

      const result = await dataAuditService.getComplianceMetrics();

      expect(result.successfulLoginAttempts30Days).toBe(0);
      expect(result.failedLoginAttempts30Days).toBe(0);
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(dataAuditService.getComplianceMetrics()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle missing data gracefully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // totalVerifiedUsers
        .mockResolvedValue({ rows: [] }); // other queries

      const result = await dataAuditService.getComplianceMetrics();

      expect(result.totalVerifiedUsers).toBe(0);
      expect(result.successfulLoginAttempts30Days).toBe(0);
      expect(result.failedLoginAttempts30Days).toBe(0);
    });

    it('should handle null count values', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ count: null }] }) // totalVerifiedUsers
        .mockResolvedValue({ rows: [{ count: null }] }); // other queries

      const result = await dataAuditService.getComplianceMetrics();

      expect(result.totalVerifiedUsers).toBe(0);
      expect(result.successfulLoginAttempts30Days).toBe(0);
    });
  });

  describe('getChartData', () => {
    it('should return chart data successfully', async () => {
      mockClient.query
        .mockResolvedValueOnce({
          rows: [
            {
              date: new Date('2024-01-01'),
              successful_logins: '10',
              failed_logins: '1'
            },
            {
              date: new Date('2024-01-02'),
              successful_logins: '12',
              failed_logins: '0'
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              date: new Date('2024-01-01'),
              phi_access_count: '5'
            },
            {
              date: new Date('2024-01-02'),
              phi_access_count: '6'
            }
          ]
        })
        .mockResolvedValueOnce({
          rows: [
            {
              date: new Date('2024-01-01'),
              export_count: '2'
            },
            {
              date: new Date('2024-01-02'),
              export_count: '1'
            }
          ]
        });

      const result = await dataAuditService.getChartData();

      expect(result).toHaveProperty('loginTrends');
      expect(result).toHaveProperty('phiAccessTrends');
      expect(result).toHaveProperty('exportTrends');
      expect(result.loginTrends.length).toBeGreaterThan(0);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty results', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await dataAuditService.getChartData();

      expect(result.loginTrends.length).toBe(30); // Should have 30 days of data
      expect(result.loginTrends[0].successfulLogins).toBe(0);
    });

    it('should combine data by date correctly', async () => {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() - 1);
      const dateStr = testDate.toISOString().split('T')[0];

      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            date: testDate,
            successful_logins: '20',
            failed_logins: '2'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            date: testDate,
            phi_access_count: '10'
          }]
        })
        .mockResolvedValueOnce({
          rows: [{
            date: testDate,
            export_count: '3'
          }]
        });

      const result = await dataAuditService.getChartData();

      const dayData = result.loginTrends.find(d => {
        const dDate = new Date(d.date);
        return dDate.toISOString().split('T')[0] === dateStr;
      });
      expect(dayData).toBeDefined();
      if (dayData) {
        expect(dayData.successfulLogins).toBe(20);
        expect(dayData.failedLogins).toBe(2);
        expect(dayData.phiAccess).toBe(10);
        expect(dayData.dataExports).toBe(3);
      }
    });

    it('should handle database errors', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(dataAuditService.getChartData()).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should format dates correctly', async () => {
      const testDate = new Date('2024-01-15');
      mockClient.query
        .mockResolvedValueOnce({
          rows: [{
            date: testDate,
            successful_logins: '10',
            failed_logins: '1'
          }]
        })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await dataAuditService.getChartData();

      expect(result.loginTrends.some(d => d.date.includes('Jan') || d.date.includes('15'))).toBe(true);
    });
  });
});

