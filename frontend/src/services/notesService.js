import apiClient from '../config/axios';

export const notesService = {
  // Add a new note for a patient
  addNote: async (patientId, noteData) => {
    console.log('🔍 notesService: addNote called with:', { patientId, noteData });
    try {
      const response = await apiClient.post(`/patients/${patientId}/notes`, noteData);
      console.log('🔍 notesService: addNote response:', response);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('❌ notesService: Error adding note:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get all notes for a patient
  getPatientNotes: async (patientId, params = {}) => {
    console.log('🔍 notesService: getPatientNotes called with:', { patientId, params });
    try {
      const response = await apiClient.get(`/patients/${patientId}/notes`, { params });
      console.log('🔍 notesService: getPatientNotes response:', response);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('❌ notesService: Error fetching patient notes:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Update a note
  updateNote: async (noteId, noteData) => {
    try {
      const response = await apiClient.put(`/notes/${noteId}`, noteData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating note:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Delete a note
  deleteNote: async (noteId) => {
    try {
      const response = await apiClient.delete(`/notes/${noteId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting note:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  }
};


