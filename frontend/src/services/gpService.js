import axios from '../config/axios.js';

export const gpService = {
  // Get all GPs
  async getAllGPs(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.is_active !== undefined) {
        queryParams.append('is_active', params.is_active);
      }
      
      const queryString = queryParams.toString();
      const url = `/gp${queryString ? `?${queryString}` : ''}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching GPs:', error);
      throw error;
    }
  },

  // Get GP by ID
  async getGPById(id) {
    try {
      const response = await axios.get(`/gp/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching GP:', error);
      throw error;
    }
  },

  // Create new GP
  async createGP(gpData) {
    try {
      const response = await axios.post('/gp', gpData);
      return response.data;
    } catch (error) {
      console.error('Error creating GP:', error);
      throw error;
    }
  },

  // Update GP
  async updateGP(id, gpData) {
    try {
      const response = await axios.put(`/gp/${id}`, gpData);
      return response.data;
    } catch (error) {
      console.error('Error updating GP:', error);
      throw error;
    }
  },

  // Delete GP
  async deleteGP(id) {
    try {
      const response = await axios.delete(`/gp/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting GP:', error);
      throw error;
    }
  },

  // Get recent referrals (new patients)
  async getRecentReferrals(limit = 20) {
    try {
      const response = await axios.get(`/patients/new?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent referrals:', error);
      throw error;
    }
  },

  // Get all referred patients
  async getReferredPatients(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', params.status || 'Active');
      if (params.search) {
        queryParams.append('search', params.search);
      }
      if (params.page) {
        queryParams.append('page', params.page);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit);
      }
      
      const queryString = queryParams.toString();
      const url = `/patients/list${queryString ? `?${queryString}` : ''}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching referred patients:', error);
      throw error;
    }
  },

  // Get active monitoring patients
  async getActiveMonitoringPatients(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', params.status || 'Active');
      queryParams.append('carePathway', 'Active Monitoring');
      if (params.search) {
        queryParams.append('search', params.search);
      }
      if (params.page) {
        queryParams.append('page', params.page);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit);
      }
      
      const queryString = queryParams.toString();
      const url = `/patients/list${queryString ? `?${queryString}` : ''}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching active monitoring patients:', error);
      throw error;
    }
  },

  // Get medication patients
  async getMedicationPatients(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', params.status || 'Active');
      queryParams.append('carePathway', 'Medication');
      if (params.search) {
        queryParams.append('search', params.search);
      }
      if (params.page) {
        queryParams.append('page', params.page);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit);
      }
      
      const queryString = queryParams.toString();
      const url = `/patients/list${queryString ? `?${queryString}` : ''}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching medication patients:', error);
      throw error;
    }
  },

  // Get active monitoring and medication patients
  async getActiveMonitoringAndMedicationPatients(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('status', params.status || 'Active');
      if (params.search) {
        queryParams.append('search', params.search);
      }
      if (params.page) {
        queryParams.append('page', params.page);
      }
      if (params.limit) {
        queryParams.append('limit', params.limit);
      }
      
      const queryString = queryParams.toString();
      const url = `/patients/list${queryString ? `?${queryString}` : ''}`;
      const response = await axios.get(url);
      
      // Filter to only include Active Monitoring and Medication patients
      if (response.data && response.data.data && response.data.data.patients) {
        const filteredPatients = response.data.data.patients.filter(
          patient => patient.carePathway === 'Active Monitoring' || patient.carePathway === 'Medication'
        );
        return {
          ...response.data,
          data: {
            ...response.data.data,
            patients: filteredPatients
          }
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching active monitoring and medication patients:', error);
      throw error;
    }
  }
};
