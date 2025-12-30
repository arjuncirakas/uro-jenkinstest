import React, { useState } from 'react';
import { IoClose, IoCalendar, IoDocument, IoCloudUpload } from 'react-icons/io5';
import { investigationService } from '../../services/investigationService';

const AddTestResultModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [formData, setFormData] = useState({
    testName: '',
    testDate: '',
    notes: ''
  });
  const [testFile, setTestFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const testNames = [
    { value: 'mri', label: 'MRI' },
    { value: 'trus', label: 'TRUS' },
    { value: 'biopsy', label: 'Biopsy' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
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
      // Validate file type (image formats not supported due to reverse proxy limitations)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          file: 'Please select a PDF, DOC, or DOCX file. Image files are not supported.'
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

  const validateForm = () => {
    const newErrors = {};

    if (!formData.testName) {
      newErrors.testName = 'Test name is required';
    }

    if (!formData.testDate) {
      newErrors.testDate = 'Test date is required';
    }

    if (!testFile) {
      newErrors.file = 'Document attachment is required';
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
        testFile: testFile
      };

      const result = await investigationService.addOtherTestResult(patient.id, submitData);

      if (result.success) {
        onSuccess('Test result added successfully!');
        setFormData({
          testName: '',
          testDate: '',
          notes: ''
        });
        setTestFile(null);

        // Trigger custom event to refresh tables
        const refreshEvent = new CustomEvent('testResultAdded', {
          detail: {
            patientId: patient.id,
            testName: formData.testName,
            testDate: formData.testDate
          }
        });
        window.dispatchEvent(refreshEvent);

        onClose();
      } else {
        setErrors({ submit: result.error || 'Failed to add test result' });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
      console.error('Error adding test result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IoDocument className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Add Test Result</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <IoClose className="w-6 h-6" />
            </button>
          </div>
          <p className="text-blue-100 mt-1">for {patient?.fullName || patient?.name || 'Patient'}</p>
        </div>

        {/* Form - Scrollable Content */}
        <form id="test-result-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Test Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Name *
              </label>
              <select
                name="testName"
                value={formData.testName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.testName ? 'border-red-500' : 'border-gray-300'
                  }`}
              >
                <option value="">Select test name</option>
                {testNames.map(test => (
                  <option key={test.value} value={test.value}>
                    {test.label}
                  </option>
                ))}
              </select>
              {errors.testName && (
                <p className="text-red-500 text-sm mt-1">{errors.testName}</p>
              )}
            </div>

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
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.testDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                />
                <IoCalendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.testDate && (
                <p className="text-red-500 text-sm mt-1">{errors.testDate}</p>
              )}
            </div>


            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attach Document *
              </label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${errors.file
                  ? 'border-red-500 bg-red-50'
                  : testFile
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400'
                }`}>
                <input
                  type="file"
                  id="testFile"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                />
                <label htmlFor="testFile" className="cursor-pointer block">
                  <IoCloudUpload className={`w-8 h-8 mx-auto mb-2 ${errors.file ? 'text-red-500' : testFile ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                  <p className={`text-sm ${errors.file ? 'text-red-600' : testFile ? 'text-blue-700 font-medium' : 'text-gray-600'
                    }`}>
                    {testFile ? testFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX up to 10MB
                  </p>
                </label>
              </div>
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
                placeholder="Additional notes about the test result..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="test-result-form"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isSubmitting ? 'Adding...' : 'Add Test Result'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTestResultModal;

