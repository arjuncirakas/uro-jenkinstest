import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notesService } from '../notesService';
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

describe('notesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('addNote', () => {
    it('should add note successfully', async () => {
      const noteData = {
        note_content: 'Patient follow-up required',
        note_type: 'clinical'
      };
      const mockResponse = {
        data: {
          data: { id: 1, ...noteData }
        }
      };
      apiClient.post.mockResolvedValue(mockResponse);

      const result = await notesService.addNote(123, noteData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data.data);
      expect(apiClient.post).toHaveBeenCalledWith('/patients/123/notes', noteData);
      expect(console.log).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Validation failed',
            errors: ['Note content is required']
          }
        }
      };
      apiClient.post.mockRejectedValue(error);

      const result = await notesService.addNote(123, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toEqual(['Note content is required']);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.post.mockRejectedValue(error);

      const result = await notesService.addNote(123, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle errors without response', async () => {
      const error = { message: 'Request failed' };
      apiClient.post.mockRejectedValue(error);

      const result = await notesService.addNote(123, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request failed');
    });
  });

  describe('getPatientNotes', () => {
    it('should fetch patient notes without params', async () => {
      const mockNotes = [
        { id: 1, note_content: 'Note 1' },
        { id: 2, note_content: 'Note 2' }
      ];
      const mockResponse = {
        data: {
          data: mockNotes
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      const result = await notesService.getPatientNotes(123);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNotes);
      expect(apiClient.get).toHaveBeenCalledWith('/patients/123/notes', { params: {} });
      expect(console.log).toHaveBeenCalled();
    });

    it('should include params when provided', async () => {
      const mockResponse = {
        data: {
          data: []
        }
      };
      apiClient.get.mockResolvedValue(mockResponse);

      await notesService.getPatientNotes(123, { note_type: 'clinical', limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith('/patients/123/notes', {
        params: { note_type: 'clinical', limit: 10 }
      });
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

      const result = await notesService.getPatientNotes(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Patient not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.get.mockRejectedValue(error);

      const result = await notesService.getPatientNotes(123);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('updateNote', () => {
    it('should update note successfully', async () => {
      const noteData = { note_content: 'Updated note' };
      const mockResponse = {
        data: {
          data: { id: 1, ...noteData }
        }
      };
      apiClient.put.mockResolvedValue(mockResponse);

      const result = await notesService.updateNote(1, noteData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data.data);
      expect(apiClient.put).toHaveBeenCalledWith('/notes/1', noteData);
    });

    it('should handle errors gracefully', async () => {
      const error = {
        response: {
          data: {
            message: 'Note not found',
            errors: []
          }
        }
      };
      apiClient.put.mockRejectedValue(error);

      const result = await notesService.updateNote(999, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Note not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      apiClient.put.mockRejectedValue(error);

      const result = await notesService.updateNote(1, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('deleteNote', () => {
    it('should delete note successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          message: 'Note deleted'
        }
      };
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await notesService.deleteNote(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(apiClient.delete).toHaveBeenCalledWith('/notes/1');
    });

    it('should handle API response with success false', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'Cannot delete note',
          errors: ['Note is locked']
        }
      };
      apiClient.delete.mockResolvedValue(mockResponse);

      const result = await notesService.deleteNote(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete note');
      expect(result.details).toEqual(['Note is locked']);
    });

    it('should handle errors with response.data.message', async () => {
      const error = {
        response: {
          data: {
            message: 'Note not found'
          }
        }
      };
      apiClient.delete.mockRejectedValue(error);

      const result = await notesService.deleteNote(999);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Note not found');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle errors with response.data.error', async () => {
      const error = {
        response: {
          data: {
            error: 'Permission denied'
          }
        }
      };
      apiClient.delete.mockRejectedValue(error);

      const result = await notesService.deleteNote(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should handle errors with error.message', async () => {
      const error = {
        message: 'Network error'
      };
      apiClient.delete.mockRejectedValue(error);

      const result = await notesService.deleteNote(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle errors without message', async () => {
      const error = {};
      apiClient.delete.mockRejectedValue(error);

      const result = await notesService.deleteNote(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete note');
    });

    it('should handle errors with details', async () => {
      const error = {
        response: {
          data: {
            message: 'Validation failed',
            errors: ['Invalid note ID']
          }
        }
      };
      apiClient.delete.mockRejectedValue(error);

      const result = await notesService.deleteNote(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.details).toEqual(['Invalid note ID']);
    });
  });
});
