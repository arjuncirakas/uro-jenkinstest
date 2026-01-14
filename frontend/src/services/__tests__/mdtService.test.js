import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mdtService } from '../mdtService';
import apiClient from '../config/axios';

// Mock axios
vi.mock('../config/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('mdtService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('scheduleMDTMeeting', () => {
    it('should schedule MDT meeting successfully', async () => {
      const mdtData = {
        meeting_date: '2024-12-31',
        meeting_time: '10:00',
        priority: 'High'
      };
      const mockResponse = {
        data: {
          data: { id: 1, ...mdtData }
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await mdtService.scheduleMDTMeeting(123, mdtData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data.data);
      expect(apiClient.post).toHaveBeenCalledWith('/patients/123/mdt', mdtData);
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Invalid date',
            errors: ['Date must be in the future']
          }
        }
      };
      apiClient.post.mockRejectedValue(error);

      const result = await mdtService.scheduleMDTMeeting(123, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid date');
      expect(result.details).toEqual(['Date must be in the future']);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);

      const result = await mdtService.scheduleMDTMeeting(123, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle errors without response', async () => {
      const error = { message: 'Request failed' };
      apiClient.post.mockRejectedValue(error);

      const result = await mdtService.scheduleMDTMeeting(123, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request failed');
    });
  });

  describe('saveMDTNotes', () => {
    it('should save MDT notes successfully', async () => {
      const notesData = { notes: 'Patient discussed in MDT' };
      const mockResponse = {
        data: {
          data: { id: 1, notes: notesData.notes }
        }
      };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await mdtService.saveMDTNotes(1, notesData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data.data);
      expect(apiClient.put).toHaveBeenCalledWith('/mdt/1/notes', notesData);
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Meeting not found',
            errors: []
          }
        }
      };
      apiClient.put.mockRejectedValue(error);

      const result = await mdtService.saveMDTNotes(999, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Meeting not found');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('rescheduleMDTMeeting', () => {
    it('should reschedule MDT meeting successfully', async () => {
      const rescheduleData = {
        meeting_date: '2025-01-15',
        meeting_time: '14:00'
      };
      const mockResponse = {
        data: {
          data: { id: 1, ...rescheduleData }
        }
      };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await mdtService.rescheduleMDTMeeting(1, rescheduleData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data.data);
      expect(apiClient.put).toHaveBeenCalledWith('/mdt/1/reschedule', rescheduleData);
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Invalid date'
          }
        }
      };
      apiClient.put.mockRejectedValue(error);

      const result = await mdtService.rescheduleMDTMeeting(1, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid date');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getPatientMDTMeetings', () => {
    it('should fetch patient MDT meetings successfully', async () => {
      const mockMeetings = [
        { id: 1, patient_id: 123, meeting_date: '2024-12-31' }
      ];
      const mockResponse = {
        data: {
          data: mockMeetings
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await mdtService.getPatientMDTMeetings(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMeetings);
      expect(apiClient.get).toHaveBeenCalledWith('/patients/123/mdt');
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Patient not found'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const result = await mdtService.getPatientMDTMeetings(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Patient not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const result = await mdtService.getPatientMDTMeetings(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getAllMDTMeetings', () => {
    it('should fetch all MDT meetings without filters', async () => {
      const mockMeetings = [{ id: 1 }, { id: 2 }];
      const mockResponse = {
        data: {
          data: mockMeetings
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await mdtService.getAllMDTMeetings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMeetings);
      expect(apiClient.get).toHaveBeenCalledWith('/mdt?');
      expect(console.log).toHaveBeenCalled();
    });

    it('should include status filter when provided', async () => {
      const mockResponse = {
        data: {
          data: []
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await mdtService.getAllMDTMeetings({ status: 'Scheduled' });

      expect(apiClient.get).toHaveBeenCalledWith('/mdt?status=Scheduled');
    });

    it('should include priority filter when provided', async () => {
      const mockResponse = {
        data: {
          data: []
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await mdtService.getAllMDTMeetings({ priority: 'High' });

      expect(apiClient.get).toHaveBeenCalledWith('/mdt?priority=High');
    });

    it('should include date filter when provided', async () => {
      const mockResponse = {
        data: {
          data: []
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await mdtService.getAllMDTMeetings({ date: '2024-12-31' });

      expect(apiClient.get).toHaveBeenCalledWith('/mdt?date=2024-12-31');
    });

    it('should include multiple filters', async () => {
      const mockResponse = {
        data: {
          data: []
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await mdtService.getAllMDTMeetings({
        status: 'Scheduled',
        priority: 'High',
        date: '2024-12-31'
      });

      const callUrl = apiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('status=Scheduled');
      expect(callUrl).toContain('priority=High');
      expect(callUrl).toContain('date=2024-12-31');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Server error'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const result = await mdtService.getAllMDTMeetings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('getMyMDTMeetings', () => {
    it('should fetch current user MDT meetings successfully', async () => {
      const mockMeetings = [{ id: 1 }, { id: 2 }];
      const mockResponse = {
        data: {
          data: mockMeetings
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await mdtService.getMyMDTMeetings();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMeetings);
      expect(apiClient.get).toHaveBeenCalledWith('/mdt/my');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Unauthorized'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const result = await mdtService.getMyMDTMeetings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const result = await mdtService.getMyMDTMeetings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('getMeetingById', () => {
    it('should fetch meeting by ID successfully', async () => {
      const mockMeeting = { id: 1, patient_id: 123 };
      const mockResponse = {
        data: {
          data: mockMeeting
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await mdtService.getMeetingById(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockMeeting);
      expect(apiClient.get).toHaveBeenCalledWith('/mdt/1');
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Meeting not found'
          }
        }
      };
      apiClient.get.mockRejectedValue(error);

      const result = await mdtService.getMeetingById(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Meeting not found');
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const result = await mdtService.getMeetingById(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('updateMDTMeetingStatus', () => {
    it('should update MDT meeting status successfully', async () => {
      const statusData = { status: 'Completed' };
      const mockResponse = {
        data: {
          data: { id: 1, status: 'Completed' }
        }
      };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await mdtService.updateMDTMeetingStatus(1, statusData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data.data);
      expect(apiClient.put).toHaveBeenCalledWith('/mdt/1/status', statusData);
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Invalid status',
            errors: []
          }
        }
      };
      apiClient.put.mockRejectedValue(error);

      const result = await mdtService.updateMDTMeetingStatus(1, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid status');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('deleteMDTMeeting', () => {
    it('should delete MDT meeting successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Meeting deleted'
        }
      };
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await mdtService.deleteMDTMeeting(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(apiClient.delete).toHaveBeenCalledWith('/mdt/1');
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Meeting not found',
            errors: []
          }
        }
      };
      apiClient.delete.mockRejectedValue(error);

      const result = await mdtService.deleteMDTMeeting(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Meeting not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.delete.mockRejectedValue(error);

      const result = await mdtService.deleteMDTMeeting(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });
});
