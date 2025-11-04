import apiClient from '../config/axios';

export const mdtService = {
  // Schedule MDT meeting for a patient
  scheduleMDTMeeting: async (patientId, mdtData) => {
    try {
      console.log('🔍 mdtService: scheduleMDTMeeting called with:', { patientId, mdtData });
      const response = await apiClient.post(`/patients/${patientId}/mdt`, mdtData);
      console.log('🔍 mdtService: scheduleMDTMeeting response:', response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error scheduling MDT meeting:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Save MDT notes/details for a meeting
  saveMDTNotes: async (meetingId, notesData) => {
    try {
      const response = await apiClient.put(`/mdt/${meetingId}/notes`, notesData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error saving MDT notes:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Reschedule MDT meeting (update date/time)
  rescheduleMDTMeeting: async (meetingId, rescheduleData) => {
    try {
      const response = await apiClient.put(`/mdt/${meetingId}/reschedule`, rescheduleData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error rescheduling MDT meeting:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get MDT meetings for a patient
  getPatientMDTMeetings: async (patientId) => {
    try {
      console.log('🔍 mdtService: getPatientMDTMeetings called with:', { patientId });
      const response = await apiClient.get(`/patients/${patientId}/mdt`);
      console.log('🔍 mdtService: getPatientMDTMeetings response:', response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching patient MDT meetings:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get all MDT meetings
  getAllMDTMeetings: async (filters = {}) => {
    try {
      console.log('🔍 mdtService: getAllMDTMeetings called with:', { filters });
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.date) params.append('date', filters.date);
      
      const response = await apiClient.get(`/mdt?${params.toString()}`);
      console.log('🔍 mdtService: getAllMDTMeetings response:', response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching all MDT meetings:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get MDT meetings for current authenticated user
  getMyMDTMeetings: async () => {
    try {
      const response = await apiClient.get('/mdt/my');
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  // Get single MDT meeting by id
  getMeetingById: async (meetingId) => {
    try {
      const response = await apiClient.get(`/mdt/${meetingId}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  },

  // Update MDT meeting status
  updateMDTMeetingStatus: async (meetingId, statusData) => {
    try {
      console.log('🔍 mdtService: updateMDTMeetingStatus called with:', { meetingId, statusData });
      const response = await apiClient.put(`/mdt/${meetingId}/status`, statusData);
      console.log('🔍 mdtService: updateMDTMeetingStatus response:', response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating MDT meeting status:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Delete MDT meeting
  deleteMDTMeeting: async (meetingId) => {
    try {
      console.log('🔍 mdtService: deleteMDTMeeting called with:', { meetingId });
      const response = await apiClient.delete(`/mdt/${meetingId}`);
      console.log('🔍 mdtService: deleteMDTMeeting response:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error deleting MDT meeting:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  }
};

