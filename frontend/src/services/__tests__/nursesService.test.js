import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nursesService } from '../nursesService';
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

describe('nursesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getAllNurses', () => {
    it('should fetch all nurses without params', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await nursesService.getAllNurses();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/nurses');
    });

    it('should include is_active param when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await nursesService.getAllNurses({ is_active: true });

      expect(axios.get).toHaveBeenCalledWith('/nurses?is_active=true');
    });

    it('should handle is_active as false', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await nursesService.getAllNurses({ is_active: false });

      expect(axios.get).toHaveBeenCalledWith('/nurses?is_active=false');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(nursesService.getAllNurses()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching nurses:', error);
    });
  });

  describe('getNurseById', () => {
    it('should fetch nurse by ID', async () => {
      const mockResponse = { data: { success: true, data: { id: 1, name: 'Nurse Smith' } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await nursesService.getNurseById(1);

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/nurses/1');
    });

    it('should handle errors', async () => {
      const error = new Error('Nurse not found');
      axios.get.mockRejectedValue(error);

      await expect(nursesService.getNurseById(999)).rejects.toThrow('Nurse not found');
      expect(console.error).toHaveBeenCalledWith('Error fetching nurse:', error);
    });
  });

  describe('createNurse', () => {
    it('should create new nurse', async () => {
      const nurseData = { first_name: 'Jane', last_name: 'Doe' };
      const mockResponse = { data: { success: true, data: { id: 1, ...nurseData } } };
      axios.post.mockResolvedValue(mockResponse);

      const result = await nursesService.createNurse(nurseData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith('/nurses', nurseData);
    });

    it('should handle errors', async () => {
      const error = new Error('Validation failed');
      axios.post.mockRejectedValue(error);

      await expect(nursesService.createNurse({})).rejects.toThrow('Validation failed');
      expect(console.error).toHaveBeenCalledWith('Error creating nurse:', error);
    });
  });

  describe('updateNurse', () => {
    it('should update nurse', async () => {
      const nurseData = { first_name: 'Jane' };
      const mockResponse = { data: { success: true, data: { id: 1, ...nurseData } } };
      axios.put.mockResolvedValue(mockResponse);

      const result = await nursesService.updateNurse(1, nurseData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.put).toHaveBeenCalledWith('/nurses/1', nurseData);
    });

    it('should handle errors', async () => {
      const error = new Error('Update failed');
      axios.put.mockRejectedValue(error);

      await expect(nursesService.updateNurse(1, {})).rejects.toThrow('Update failed');
      expect(console.error).toHaveBeenCalledWith('Error updating nurse:', error);
    });
  });

  describe('deleteNurse', () => {
    it('should delete nurse', async () => {
      const mockResponse = { data: { success: true, message: 'Nurse deleted' } };
      axios.delete.mockResolvedValue(mockResponse);

      const result = await nursesService.deleteNurse(1);

      expect(result).toEqual(mockResponse.data);
      expect(axios.delete).toHaveBeenCalledWith('/nurses/1');
    });

    it('should handle errors', async () => {
      const error = new Error('Delete failed');
      axios.delete.mockRejectedValue(error);

      await expect(nursesService.deleteNurse(1)).rejects.toThrow('Delete failed');
      expect(console.error).toHaveBeenCalledWith('Error deleting nurse:', error);
    });
  });
});
