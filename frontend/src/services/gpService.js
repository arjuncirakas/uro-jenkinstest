import apiClient, { handleApiError } from '../config/axios.js';

class GPService {
  // Get all referred patients (patients under urology care)
  async getReferredPatients() {
    try {
      const response = await apiClient.get('/patients/list');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Get patients under active monitoring
  async getActiveMonitoringPatients() {
    try {
      const response = await apiClient.get('/patients/list', {
        params: {
          carePathway: 'Active Monitoring'
        }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Get patients under medication pathway
  async getMedicationPatients() {
    try {
      const response = await apiClient.get('/patients/list', {
        params: {
          carePathway: 'Medication'
        }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Get patients under active monitoring OR medication pathways (combined)
  async getActiveMonitoringAndMedicationPatients() {
    try {
      // Fetch both pathways
      const [monitoringResponse, medicationResponse] = await Promise.all([
        apiClient.get('/patients/list', { params: { carePathway: 'Active Monitoring' } }),
        apiClient.get('/patients/list', { params: { carePathway: 'Medication' } })
      ]);
      
      // Combine the results
      const monitoringPatients = monitoringResponse.data?.data?.patients || [];
      const medicationPatients = medicationResponse.data?.data?.patients || [];
      
      return {
        success: true,
        data: {
          patients: [...monitoringPatients, ...medicationPatients]
        }
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Get recent referrals (new patients)
  async getRecentReferrals() {
    try {
      const response = await apiClient.get('/patients/new');
      // Backend already wraps data properly, just return it
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Get patient by ID
  async getPatientById(id) {
    try {
      const response = await apiClient.get(`/patients/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Search patients
  async searchPatients(searchTerm) {
    try {
      const response = await apiClient.get('/patients/search', {
        params: { query: searchTerm }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Get dashboard stats (custom for GP)
  async getDashboardStats() {
    try {
      // Get all patients to compute stats
      const response = await apiClient.get('/patients/list');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

// Create and export singleton instance
const gpService = new GPService();
export default gpService;

