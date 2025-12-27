import { describe, it, expect, vi, beforeEach } from 'vitest';
import { patientService } from '../patientService.js';
import apiClient from '../../config/axios.js';

// Mock apiClient
vi.mock('../../config/axios.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('patientService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addPatient', () => {
    it('should add patient successfully', async () => {
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      const mockResponse = {
        data: {
          data: {
            patient: { id: 1, ...patientData }
          },
          message: 'Patient added successfully'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.addPatient(patientData);

      expect(apiClient.post).toHaveBeenCalledWith('/patients', patientData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, ...patientData });
      expect(result.message).toBe('Patient added successfully');
      consoleSpy.mockRestore();
    });

    it('should handle errors', async () => {
      const patientData = { firstName: 'John' };
      const mockError = {
        response: {
          data: {
            message: 'Validation failed',
            errors: ['Email is required']
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.addPatient(patientData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toEqual(['Email is required']);
      consoleSpy.mockRestore();
    });

    it('should handle errors without response', async () => {
      const patientData = { firstName: 'John' };
      const mockError = {
        message: 'Network error'
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.addPatient(patientData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to add patient');
      consoleSpy.mockRestore();
    });
  });

  describe('getAssignedPatients', () => {
    it('should get assigned patients with default category', async () => {
      const mockResponse = {
        data: {
          data: {
            patients: [{ id: 1, name: 'Patient 1' }],
            count: 1
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getAssignedPatients();

      expect(apiClient.get).toHaveBeenCalledWith('/patients/assigned', {
        params: { category: 'all' }
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'Patient 1' }]);
      expect(result.count).toBe(1);
    });

    it('should get assigned patients with specific category', async () => {
      const mockResponse = {
        data: {
          data: {
            patients: [],
            count: 0
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getAssignedPatients('active', { page: 1 });

      expect(apiClient.get).toHaveBeenCalledWith('/patients/assigned', {
        params: { category: 'active', page: 1 }
      });
      expect(result.success).toBe(true);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch'
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);

      const result = await patientService.getAssignedPatients();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
    });
  });

  describe('updatePatientPathway', () => {
    it('should update patient pathway successfully', async () => {
      const patientId = 1;
      const payload = { pathway: 'active_monitoring' };

      const mockResponse = {
        data: {
          data: { id: 1, pathway: 'active_monitoring' }
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await patientService.updatePatientPathway(patientId, payload);

      expect(apiClient.put).toHaveBeenCalledWith(`/patients/${patientId}/pathway`, payload);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, pathway: 'active_monitoring' });
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const payload = { pathway: 'invalid' };
      const mockError = {
        response: {
          data: {
            message: 'Invalid pathway'
          }
        }
      };

      apiClient.put.mockRejectedValue(mockError);

      const result = await patientService.updatePatientPathway(patientId, payload);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid pathway');
    });
  });

  describe('getPatients', () => {
    it('should get patients successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            patients: [{ id: 1, name: 'Patient 1' }],
            pagination: { page: 1, total: 1 }
          },
          message: 'Patients fetched'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await patientService.getPatients();

      expect(apiClient.get).toHaveBeenCalledWith('/patients/list', {
        params: {}
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'Patient 1' }]);
      expect(result.pagination).toEqual({ page: 1, total: 1 });
      consoleSpy.mockRestore();
    });

    it('should handle cache-busting parameter', async () => {
      const params = { _t: Date.now(), page: 1 };
      const mockResponse = {
        data: {
          data: {
            patients: [],
            pagination: {}
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await patientService.getPatients(params);

      expect(apiClient.get).toHaveBeenCalledWith('/patients/list', {
        params: { page: 1 },
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      expect(result.success).toBe(true);
      consoleSpy.mockRestore();
    });

    it('should handle errors with response message', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getPatients();

      expect(result.success).toBe(false);
      // Service uses response message if available
      expect(result.error).toBe('Failed to fetch');
      consoleSpy.mockRestore();
    });

    it('should handle errors without response message', async () => {
      const mockError = {
        response: {
          data: {}
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getPatients();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch patients');
      consoleSpy.mockRestore();
    });
  });

  describe('getNewPatients', () => {
    it('should get new patients successfully', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, is_new: true }],
          message: 'New patients fetched',
          count: 1
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getNewPatients();

      expect(apiClient.get).toHaveBeenCalledWith('/patients/new', { params: {} });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, is_new: true }]);
      expect(result.count).toBe(1);
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getNewPatients();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
      consoleSpy.mockRestore();
    });
  });

  describe('getPatientById', () => {
    it('should get patient by ID successfully', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: {
            patient: { id: 1, name: 'John Doe' }
          },
          message: 'Patient fetched'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getPatientById(patientId);

      expect(apiClient.get).toHaveBeenCalledWith(`/patients/${patientId}`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: 'John Doe' });
    });

    it('should handle errors', async () => {
      const patientId = 999;
      const mockError = {
        response: {
          data: {
            message: 'Patient not found',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getPatientById(patientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Patient not found');
      consoleSpy.mockRestore();
    });
  });

  describe('updatePatient', () => {
    it('should update patient successfully', async () => {
      const patientId = 1;
      const updateData = { firstName: 'Jane' };

      const mockResponse = {
        data: {
          data: {
            patient: { id: 1, firstName: 'Jane' }
          },
          message: 'Patient updated'
        }
      };

      apiClient.put.mockResolvedValue(mockResponse);

      const result = await patientService.updatePatient(patientId, updateData);

      expect(apiClient.put).toHaveBeenCalledWith(`/patients/${patientId}`, updateData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, firstName: 'Jane' });
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const updateData = { firstName: '' };
      const mockError = {
        response: {
          data: {
            message: 'Validation failed',
            errors: []
          }
        }
      };

      apiClient.put.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.updatePatient(patientId, updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      consoleSpy.mockRestore();
    });
  });

  describe('deletePatient', () => {
    it('should delete patient successfully', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          message: 'Patient deleted'
        }
      };

      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await patientService.deletePatient(patientId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/patients/${patientId}`);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Patient deleted');
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to delete',
            errors: []
          }
        }
      };

      apiClient.delete.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.deletePatient(patientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete');
      consoleSpy.mockRestore();
    });
  });

  describe('getAllPatients', () => {
    it('should get all patients successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            patients: [{ id: 1 }, { id: 2 }]
          },
          message: 'All patients fetched'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await patientService.getAllPatients();

      expect(apiClient.get).toHaveBeenCalledWith('/patients/list');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
      consoleSpy.mockRestore();
    });

    it('should handle errors with response message', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getAllPatients();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
      consoleSpy.mockRestore();
    });

    it('should handle errors without response message', async () => {
      const mockError = {
        response: {
          data: {}
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getAllPatients();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch all patients');
      consoleSpy.mockRestore();
    });
  });

  describe('getApiInfo', () => {
    it('should get API info successfully', async () => {
      const mockResponse = {
        data: {
          message: 'API info'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getApiInfo();

      expect(apiClient.get).toHaveBeenCalledWith('/patients');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ message: 'API info' });
    });

    it('should handle errors', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getApiInfo();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
      consoleSpy.mockRestore();
    });
  });

  describe('getPatientsDueForReview', () => {
    it('should get patients due for review successfully', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, due_for_review: true }],
          message: 'Patients fetched'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await patientService.getPatientsDueForReview();

      expect(apiClient.get).toHaveBeenCalledWith('/patients/due-for-review');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, due_for_review: true }]);
      consoleSpy.mockRestore();
    });

    it('should handle errors with response message', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getPatientsDueForReview();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
      consoleSpy.mockRestore();
    });

    it('should handle errors without response message', async () => {
      const mockError = {
        response: {
          data: {}
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getPatientsDueForReview();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch patients due for review');
      consoleSpy.mockRestore();
    });
  });

  describe('searchPatients', () => {
    it('should search patients successfully', async () => {
      const query = 'John';
      const mockResponse = {
        data: {
          data: [{ id: 1, name: 'John Doe' }],
          message: 'Search results'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.searchPatients(query);

      expect(apiClient.get).toHaveBeenCalledWith('/patients/search', {
        params: { query: 'John', limit: 10 }
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'John Doe' }]);
    });

    it('should return empty array for query too short', async () => {
      const result = await patientService.searchPatients('');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toBe('Query too short');
    });

    it('should return empty array for whitespace-only query', async () => {
      const result = await patientService.searchPatients('   ');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toBe('Query too short');
    });

    it('should trim query before searching', async () => {
      const query = '  John  ';
      const mockResponse = {
        data: {
          data: [{ id: 1 }],
          message: 'Results'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.searchPatients(query);

      expect(apiClient.get).toHaveBeenCalledWith('/patients/search', {
        params: { query: 'John', limit: 10 }
      });
      expect(result.success).toBe(true);
    });

    it('should use custom limit', async () => {
      const query = 'John';
      const limit = 20;
      const mockResponse = {
        data: {
          data: [],
          message: 'Results'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      await patientService.searchPatients(query, limit);

      expect(apiClient.get).toHaveBeenCalledWith('/patients/search', {
        params: { query: 'John', limit: 20 }
      });
    });

    it('should handle errors', async () => {
      const query = 'John';
      const mockError = {
        response: {
          data: {
            message: 'Search failed',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.searchPatients(query);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Search failed');
      consoleSpy.mockRestore();
    });

    it('should handle null query', async () => {
      const result = await patientService.searchPatients(null);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(result.message).toBe('Query too short');
    });
  });

  describe('getPatientMDTMeetings', () => {
    it('should get patient MDT meetings successfully', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: [{ id: 1, patient_id: 1 }],
          message: 'MDT meetings fetched'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getPatientMDTMeetings(patientId);

      expect(apiClient.get).toHaveBeenCalledWith(`/patients/${patientId}/mdt`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, patient_id: 1 }]);
    });

    it('should handle empty MDT meetings', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: null
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getPatientMDTMeetings(patientId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getPatientMDTMeetings(patientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
      consoleSpy.mockRestore();
    });
  });

  describe('getDischargeSummary', () => {
    it('should get discharge summary successfully', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: { id: 1, patient_id: 1, summary: 'Test summary' },
          message: 'Discharge summary fetched'
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getDischargeSummary(patientId);

      expect(apiClient.get).toHaveBeenCalledWith(`/patients/${patientId}/discharge-summary`);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, patient_id: 1, summary: 'Test summary' });
    });

    it('should handle null discharge summary', async () => {
      const patientId = 1;
      const mockResponse = {
        data: {
          data: null
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);

      const result = await patientService.getDischargeSummary(patientId);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        }
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getDischargeSummary(patientId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
      consoleSpy.mockRestore();
    });
  });

  describe('createDischargeSummary', () => {
    it('should create discharge summary successfully', async () => {
      const patientId = 1;
      const dischargeSummaryData = {
        summary: 'Test summary',
        date: '2024-01-01'
      };

      const mockResponse = {
        data: {
          data: { id: 1, patient_id: 1, summary: 'Test summary' },
          message: 'Discharge summary created'
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await patientService.createDischargeSummary(patientId, dischargeSummaryData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/patients/${patientId}/discharge-summary`,
        dischargeSummaryData
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, patient_id: 1, summary: 'Test summary' });
    });

    it('should handle null response data', async () => {
      const patientId = 1;
      const dischargeSummaryData = { summary: 'Test' };
      const mockResponse = {
        data: {
          data: null
        }
      };

      apiClient.post.mockResolvedValue(mockResponse);

      const result = await patientService.createDischargeSummary(patientId, dischargeSummaryData);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle errors', async () => {
      const patientId = 1;
      const dischargeSummaryData = { summary: 'Test' };
      const mockError = {
        response: {
          data: {
            message: 'Failed to create',
            errors: []
          }
        }
      };

      apiClient.post.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.createDischargeSummary(patientId, dischargeSummaryData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create');
      consoleSpy.mockRestore();
    });
  });

  describe('getAllUrologists', () => {
    it('should get all urologists successfully with urologists array', async () => {
      const mockResponse = {
        data: {
          data: {
            urologists: [{ id: 1, name: 'Dr. Smith' }]
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await patientService.getAllUrologists();

      expect(apiClient.get).toHaveBeenCalledWith('/patients/urologists');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'Dr. Smith' }]);
      consoleSpy.mockRestore();
    });

    it('should get all urologists with direct data array', async () => {
      const mockResponse = {
        data: {
          data: [{ id: 1, name: 'Dr. Smith' }]
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await patientService.getAllUrologists();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 1, name: 'Dr. Smith' }]);
      consoleSpy.mockRestore();
    });

    it('should handle empty urologists', async () => {
      const mockResponse = {
        data: {
          data: {
            urologists: []
          }
        }
      };

      apiClient.get.mockResolvedValue(mockResponse);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = await patientService.getAllUrologists();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should handle errors with response data', async () => {
      const mockError = {
        response: {
          data: {
            message: 'Failed to fetch',
            errors: []
          }
        },
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getAllUrologists();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch');
      consoleSpy.mockRestore();
    });

    it('should handle errors without response data', async () => {
      const mockError = {
        message: 'Network error'
      };

      apiClient.get.mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await patientService.getAllUrologists();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      consoleSpy.mockRestore();
    });
  });
});

