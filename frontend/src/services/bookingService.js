import apiClient from '../config/axios';

export const bookingService = {
  // Book urologist appointment
  bookUrologistAppointment: async (patientId, appointmentData) => {
    try {
      console.log('🚀 bookingService.bookUrologistAppointment called');
      console.log('📍 Patient ID:', patientId);
      console.log('📦 Appointment Data:', JSON.stringify(appointmentData, null, 2));
      console.log('🔗 Request URL:', `/booking/patients/${patientId}/appointments`);

      const response = await apiClient.post(`/booking/patients/${patientId}/appointments`, appointmentData);

      console.log('✅ Booking successful, response:', response.data);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('❌ Error booking urologist appointment:', error);
      console.error('❌ Error response data:', error.response?.data);
      console.error('❌ Error response status:', error.response?.status);
      console.error('❌ Error response headers:', error.response?.headers);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Update appointment (for rescheduling existing appointments)
  updateAppointment: async (appointmentId, appointmentData) => {
    try {
      const response = await apiClient.put(`/booking/appointments/${appointmentId}`, appointmentData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating appointment:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Book investigation
  bookInvestigation: async (patientId, investigationData) => {
    try {
      const response = await apiClient.post(`/booking/patients/${patientId}/investigations`, investigationData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error booking investigation:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get patient appointments
  getPatientAppointments: async (patientId, type = null) => {
    try {
      const params = type ? { type } : {};
      const response = await apiClient.get(`/booking/patients/${patientId}/appointments`, { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get patient investigation bookings
  getPatientInvestigationBookings: async (patientId, type = null) => {
    try {
      const params = type ? { type } : {};
      const response = await apiClient.get(`/booking/patients/${patientId}/investigation-bookings`, { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching patient investigation bookings:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get available urologists
  getAvailableUrologists: async () => {
    try {
      const response = await apiClient.get('/booking/urologists');
      console.log('Urologists API response:', response.data); // Debug log
      return { success: true, data: response.data.data.urologists || [] };
    } catch (error) {
      console.error('Error fetching urologists:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get available GPs
  getAvailableGPs: async () => {
    try {
      const response = await apiClient.get('/doctors/gps');
      console.log('GPs API response:', response.data); // Debug log
      return { success: true, data: response.data.data?.gps || response.data.data || [] };
    } catch (error) {
      console.error('Error fetching GPs:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get all available doctors (all specializations)
  getAvailableDoctors: async () => {
    try {
      const response = await apiClient.get('/booking/doctors');
      console.log('Doctors API response:', response.data); // Debug log
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get today's appointments
  getTodaysAppointments: async (type = null) => {
    try {
      const params = type ? { type } : {};
      const response = await apiClient.get('/booking/appointments/today', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching today\'s appointments:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get no-show patients
  getNoShowPatients: async (type = null) => {
    try {
      const params = type ? { type } : {};
      const response = await apiClient.get('/booking/no-show-patients', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching no-show patients:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Mark appointment as no-show
  markAsNoShow: async (appointmentId, noShowData) => {
    try {
      const response = await apiClient.put(`/booking/appointments/${appointmentId}/no-show`, noShowData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error marking appointment as no-show:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Add note to no-show patient
  addNoShowNote: async (appointmentId, noteData) => {
    try {
      const response = await apiClient.post(`/booking/appointments/${appointmentId}/notes`, noteData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error adding no-show note:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get notes for no-show patient
  getNoShowNotes: async (appointmentId, type) => {
    try {
      const response = await apiClient.get(`/booking/appointments/${appointmentId}/notes?type=${type}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching no-show notes:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Remove note from no-show patient
  removeNoShowNote: async (noteId) => {
    try {
      const response = await apiClient.delete(`/booking/notes/${noteId}`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error removing no-show note:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get available time slots for a doctor on a specific date
  getAvailableTimeSlots: async (doctorId, date, appointmentType = 'urologist') => {
    try {
      // Get client's timezone offset in minutes (e.g., -330 for IST)
      const timezoneOffset = new Date().getTimezoneOffset();

      const response = await apiClient.get(`/booking/doctors/${doctorId}/available-slots`, {
        params: {
          date,
          type: appointmentType,
          timezoneOffset // Send client timezone to backend
        }
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching available time slots:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  rescheduleNoShowAppointment: async (appointmentId, rescheduleData) => {
    try {
      const response = await apiClient.put(`/booking/appointments/${appointmentId}/reschedule`, rescheduleData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error rescheduling no-show appointment:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get all appointments for calendar view
  getAllAppointments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.urologistId) params.append('urologistId', filters.urologistId);
      if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());

      const response = await apiClient.get(`/booking/appointments?${params.toString()}`);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching all appointments:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Update appointment status (for marking reminders sent, etc.)
  updateAppointmentStatus: async (appointmentId, statusData) => {
    try {
      const response = await apiClient.patch(`/booking/appointments/${appointmentId}/status`, statusData);
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error updating appointment status:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  },

  // Get upcoming appointments
  getUpcomingAppointments: async (params = {}) => {
    try {
      const response = await apiClient.get('/booking/appointments/upcoming', { params });
      return { success: true, data: response.data.data };
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        details: error.response?.data?.errors
      };
    }
  }
};
