import axios from '../config/axios.js';

export const doctorsService = {
  // Get all doctors
  async getAllDoctors(params = {}) {
    try {
      const response = await axios.get('/doctors', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  },

  // Get doctor by ID
  async getDoctorById(id) {
    try {
      const response = await axios.get(`/doctors/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching doctor:', error);
      throw error;
    }
  },

  // Create new doctor
  async createDoctor(doctorData) {
    try {
      const response = await axios.post('/doctors', doctorData);
      return response.data;
    } catch (error) {
      console.error('Error creating doctor:', error);
      throw error;
    }
  },

  // Update doctor
  async updateDoctor(id, doctorData) {
    try {
      const response = await axios.put(`/doctors/${id}`, doctorData);
      return response.data;
    } catch (error) {
      console.error('Error updating doctor:', error);
      throw error;
    }
  },

  // Delete doctor
  async deleteDoctor(id) {
    try {
      const response = await axios.delete(`/doctors/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting doctor:', error);
      throw error;
    }
  },

  // Get all departments
  async getAllDepartments(params = {}) {
    try {
      const response = await axios.get('/departments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  },

  // Create new department
  async createDepartment(departmentData) {
    try {
      const response = await axios.post('/departments', departmentData);
      return response.data;
    } catch (error) {
      console.error('Error creating department:', error);
      throw error;
    }
  },

  // Update department
  async updateDepartment(id, departmentData) {
    try {
      const response = await axios.put(`/departments/${id}`, departmentData);
      return response.data;
    } catch (error) {
      console.error('Error updating department:', error);
      throw error;
    }
  },

  // Delete department
  async deleteDepartment(id) {
    try {
      const response = await axios.delete(`/departments/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting department:', error);
      throw error;
    }
  },

  // Format doctor name for display
  formatDoctorName(doctor) {
    const name = `${doctor.first_name} ${doctor.last_name}`;
    const specialization = doctor.specialization || doctor.department_name;
    return specialization ? `${name} (${specialization})` : name;
  },

  // Get doctors formatted for dropdown
  async getDoctorsForDropdown() {
    try {
      console.log('Fetching doctors for dropdown...');
      const response = await this.getAllDoctors({ is_active: true });
      console.log('Raw doctors response:', response);
      
      if (response.success) {
        const formattedDoctors = response.data.map(doctor => ({
          id: doctor.id,
          name: this.formatDoctorName(doctor),
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          specialization: doctor.specialization,
          department_name: doctor.department_name,
          email: doctor.email,
          phone: doctor.phone
        }));
        console.log('Formatted doctors for dropdown:', formattedDoctors);
        return formattedDoctors;
      }
      console.log('No doctors found or error in response');
      return [];
    } catch (error) {
      console.error('Error fetching doctors for dropdown:', error);
      return [];
    }
  }
};
