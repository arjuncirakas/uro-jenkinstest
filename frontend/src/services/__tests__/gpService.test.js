import { describe, it, expect, vi, beforeEach } from 'vitest';
import { gpService } from '../gpService';
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

describe('gpService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getAllGPs', () => {
    it('should fetch all GPs without params', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getAllGPs();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/gp');
    });

    it('should include is_active param when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getAllGPs({ is_active: true });

      expect(axios.get).toHaveBeenCalledWith('/gp?is_active=true');
    });

    it('should handle is_active as false', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getAllGPs({ is_active: false });

      expect(axios.get).toHaveBeenCalledWith('/gp?is_active=false');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(gpService.getAllGPs()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching GPs:', error);
    });
  });

  describe('getGPById', () => {
    it('should fetch GP by ID', async () => {
      const mockResponse = { data: { success: true, data: { id: 1, name: 'Dr. Smith' } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getGPById(1);

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/gp/1');
    });

    it('should handle errors', async () => {
      const error = new Error('GP not found');
      axios.get.mockRejectedValue(error);

      await expect(gpService.getGPById(999)).rejects.toThrow('GP not found');
      expect(console.error).toHaveBeenCalledWith('Error fetching GP:', error);
    });
  });

  describe('createGP', () => {
    it('should create new GP', async () => {
      const gpData = { first_name: 'John', last_name: 'Doe' };
      const mockResponse = { data: { success: true, data: { id: 1, ...gpData } } };
      axios.post.mockResolvedValue(mockResponse);

      const result = await gpService.createGP(gpData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith('/gp', gpData);
    });

    it('should handle errors', async () => {
      const error = new Error('Validation failed');
      axios.post.mockRejectedValue(error);

      await expect(gpService.createGP({})).rejects.toThrow('Validation failed');
      expect(console.error).toHaveBeenCalledWith('Error creating GP:', error);
    });
  });

  describe('updateGP', () => {
    it('should update GP', async () => {
      const gpData = { first_name: 'Jane' };
      const mockResponse = { data: { success: true, data: { id: 1, ...gpData } } };
      axios.put.mockResolvedValue(mockResponse);

      const result = await gpService.updateGP(1, gpData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.put).toHaveBeenCalledWith('/gp/1', gpData);
    });

    it('should handle errors', async () => {
      const error = new Error('Update failed');
      axios.put.mockRejectedValue(error);

      await expect(gpService.updateGP(1, {})).rejects.toThrow('Update failed');
      expect(console.error).toHaveBeenCalledWith('Error updating GP:', error);
    });
  });

  describe('deleteGP', () => {
    it('should delete GP', async () => {
      const mockResponse = { data: { success: true, message: 'GP deleted' } };
      axios.delete.mockResolvedValue(mockResponse);

      const result = await gpService.deleteGP(1);

      expect(result).toEqual(mockResponse.data);
      expect(axios.delete).toHaveBeenCalledWith('/gp/1');
    });

    it('should handle errors', async () => {
      const error = new Error('Delete failed');
      axios.delete.mockRejectedValue(error);

      await expect(gpService.deleteGP(1)).rejects.toThrow('Delete failed');
      expect(console.error).toHaveBeenCalledWith('Error deleting GP:', error);
    });
  });

  describe('getRecentReferrals', () => {
    it('should fetch recent referrals with default limit', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getRecentReferrals();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/patients/new?limit=20');
    });

    it('should use custom limit', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getRecentReferrals(50);

      expect(axios.get).toHaveBeenCalledWith('/patients/new?limit=50');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(gpService.getRecentReferrals()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching recent referrals:', error);
    });
  });

  describe('getReferredPatients', () => {
    it('should fetch referred patients with default params', async () => {
      const mockResponse = { data: { success: true, data: { patients: [] } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getReferredPatients();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/patients/list?status=Active');
    });

    it('should include search param when provided', async () => {
      const mockResponse = { data: { success: true, data: { patients: [] } } };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getReferredPatients({ search: 'John' });

      expect(axios.get).toHaveBeenCalledWith('/patients/list?status=Active&search=John');
    });

    it('should include pagination params when provided', async () => {
      const mockResponse = { data: { success: true, data: { patients: [] } } };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getReferredPatients({ page: 2, limit: 10 });

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain('status=Active');
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=10');
    });

    it('should use custom status when provided', async () => {
      const mockResponse = { data: { success: true, data: { patients: [] } } };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getReferredPatients({ status: 'Inactive' });

      expect(axios.get).toHaveBeenCalledWith('/patients/list?status=Inactive');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(gpService.getReferredPatients()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching referred patients:', error);
    });
  });

  describe('getActiveMonitoringPatients', () => {
    it('should fetch active monitoring patients with default params', async () => {
      const mockResponse = { data: { success: true, data: { patients: [] } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getActiveMonitoringPatients();

      expect(result).toEqual(mockResponse.data);
      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain('status=Active');
      expect(callUrl).toContain('carePathway=Active Monitoring');
    });

    it('should include search and pagination params', async () => {
      const mockResponse = { data: { success: true, data: { patients: [] } } };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getActiveMonitoringPatients({ search: 'John', page: 1, limit: 20 });

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain('search=John');
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('limit=20');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(gpService.getActiveMonitoringPatients()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching active monitoring patients:', error);
    });
  });

  describe('getMedicationPatients', () => {
    it('should fetch medication patients with default params', async () => {
      const mockResponse = { data: { success: true, data: { patients: [] } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getMedicationPatients();

      expect(result).toEqual(mockResponse.data);
      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain('status=Active');
      expect(callUrl).toContain('carePathway=Medication');
    });

    it('should include search and pagination params', async () => {
      const mockResponse = { data: { success: true, data: { patients: [] } } };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getMedicationPatients({ search: 'John', page: 1, limit: 20 });

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain('search=John');
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('limit=20');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(gpService.getMedicationPatients()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching medication patients:', error);
    });
  });

  describe('getActiveMonitoringAndMedicationPatients', () => {
    it('should fetch and filter patients for Active Monitoring and Medication', async () => {
      const mockPatients = [
        { id: 1, carePathway: 'Active Monitoring' },
        { id: 2, carePathway: 'Medication' },
        { id: 3, carePathway: 'Surgery' }
      ];
      const mockResponse = {
        data: {
          success: true,
          data: {
            patients: mockPatients
          }
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getActiveMonitoringAndMedicationPatients();

      expect(result.data.patients).toHaveLength(2);
      expect(result.data.patients[0].carePathway).toBe('Active Monitoring');
      expect(result.data.patients[1].carePathway).toBe('Medication');
    });

    it('should return all patients when data structure is different', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {}
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getActiveMonitoringAndMedicationPatients();

      expect(result).toEqual(mockResponse.data);
    });

    it('should return all patients when patients array is missing', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            otherField: 'value'
          }
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getActiveMonitoringAndMedicationPatients();

      expect(result).toEqual(mockResponse.data);
    });

    it('should include search and pagination params', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            patients: []
          }
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      await gpService.getActiveMonitoringAndMedicationPatients({ search: 'John', page: 1, limit: 20 });

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain('search=John');
      expect(callUrl).toContain('page=1');
      expect(callUrl).toContain('limit=20');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(gpService.getActiveMonitoringAndMedicationPatients()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching active monitoring and medication patients:', error);
    });

    it('should filter correctly with mixed pathways', async () => {
      const mockPatients = [
        { id: 1, carePathway: 'Active Monitoring' },
        { id: 2, carePathway: 'Medication' },
        { id: 3, carePathway: 'Surgery' },
        { id: 4, carePathway: 'Active Monitoring' },
        { id: 5, carePathway: 'Other' }
      ];
      const mockResponse = {
        data: {
          success: true,
          data: {
            patients: mockPatients
          }
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await gpService.getActiveMonitoringAndMedicationPatients();

      expect(result.data.patients).toHaveLength(3);
      expect(result.data.patients.every(p => 
        p.carePathway === 'Active Monitoring' || p.carePathway === 'Medication'
      )).toBe(true);
    });
  });
});
