import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doctorsService } from '../doctorsService';
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

describe('doctorsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getAllDoctors', () => {
    it('should fetch all doctors without params', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await doctorsService.getAllDoctors();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/doctors');
    });

    it('should include is_active param when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await doctorsService.getAllDoctors({ is_active: true });

      expect(axios.get).toHaveBeenCalledWith('/doctors?is_active=true');
    });

    it('should include department_id param when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await doctorsService.getAllDoctors({ department_id: 1 });

      expect(axios.get).toHaveBeenCalledWith('/doctors?department_id=1');
    });

    it('should include both params when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await doctorsService.getAllDoctors({ is_active: true, department_id: 1 });

      const callUrl = axios.get.mock.calls[0][0];
      expect(callUrl).toContain('/doctors?');
      expect(callUrl).toContain('is_active=true');
      expect(callUrl).toContain('department_id=1');
    });

    it('should handle is_active as false', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await doctorsService.getAllDoctors({ is_active: false });

      expect(axios.get).toHaveBeenCalledWith('/doctors?is_active=false');
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(doctorsService.getAllDoctors()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching doctors:', error);
    });
  });

  describe('getDoctorById', () => {
    it('should fetch doctor by ID', async () => {
      const mockResponse = { data: { success: true, data: { id: 1, name: 'Dr. Smith' } } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await doctorsService.getDoctorById(1);

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/doctors/1');
    });

    it('should handle errors', async () => {
      const error = new Error('Doctor not found');
      axios.get.mockRejectedValue(error);

      await expect(doctorsService.getDoctorById(999)).rejects.toThrow('Doctor not found');
      expect(console.error).toHaveBeenCalledWith('Error fetching doctor:', error);
    });
  });

  describe('createDoctor', () => {
    it('should create new doctor', async () => {
      const doctorData = { first_name: 'John', last_name: 'Doe' };
      const mockResponse = { data: { success: true, data: { id: 1, ...doctorData } } };
      axios.post.mockResolvedValue(mockResponse);

      const result = await doctorsService.createDoctor(doctorData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith('/doctors', doctorData);
    });

    it('should handle errors', async () => {
      const error = new Error('Validation failed');
      axios.post.mockRejectedValue(error);

      await expect(doctorsService.createDoctor({})).rejects.toThrow('Validation failed');
      expect(console.error).toHaveBeenCalledWith('Error creating doctor:', error);
    });
  });

  describe('updateDoctor', () => {
    it('should update doctor', async () => {
      const doctorData = { first_name: 'Jane' };
      const mockResponse = { data: { success: true, data: { id: 1, ...doctorData } } };
      axios.put.mockResolvedValue(mockResponse);

      const result = await doctorsService.updateDoctor(1, doctorData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.put).toHaveBeenCalledWith('9', doctorData);
    });

    it('should handle errors', async () => {
      const error = new Error('Update failed');
      axios.put.mockRejectedValue(error);

      await expect(doctorsService.updateDoctor(1, {})).rejects.toThrow('Update failed');
      expect(console.error).toHaveBeenCalledWith('Error updating doctor:', error);
    });
  });

  describe('deleteDoctor', () => {
    it('should delete doctor', async () => {
      const mockResponse = { data: { success: true, message: 'Doctor deleted' } };
      axios.delete.mockResolvedValue(mockResponse);

      const result = await doctorsService.deleteDoctor(1);

      expect(result).toEqual(mockResponse.data);
      expect(axios.delete).toHaveBeenCalledWith('/doctors/1');
    });

    it('should handle errors', async () => {
      const error = new Error('Delete failed');
      axios.delete.mockRejectedValue(error);

      await expect(doctorsService.deleteDoctor(1)).rejects.toThrow('Delete failed');
      expect(console.error).toHaveBeenCalledWith('Error deleting doctor:', error);
    });
  });

  describe('getAllDepartments', () => {
    it('should fetch all departments without params', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await doctorsService.getAllDepartments();

      expect(result).toEqual(mockResponse.data);
      expect(axios.get).toHaveBeenCalledWith('/departments', { params: {} });
    });

    it('should include params when provided', async () => {
      const mockResponse = { data: { success: true, data: [] } };
      axios.get.mockResolvedValue(mockResponse);

      await doctorsService.getAllDepartments({ is_active: true });

      expect(axios.get).toHaveBeenCalledWith('/departments', { params: { is_active: true } });
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      await expect(doctorsService.getAllDepartments()).rejects.toThrow('Network error');
      expect(console.error).toHaveBeenCalledWith('Error fetching departments:', error);
    });
  });

  describe('createDepartment', () => {
    it('should create new department', async () => {
      const deptData = { name: 'Cardiology' };
      const mockResponse = { data: { success: true, data: { id: 1, ...deptData } } };
      axios.post.mockResolvedValue(mockResponse);

      const result = await doctorsService.createDepartment(deptData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.post).toHaveBeenCalledWith('/departments', deptData);
    });

    it('should handle errors', async () => {
      const error = new Error('Validation failed');
      axios.post.mockRejectedValue(error);

      await expect(doctorsService.createDepartment({})).rejects.toThrow('Validation failed');
      expect(console.error).toHaveBeenCalledWith('Error creating department:', error);
    });
  });

  describe('updateDepartment', () => {
    it('should update department', async () => {
      const deptData = { name: 'Updated Name' };
      const mockResponse = { data: { success: true, data: { id: 1, ...deptData } } };
      axios.put.mockResolvedValue(mockResponse);

      const result = await doctorsService.updateDepartment(1, deptData);

      expect(result).toEqual(mockResponse.data);
      expect(axios.put).toHaveBeenCalledWith('/departments/1', deptData);
    });

    it('should handle errors', async () => {
      const error = new Error('Update failed');
      axios.put.mockRejectedValue(error);

      await expect(doctorsService.updateDepartment(1, {})).rejects.toThrow('Update failed');
      expect(console.error).toHaveBeenCalledWith('Error updating department:', error);
    });
  });

  describe('deleteDepartment', () => {
    it('should delete department', async () => {
      const mockResponse = { data: { success: true, message: 'Department deleted' } };
      axios.delete.mockResolvedValue(mockResponse);

      const result = await doctorsService.deleteDepartment(1);

      expect(result).toEqual(mockResponse.data);
      expect(axios.delete).toHaveBeenCalledWith('/departments/1');
    });

    it('should handle errors', async () => {
      const error = new Error('Delete failed');
      axios.delete.mockRejectedValue(error);

      await expect(doctorsService.deleteDepartment(1)).rejects.toThrow('Delete failed');
      expect(console.error).toHaveBeenCalledWith('Error deleting department:', error);
    });
  });

  describe('formatDoctorName', () => {
    it('should format doctor name with specialization', () => {
      const doctor = {
        first_name: 'John',
        last_name: 'Doe',
        specialization: 'Urology'
      };

      const formatted = doctorsService.formatDoctorName(doctor);

      expect(formatted).toBe('John Doe (Urology)');
    });

    it('should format doctor name with department_name when specialization is missing', () => {
      const doctor = {
        first_name: 'John',
        last_name: 'Doe',
        department_name: 'Urology'
      };

      const formatted = doctorsService.formatDoctorName(doctor);

      expect(formatted).toBe('John Doe (Urology)');
    });

    it('should format doctor name without specialization when both are missing', () => {
      const doctor = {
        first_name: 'John',
        last_name: 'Doe'
      };

      const formatted = doctorsService.formatDoctorName(doctor);

      expect(formatted).toBe('John Doe');
    });

    it('should prioritize specialization over department_name', () => {
      const doctor = {
        first_name: 'John',
        last_name: 'Doe',
        specialization: 'Urology',
        department_name: 'Cardiology'
      };

      const formatted = doctorsService.formatDoctorName(doctor);

      expect(formatted).toBe('John Doe (Urology)');
    });
  });

  describe('getDoctorsForDropdown', () => {
    it('should fetch and format doctors for dropdown', async () => {
      const mockDoctors = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          specialization: 'Urology',
          email: 'john@example.com',
          phone: '1234567890'
        }
      ];
      const mockResponse = { data: { success: true, data: mockDoctors } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await doctorsService.getDoctorsForDropdown();

      expect(result).toEqual([
        {
          id: 1,
          name: 'John Doe (Urology)',
          first_name: 'John',
          last_name: 'Doe',
          specialization: 'Urology',
          department_name: undefined,
          email: 'john@example.com',
          phone: '1234567890'
        }
      ]);
      expect(axios.get).toHaveBeenCalledWith('/doctors?is_active=true&verified_only=true');
    });

    it('should return empty array when response is not successful', async () => {
      const mockResponse = { data: { success: false } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await doctorsService.getDoctorsForDropdown();

      expect(result).toEqual([]);
      expect(console.log).toHaveBeenCalledWith('No doctors found or error in response');
    });

    it('should return empty array when data is missing', async () => {
      const mockResponse = { data: {} };
      axios.get.mockResolvedValue(mockResponse);

      const result = await doctorsService.getDoctorsForDropdown();

      expect(result).toEqual([]);
    });

    it('should handle errors and return empty array', async () => {
      const error = new Error('Network error');
      axios.get.mockRejectedValue(error);

      const result = await doctorsService.getDoctorsForDropdown();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Error fetching doctors for dropdown:', error);
    });

    it('should format multiple doctors correctly', async () => {
      const mockDoctors = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          specialization: 'Urology',
          email: 'john@example.com',
          phone: '1234567890'
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          department_name: 'Cardiology',
          email: 'jane@example.com',
          phone: '0987654321'
        }
      ];
      const mockResponse = { data: { success: true, data: mockDoctors } };
      axios.get.mockResolvedValue(mockResponse);

      const result = await doctorsService.getDoctorsForDropdown();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe (Urology)');
      expect(result[1].name).toBe('Jane Smith (Cardiology)');
    });
  });
});
