import React, { useState, useEffect } from 'react';
import { IoClose, IoCalendar, IoFlask, IoCloudUpload, IoDocument, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { investigationService } from '../../services/investigationService';

const EditPSAResultModal = ({ isOpen, onClose, patient, psaResult, onSuccess }) => {
  const [formData, setFormData] = useState({
    testDate: '',
    result: '',
    notes: '',
    status: 'Normal'
  });
  const [testFile, setTestFile] = useState(null);
  const [existingFileName, setExistingFileName] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Initialize form with existing PSA result data
  useEffect(() => {
    if (psaResult && isOpen) {
      // Format date for input (YYYY-MM-DD)
      const testDate = psaResult.testDate || psaResult.test_date;
      const formattedDate = testDate ? (testDate.includes('T') ? testDate.split('T')[0] : testDate.split(' ')[0]) : '';
      
      setFormData({
        testDate: formattedDate,
        result: psaResult.result || '',
        notes: psaResult.notes || '',
        status: psaResult.status || 'Normal'
      });
      
      // Set existing file info if available
      if (psaResult.filePath || psaResult.file_path) {
        setExistingFileName(psaResult.fileName || psaResult.file_name || 'Existing file');
      } else {
        setExistingFileName(null);
      }
      setTestFile(null);
      setErrors({});
    }
  }, [psaResult, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-determine status based on PSA result
    let newStatus = 'Normal';
    if (name === 'result' && value) {
      const psaValue = parseFloat(value);
      if (!isNaN(psaValue)) {
        if (psaValue > 4.0) {
          newStatus = 'High';
        } else if (psaValue < 0.0) {
          newStatus = 'Low';
        } else {
          newStatus = 'Normal';
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
      status: name === 'result' ? newStatus : prev.status
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          file: 'Please select a PDF, DOC, DOCX, JPG, or PNG file'
        }));
        return;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          file: 'File size must be less than 10MB'
        }));
        return;
      }
      
      setTestFile(file);
      setErrors(prev => ({
        ...prev,
        file: ''
      }));
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setTestFile(null);
    // Reset the file input
    const fileInput = document.getElementById('editPsaFile');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.testDate) {
      newErrors.testDate = 'Test date is required';
    }
    
    if (!formData.result) {
      newErrors.result = 'PSA result is required';
    } else if (isNaN(parseFloat(formData.result))) {
      newErrors.result = 'PSA result must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        referenceRange: '0.0 - 4.0', // Default reference range
        testFile: testFile
      };
      
      const result = await investigationService.updatePSAResult(psaResult.id, submitData);
      
      if (result.success) {
        onSuccess('PSA result updated successfully!');
        
        // Trigger custom events to refresh tables
        const refreshEvent = new CustomEvent('testResultAdded', {
          detail: {
            patientId: patient.id,
            testName: 'psa',
            testDate: formData.testDate
          }
        });
        window.dispatchEvent(refreshEvent);
        
        // Also dispatch PSA-specific event for PatientList and InvestigationManagement
        const psaUpdatedEvent = new CustomEvent('psaResultUpdated', {
          detail: {
            patientId: patient.id,
            testName: 'psa',
            testDate: formData.testDate
          }
        });
        window.dispatchEvent(psaUpdatedEvent);
        
        onClose();
      } else {
        setErrors({ submit: result.error || 'Failed to update PSA result' });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
      console.error('Error updating PSA result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IoFlask className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Edit PSA Result</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <IoClose className="w-6 h-6" />
            </button>
          </div>
          <p className="text-teal-100 mt-1">for {patient?.fullName || patient?.name || 'Patient'}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Test Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="testDate"
                  value={formData.testDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    errors.testDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <IoCalendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.testDate && (
                <p className="text-red-500 text-sm mt-1">{errors.testDate}</p>
              )}
            </div>

            {/* PSA Result */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PSA Result (ng/mL) *
              </label>
              <input
                type="number"
                step="0.1"
                name="result"
                value={formData.result}
                onChange={handleInputChange}
                placeholder="e.g., 3.2"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                  errors.result ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.result && (
                <p className="text-red-500 text-sm mt-1">{errors.result}</p>
              )}
            </div>

            {/* Status - Auto-determined */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status (Auto-determined)
              </label>
              <div className={`w-full px-3 py-2 border rounded-lg bg-gray-50 ${
                formData.status === 'High' ? 'border-red-300 bg-red-50' :
                formData.status === 'Low' ? 'border-yellow-300 bg-yellow-50' :
                'border-green-300 bg-green-50'
              }`}>
                <span className={`font-medium ${
                  formData.status === 'High' ? 'text-red-700' :
                  formData.status === 'Low' ? 'text-yellow-700' :
                  'text-green-700'
                }`}>
                  {formData.status}
                </span>
                <span className="text-sm text-gray-600 ml-2">
                  {formData.status === 'High' ? '(PSA > 4.0 ng/mL)' :
                   formData.status === 'Low' ? '(PSA < 0.0 ng/mL)' :
                   '(PSA 0.0 - 4.0 ng/mL)'}
                </span>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach PSA Report (Optional)
              </label>
              {existingFileName && !testFile && (
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <IoDocument className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-900">Current file: {existingFileName}</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">Upload a new file to replace it</p>
                </div>
              )}
              {testFile ? (
                // Show attached file
                <div className="border-2 border-teal-400 bg-teal-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <IoDocument className="w-6 h-6 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-teal-900 truncate">
                          {testFile.name}
                        </p>
                        <p className="text-xs text-teal-700 mt-0.5">
                          {formatFileSize(testFile.size)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        <IoCheckmarkCircle className="w-5 h-5 text-green-500" />
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="Remove file"
                        >
                          <IoCloseCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Show upload area
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-teal-400 transition-colors">
                  <input
                    type="file"
                    id="editPsaFile"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                  <label htmlFor="editPsaFile" className="cursor-pointer block">
                    <IoCloudUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {existingFileName ? 'Click to upload new file' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX, JPG, PNG up to 10MB
                    </p>
                  </label>
                </div>
              )}
              {errors.file && (
                <p className="text-red-500 text-sm mt-1">{errors.file}</p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes about the PSA result..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              />
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isSubmitting ? 'Updating...' : 'Update PSA Result'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPSAResultModal;

