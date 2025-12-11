import React, { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Filter, CheckSquare, Square } from 'lucide-react';
import departmentAdminService from '../../services/departmentAdminService';
import SuccessModal from '../../components/modals/SuccessModal';
import ErrorModal from '../../components/modals/ErrorModal';

const DataExport = () => {
  const [loading, setLoading] = useState(false);
  const [exportFields, setExportFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    carePathway: '',
    status: ''
  });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchExportFields();
  }, []);

  const fetchExportFields = async () => {
    try {
      const result = await departmentAdminService.getExportFields();
      if (result.success) {
        setExportFields(result.data.fields);
        // Select all fields by default
        setSelectedFields(result.data.fields.map(f => f.id));
      }
    } catch (error) {
      console.error('Error fetching export fields:', error);
      setErrorMessage('Failed to load export fields');
      setIsErrorModalOpen(true);
    }
  };

  const handleFieldToggle = (fieldId) => {
    setSelectedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedFields.length === exportFields.length) {
      setSelectedFields([]);
    } else {
      setSelectedFields(exportFields.map(f => f.id));
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExport = async (format) => {
    if (selectedFields.length === 0) {
      setErrorMessage('Please select at least one field to export');
      setIsErrorModalOpen(true);
      return;
    }

    try {
      setLoading(true);
      
      // Build filters object (only include non-empty filters)
      const exportFilters = {};
      if (filters.startDate) exportFilters.startDate = filters.startDate;
      if (filters.endDate) exportFilters.endDate = filters.endDate;
      if (filters.carePathway) exportFilters.carePathway = filters.carePathway;
      if (filters.status) exportFilters.status = filters.status;

      if (format === 'csv') {
        await departmentAdminService.exportPatientsToCSV(selectedFields, exportFilters);
        setSuccessMessage('Patient data exported to CSV successfully');
        setIsSuccessModalOpen(true);
      } else if (format === 'excel') {
        await departmentAdminService.exportPatientsToExcel(selectedFields, exportFilters);
        setSuccessMessage('Patient data exported to Excel successfully');
        setIsSuccessModalOpen(true);
      }
    } catch (error) {
      console.error('Export error:', error);
      
      // Handle blob error responses (when responseType is 'blob', errors are also blobs)
      let errorMessage = 'Failed to export data';
      
      if (error.response?.data) {
        // Check if the error response is a Blob
        if (error.response.data instanceof Blob) {
          try {
            // Convert blob to text and parse as JSON
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorData.error || 'Failed to export data';
          } catch (parseError) {
            console.error('Error parsing blob error response:', parseError);
            errorMessage = 'Failed to export data';
          }
        } else {
          // Standard JSON error response
          errorMessage = error.response.data.message || error.response.data.error || 'Failed to export data';
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrorMessage(errorMessage);
      setIsErrorModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Group fields by category
  const groupedFields = exportFields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {});

  const categoryLabels = {
    'basic': 'Basic Information',
    'contact': 'Contact Information',
    'clinical': 'Clinical Information',
    'medical': 'Medical History',
    'system': 'System Information'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Export</h1>
        <p className="text-gray-600 mt-1">Export patient data for research and public health planning</p>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 text-teal-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Care Pathway</label>
            <select
              value={filters.carePathway}
              onChange={(e) => handleFilterChange('carePathway', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Pathways</option>
              <option value="OPD Queue">OPD Queue</option>
              <option value="Active Monitoring">Active Monitoring</option>
              <option value="Active Surveillance">Active Surveillance</option>
              <option value="Surgery Pathway">Surgery Pathway</option>
              <option value="Medication">Medication</option>
              <option value="Discharge">Discharge</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Field Selection Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CheckSquare className="w-5 h-5 text-teal-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Select Fields to Export</h2>
          </div>
          <button
            onClick={handleSelectAll}
            className="px-4 py-2 text-sm font-medium text-teal-600 hover:text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-50"
          >
            {selectedFields.length === exportFields.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-6">
          {Object.entries(groupedFields).map(([category, fields]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {categoryLabels[category] || category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {fields.map(field => (
                  <label
                    key={field.id}
                    className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field.id)}
                      onChange={() => handleFieldToggle(field.id)}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Export Options</h2>
            <p className="text-sm text-gray-600">
              Selected {selectedFields.length} of {exportFields.length} fields
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleExport('csv')}
              disabled={loading || selectedFields.length === 0}
              className="flex items-center px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-5 h-5 mr-2" />
              Export to CSV
            </button>
            <button
              onClick={() => handleExport('excel')}
              disabled={loading || selectedFields.length === 0}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <FileSpreadsheet className="w-5 h-5 mr-2" />
              Export to Excel
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        title="Export Successful"
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={() => setIsErrorModalOpen(false)}
        title="Export Failed"
        message={errorMessage}
      />
    </div>
  );
};

export default DataExport;

