import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import departmentAdminService from '../departmentAdminService';
import axios from '../config/axios';

// Mock axios
vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('DepartmentAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock DOM methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    global.Blob = class Blob {
      constructor(data) {
        this.data = data;
      }
    };
    global.document.createElement = vi.fn((tag) => {
      const element = {
        tagName: tag,
        href: '',
        setAttribute: vi.fn(),
        click: vi.fn(),
        remove: vi.fn()
      };
      return element;
    });
    global.document.body.appendChild = vi.fn();
    global.document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAllKPIs', () => {
    it('should fetch all KPIs without date params', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await departmentAdminService.getAllKPIs();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/kpi/all', { params: {} });
    });

    it('should include startDate when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getAllKPIs('2024-01-01', null);

      expect(axios.get).toHaveBeenCalledWith('/kpi/all', {
        params: { startDate: '2024-01-01' }
      });
    });

    it('should include endDate when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getAllKPIs(null, '2024-12-31');

      expect(axios.get).toHaveBeenCalledWith('/kpi/all', {
        params: { endDate: '2024-12-31' }
      });
    });

    it('should include both dates when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getAllKPIs('2024-01-01', '2024-12-31');

      expect(axios.get).toHaveBeenCalledWith('/kpi/all', {
        params: { startDate: '2024-01-01', endDate: '2024-12-31' }
      });
    });

    it('should not include empty string dates', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getAllKPIs('', '');

      expect(axios.get).toHaveBeenCalledWith('/kpi/all', { params: {} });
    });

    it('should not include whitespace-only dates', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getAllKPIs('   ', '   ');

      expect(axios.get).toHaveBeenCalledWith('/kpi/all', { params: {} });
    });

    it('should handle errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(departmentAdminService.getAllKPIs()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Get all KPIs error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('getAverageWaitTime', () => {
    it('should fetch average wait time without params', async () => {
      const mockResponse = { data: { success: true, data: { average: 5 } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await departmentAdminService.getAverageWaitTime();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/kpi/wait-time', { params: {} });
    });

    it('should include date params when provided', async () => {
      const mockResponse = { data: { success: true, data: { average: 5 } } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getAverageWaitTime('2024-01-01', '2024-12-31');

      expect(axios.get).toHaveBeenCalledWith('/kpi/wait-time', {
        params: { startDate: '2024-01-01', endDate: '2024-12-31' }
      });
    });

    it('should handle errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(departmentAdminService.getAverageWaitTime()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Get average wait time error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('getActiveSurveillanceCompliance', () => {
    it('should fetch compliance data', async () => {
      const mockResponse = { data: { success: true, data: { compliance: 0.85 } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await departmentAdminService.getActiveSurveillanceCompliance();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/kpi/active-surveillance-compliance', { params: {} });
    });

    it('should include date params when provided', async () => {
      const mockResponse = { data: { success: true, data: { compliance: 0.85 } } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getActiveSurveillanceCompliance('2024-01-01', '2024-12-31');

      expect(axios.get).toHaveBeenCalledWith('/kpi/active-surveillance-compliance', {
        params: { startDate: '2024-01-01', endDate: '2024-12-31' }
      });
    });

    it('should handle errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(departmentAdminService.getActiveSurveillanceCompliance()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Get active surveillance compliance error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('getDischargeToGPPercentage', () => {
    it('should fetch discharge percentage', async () => {
      const mockResponse = { data: { success: true, data: { percentage: 0.75 } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await departmentAdminService.getDischargeToGPPercentage();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/kpi/discharge-to-gp', { params: {} });
    });

    it('should include date params when provided', async () => {
      const mockResponse = { data: { success: true, data: { percentage: 0.75 } } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getDischargeToGPPercentage('2024-01-01', '2024-12-31');

      expect(axios.get).toHaveBeenCalledWith('/kpi/discharge-to-gp', {
        params: { startDate: '2024-01-01', endDate: '2024-12-31' }
      });
    });

    it('should handle errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(departmentAdminService.getDischargeToGPPercentage()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Get discharge to GP percentage error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('getKPITrends', () => {
    it('should fetch KPI trends with default params', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await departmentAdminService.getKPITrends();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/kpi/trends', {
        params: { period: 'month', months: 12 }
      });
    });

    it('should use custom period and months', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await departmentAdminService.getKPITrends('week', 4);

      expect(axios.get).toHaveBeenCalledWith('/kpi/trends', {
        params: { period: 'week', months: 4 }
      });
    });

    it('should handle errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(departmentAdminService.getKPITrends()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Get KPI trends error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('getExportFields', () => {
    it('should fetch export fields', async () => {
      const mockResponse = { data: { success: true, data: { fields: ['name', 'email'] } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await departmentAdminService.getExportFields();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/export/fields');
    });

    it('should handle errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(departmentAdminService.getExportFields()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Get export fields error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('exportPatientsToCSV', () => {
    it('should export patients to CSV without fields and filters', async () => {
      const mockBlob = new Blob(['csv,data']);
      axios.get.mockResolvedValue({ data: mockBlob });

      const result = await departmentAdminService.exportPatientsToCSV();

      expect(result.success).toBe(true);
      expect(axios.get).toHaveBeenCalledWith('/export/patients/csv', {
        params: {},
        responseType: 'blob'
      });
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.document.createElement).toHaveBeenCalledWith('a');
    });

    it('should include fields when provided', async () => {
      const mockBlob = new Blob(['csv,data']);
      axios.get.mockResolvedValue({ data: mockBlob });

      await departmentAdminService.exportPatientsToCSV(['name', 'email']);

      expect(axios.get).toHaveBeenCalledWith('/export/patients/csv', {
        params: { fields: 'name,email' },
        responseType: 'blob'
      });
    });

    it('should include filters when provided', async () => {
      const mockBlob = new Blob(['csv,data']);
      axios.get.mockResolvedValue({ data: mockBlob });

      await departmentAdminService.exportPatientsToCSV(null, { status: 'Active' });

      expect(axios.get).toHaveBeenCalledWith('/export/patients/csv', {
        params: { status: 'Active' },
        responseType: 'blob'
      });
    });

    it('should include both fields and filters', async () => {
      const mockBlob = new Blob(['csv,data']);
      axios.get.mockResolvedValue({ data: mockBlob });

      await departmentAdminService.exportPatientsToCSV(['name', 'email'], { status: 'Active' });

      expect(axios.get).toHaveBeenCalledWith('/export/patients/csv', {
        params: { fields: 'name,email', status: 'Active' },
        responseType: 'blob'
      });
    });

    it('should not include fields when empty array', async () => {
      const mockBlob = new Blob(['csv,data']);
      axios.get.mockResolvedValue({ data: mockBlob });

      await departmentAdminService.exportPatientsToCSV([]);

      expect(axios.get).toHaveBeenCalledWith('/export/patients/csv', {
        params: {},
        responseType: 'blob'
      });
    });

    it('should create download link with correct filename', async () => {
      const mockBlob = new Blob(['csv,data']);
      axios.get.mockResolvedValue({ data: mockBlob });
      const mockLink = { href: '', setAttribute: vi.fn(), click: vi.fn(), remove: vi.fn() };
      global.document.createElement.mockReturnValue(mockLink);

      await departmentAdminService.exportPatientsToCSV();

      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        'download',
        expect.stringMatching(/^patients_export_\d{4}-\d{2}-\d{2}\.csv$/)
      );
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.remove).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(departmentAdminService.exportPatientsToCSV()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Export patients to CSV error:', error);

      consoleSpy.mockRestore();
    });
  });

  describe('exportPatientsToExcel', () => {
    it('should export patients to Excel without fields and filters', async () => {
      const mockBlob = new Blob(['excel,data']);
      axios.get.mockResolvedValue({ data: mockBlob });

      const result = await departmentAdminService.exportPatientsToExcel();

      expect(result.success).toBe(true);
      expect(axios.get).toHaveBeenCalledWith('/export/patients/excel', {
        params: {},
        responseType: 'blob'
      });
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should include fields when provided', async () => {
      const mockBlob = new Blob(['excel,data']);
      axios.get.mockResolvedValue({ data: mockBlob });

      await departmentAdminService.exportPatientsToExcel(['name', 'email']);

      expect(axios.get).toHaveBeenCalledWith('/export/patients/excel', {
        params: { fields: 'name,email' },
        responseType: 'blob'
      });
    });

    it('should include filters when provided', async () => {
      const mockBlob = new Blob(['excel,data']);
      axios.get.mockResolvedValue({ data: mockBlob });

      await departmentAdminService.exportPatientsToExcel(null, { status: 'Active' });

      expect(axios.get).toHaveBeenCalledWith('/export/patients/excel', {
        params: { status: 'Active' },
        responseType: 'blob'
      });
    });

    it('should create download link with correct filename', async () => {
      const mockBlob = new Blob(['excel,data']);
      axios.get.mockResolvedValue({ data: mockBlob });
      const mockLink = { href: '', setAttribute: vi.fn(), click: vi.fn(), remove: vi.fn() };
      global.document.createElement.mockReturnValue(mockLink);

      await departmentAdminService.exportPatientsToExcel();

      expect(mockLink.setAttribute).toHaveBeenCalledWith(
        'download',
        expect.stringMatching(/^patients_export_\d{4}-\d{2}-\d{2}\.xlsx$/)
      );
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.remove).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(departmentAdminService.exportPatientsToExcel()).rejects.toThrow('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Export patients to Excel error:', error);

      consoleSpy.mockRestore();
    });
  });
});
