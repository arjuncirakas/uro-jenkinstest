import axios from '../config/axios';

class DepartmentAdminService {
  // KPI Methods
  async getAllKPIs(startDate = null, endDate = null) {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await axios.get('/kpi/all', { params });
      return response.data;
    } catch (error) {
      console.error('Get all KPIs error:', error);
      throw error;
    }
  }

  async getAverageWaitTime(startDate = null, endDate = null) {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await axios.get('/kpi/wait-time', { params });
      return response.data;
    } catch (error) {
      console.error('Get average wait time error:', error);
      throw error;
    }
  }

  async getActiveSurveillanceCompliance(startDate = null, endDate = null) {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await axios.get('/kpi/active-surveillance-compliance', { params });
      return response.data;
    } catch (error) {
      console.error('Get active surveillance compliance error:', error);
      throw error;
    }
  }

  async getDischargeToGPPercentage(startDate = null, endDate = null) {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await axios.get('/kpi/discharge-to-gp', { params });
      return response.data;
    } catch (error) {
      console.error('Get discharge to GP percentage error:', error);
      throw error;
    }
  }

  async getKPITrends(period = 'month', months = 12) {
    try {
      const response = await axios.get('/kpi/trends', {
        params: { period, months }
      });
      return response.data;
    } catch (error) {
      console.error('Get KPI trends error:', error);
      throw error;
    }
  }

  // Export Methods
  async getExportFields() {
    try {
      const response = await axios.get('/export/fields');
      return response.data;
    } catch (error) {
      console.error('Get export fields error:', error);
      throw error;
    }
  }

  async exportPatientsToCSV(fields = null, filters = {}) {
    try {
      const params = { ...filters };
      if (fields && fields.length > 0) {
        params.fields = fields.join(',');
      }
      
      const response = await axios.get('/export/patients/csv', {
        params,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `patients_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Export patients to CSV error:', error);
      throw error;
    }
  }

  async exportPatientsToExcel(fields = null, filters = {}) {
    try {
      const params = { ...filters };
      if (fields && fields.length > 0) {
        params.fields = fields.join(',');
      }
      
      const response = await axios.get('/export/patients/excel', {
        params,
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `patients_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Export patients to Excel error:', error);
      throw error;
    }
  }
}

export default new DepartmentAdminService();

