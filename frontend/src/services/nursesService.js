import axios from '../config/axios.js';

export const nursesService = {
  // Get all Nurses
  async getAllNurses(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.is_active !== undefined) {
        queryParams.append('is_active', params.is_active);
      }
      
      const queryString = queryParams.toString();
      const url = `/nurses${queryString ? `?${queryString}` : ''}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching nurses:', error);
      throw error;
    }
  },

  // Get Nurse by ID
  async getNurseById(id) {
    try {
      const response = await axios.get(`/nurses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching nurse:', error);
      throw error;
    }
  },

  // Create new Nurse
  async createNurse(nurseData) {
    try {
      const response = await axios.post('/nurses', nurseData);
      return response.data;
    } catch (error) {
      console.error('Error creating nurse:', error);
      throw error;
    }
  },

  // Update Nurse
  async updateNurse(id, nurseData) {
    try {
      const response = await axios.put(`/nurses/${id}`, nurseData);
      return response.data;
    } catch (error) {
      console.error('Error updating nurse:', error);
      throw error;
    }
  },

  // Delete Nurse
  async deleteNurse(id) {
    try {
      const response = await axios.delete(`/nurses/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting nurse:', error);
      throw error;
    }
  }
};

