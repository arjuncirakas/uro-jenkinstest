import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dataAuditService } from '../dataAuditService.js';
import apiClient from '../../config/axios.js';

// Mock apiClient
vi.mock('../../config/axios.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock window.URL and document for export functionality
global.URL = {
  createObjectURL: vi.fn(() => 'blob:mock-url'),
  revokeObjectURL: vi.fn()
};

global.Blob = class Blob {
  constructor(parts, options) {
    this.parts = parts;
    this.type = options?.type || '';
  }
};

describe('dataAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.createElement = vi.fn(() => ({
      href: '',
      download: '',
      click: vi.fn()
    }));
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  describe('getDataInventory', () => {
    it('should fetch data inventory successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            inventory: [],
            totals: { totalTables: 10 },
            byCategory: {}
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getDataInventory();

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/data-audit/inventory');
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch data inventory'
          }
        },
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getDataInventory();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch data inventory');
      expect(result.data).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should handle errors without response data', async () => {
      const mockError = {
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getDataInventory();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      consoleSpy.mockRestore();
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        data: {}
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getDataInventory();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });
  });

  describe('getAccessLogs', () => {
    it('should fetch access logs successfully with no filters', async () => {
      const mockResponse = {
        data: {
          data: {
            logs: [],
            pagination: { page: 1, total: 0 }
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getAccessLogs();

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/data-audit/access-logs?');
      expect(result.success).toBe(true);
      expect(result.data.logs).toEqual([]);
    });

    it('should fetch access logs with all filters', async () => {
      const mockResponse = {
        data: {
          data: {
            logs: [{ id: 1, action: 'phi.view' }],
            pagination: { page: 1, total: 1 }
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

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

      expect(apiClient.get).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.logs).toHaveLength(1);
    });

    it('should handle pagination', async () => {
      const mockResponse = {
        data: {
          data: {
            logs: [],
            pagination: { page: 2, total: 100, totalPages: 5 }
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getAccessLogs({ page: 2, limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data.pagination.page).toBe(2);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch access logs'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getAccessLogs();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch access logs');
      consoleSpy.mockRestore();
    });

    it('should handle partial filters', async () => {
      const mockResponse = {
        data: {
          data: {
            logs: [],
            pagination: {}
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getAccessLogs({ startDate: '2024-01-01' });

      expect(result.success).toBe(true);
    });
  });

  describe('getProcessingActivities', () => {
    it('should fetch processing activities successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            activities: []
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getProcessingActivities();

      expect(apiClient.get).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.activities).toEqual([]);
    });

    it('should fetch with filters', async () => {
      const mockResponse = {
        data: {
          data: {
            activities: [{ action: 'create', count: 10 }]
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getProcessingActivities({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        actionType: 'create',
        resourceType: 'patient'
      });

      expect(result.success).toBe(true);
      expect(result.data.activities).toHaveLength(1);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch processing activities'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getProcessingActivities();

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('getRetentionInfo', () => {
    it('should fetch retention info successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            retentionData: [],
            summary: {}
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getRetentionInfo();

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/data-audit/retention');
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch retention information'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getRetentionInfo();

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('getThirdPartySharing', () => {
    it('should fetch third-party sharing successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            sharingEvents: []
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getThirdPartySharing();

      expect(apiClient.get).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data.sharingEvents).toEqual([]);
    });

    it('should fetch with filters', async () => {
      const mockResponse = {
        data: {
          data: {
            sharingEvents: [{ id: 1, action: 'export' }]
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getThirdPartySharing({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        userId: 1
      });

      expect(result.success).toBe(true);
      expect(result.data.sharingEvents).toHaveLength(1);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch third-party sharing data'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getThirdPartySharing();

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('getComplianceMetrics', () => {
    it('should fetch compliance metrics successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            successfulLoginAttempts30Days: 100,
            failedLoginAttempts30Days: 5,
            phiAccessEvents30Days: 50
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getComplianceMetrics();

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/data-audit/compliance-metrics');
      expect(result.success).toBe(true);
      expect(result.data.successfulLoginAttempts30Days).toBe(100);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch compliance metrics'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getComplianceMetrics();

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('getChartData', () => {
    it('should fetch chart data successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            loginTrends: [
              { date: 'Jan 1', successfulLogins: 10, failedLogins: 1, phiAccess: 5, dataExports: 2 }
            ],
            phiAccessTrends: [],
            exportTrends: []
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getChartData();

      expect(apiClient.get).toHaveBeenCalledWith('/superadmin/data-audit/chart-data');
      expect(result.success).toBe(true);
      expect(result.data.loginTrends).toHaveLength(1);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch chart data'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getChartData();

      expect(result.success).toBe(false);
      expect(result.data.loginTrends).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        data: {}
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await dataAuditService.getChartData();

      expect(result.success).toBe(true);
      expect(result.data.loginTrends).toEqual([]);
    });

    it('should handle errors without response data', async () => {
      const mockError = {
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.getChartData();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      consoleSpy.mockRestore();
    });
  });

  describe('exportAuditReport', () => {
    it('should export CSV successfully', async () => {
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      const mockResponse = {
        data: mockBlob
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      document.createElement.mockReturnValue(mockLink);

      const result = await dataAuditService.exportAuditReport('csv');

      expect(apiClient.get).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should export PDF successfully', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      const mockResponse = {
        data: mockBlob
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      document.createElement.mockReturnValue(mockLink);

      const result = await dataAuditService.exportAuditReport('pdf');

      expect(result.success).toBe(true);
    });

    it('should handle export with options', async () => {
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      const mockResponse = {
        data: mockBlob
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      document.createElement.mockReturnValue(mockLink);

      const result = await dataAuditService.exportAuditReport('csv', {
        section: 'access-logs',
        startDate: '2024-01-01'
      });

      expect(result.success).toBe(true);
    });

    it('should handle export errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to export audit report'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.exportAuditReport('csv');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to export audit report');
      consoleSpy.mockRestore();
    });

    it('should handle export errors without response', async () => {
      const mockError = {
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await dataAuditService.exportAuditReport('csv');

      expect(result.success).toBe(false);
      consoleSpy.mockRestore();
    });

    it('should use default format if not provided', async () => {
      const mockBlob = new Blob(['test'], { type: 'text/csv' });
      const mockResponse = {
        data: mockBlob
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      document.createElement.mockReturnValue(mockLink);

      const result = await dataAuditService.exportAuditReport();

      expect(result.success).toBe(true);
    });
  });
});

