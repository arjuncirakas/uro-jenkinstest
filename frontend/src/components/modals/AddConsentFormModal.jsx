import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, ChevronDown } from 'lucide-react';
import PropTypes from 'prop-types';
import { consentFormService } from '../../services/consentFormService';

const AddConsentFormModal = ({ isOpen, onClose, onSuccess, template = null }) => {
  const [formData, setFormData] = useState({
    procedure_name: '',
    template_file: null
  });
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Populate form if editing
  useEffect(() => {
    if (template) {
      setFormData({
        procedure_name: template.procedure_name || template.test_name || '',
        template_file: null
      });
      // Set the current file name if editing and template has a file
      const currentFileName = template.template_file_name || template.file_name || '';
      setFileName(currentFileName);
    } else {
      resetForm();
    }
  }, [template]);

  const resetForm = () => {
    setFormData({
      procedure_name: '',
      template_file: null
    });
    setFileName('');
    setError('');
  };


  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFormData(prev => ({ ...prev, template_file: file }));
      setFileName(file.name);
      setError('');
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFormData(prev => ({ ...prev, template_file: null }));
    setFileName(template && template.template_file_name ? template.template_file_name : '');
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.procedure_name.trim()) {
      setError('Procedure name is required');
      return;
    }

    if (!formData.template_file && !template) {
      setError('Template file is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        procedure_name: formData.procedure_name,
        test_name: '', // Always empty since everything is a procedure
        is_auto_generated: false,
        template_file: formData.template_file
      };

      let response;
      if (template) {
        response = await consentFormService.updateConsentFormTemplate(template.id, submitData);
      } else {
        response = await consentFormService.createConsentFormTemplate(submitData);
      }

      if (response.success) {
        onSuccess();
        handleClose();
      } else {
        setError(response.error || 'Operation failed');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setIsDropdownOpen(false);
    onClose();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Procedure options
  const procedureOptions = [
    { group: 'MRI', value: 'MRI', label: 'MRI' },
    { group: 'MRI', value: 'MRI Prostate', label: 'MRI Prostate' },
    { group: 'MRI', value: 'MRI Pelvis', label: 'MRI Pelvis' },
    { group: 'MRI', value: 'MRI Abdomen', label: 'MRI Abdomen' },
    { group: 'MRI', value: 'Multi-parametric MRI', label: 'Multi-parametric MRI' },
    { group: 'TRUS', value: 'TRUS', label: 'TRUS' },
    { group: 'TRUS', value: 'TRUS Prostate', label: 'TRUS Prostate' },
    { group: 'TRUS', value: 'TRUS Guided Biopsy', label: 'TRUS Guided Biopsy' },
    { group: 'TRUS', value: 'TRUS Volume Assessment', label: 'TRUS Volume Assessment' },
    { group: 'Biopsy', value: 'Biopsy', label: 'Biopsy' },
    { group: 'Biopsy', value: 'Prostate Biopsy', label: 'Prostate Biopsy' },
    { group: 'Biopsy', value: 'Transperineal Biopsy', label: 'Transperineal Biopsy' },
    { group: 'Biopsy', value: 'Transrectal Biopsy', label: 'Transrectal Biopsy' },
    { group: 'Biopsy', value: 'Fusion Biopsy', label: 'Fusion Biopsy' },
    { group: 'Biopsy', value: 'Template Biopsy', label: 'Template Biopsy' },
  ];

  const selectedProcedure = procedureOptions.find(opt => opt.value === formData.procedure_name);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {template ? 'Edit' : 'Add New'} Consent Form Template
              </h2>
              <p className="text-sm text-gray-500">
                {template ? 'Update template details' : 'Create a new consent form template'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Procedure Name */}
          <div className="relative z-20" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Procedure Name *
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white text-left flex items-center justify-between"
            >
              <span className={formData.procedure_name ? 'text-gray-900' : 'text-gray-500'}>
                {selectedProcedure ? selectedProcedure.label : 'Select a procedure'}
              </span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {/* MRI Group */}
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">MRI</span>
                </div>
                {procedureOptions.filter(opt => opt.group === 'MRI').map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, procedure_name: option.value }));
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-teal-50 transition-colors ${
                      formData.procedure_name === option.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                
                {/* TRUS Group */}
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 border-t border-gray-200 sticky top-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">TRUS</span>
                </div>
                {procedureOptions.filter(opt => opt.group === 'TRUS').map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, procedure_name: option.value }));
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-teal-50 transition-colors ${
                      formData.procedure_name === option.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                
                {/* Biopsy Group */}
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 border-t border-gray-200 sticky top-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Biopsy</span>
                </div>
                {procedureOptions.filter(opt => opt.group === 'Biopsy').map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, procedure_name: option.value }));
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-teal-50 transition-colors ${
                      formData.procedure_name === option.value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Template File (PDF) {!template && '*'}
            </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <label className="cursor-pointer">
                  <span className="text-teal-600 hover:text-teal-700 font-medium">
                    {template && !formData.template_file ? 'Click to upload new file' : 'Choose a file'}
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                <p className="text-xs text-gray-400 mt-2">PDF up to 10MB</p>
                {fileName && (
                  <div className="mt-3 flex items-center justify-center">
                    {template && !formData.template_file ? (
                      <div className="text-sm text-gray-700 bg-blue-50 px-3 py-2 rounded inline-flex flex-col items-center gap-1 border border-blue-200">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span className="text-blue-900">Current file: {fileName}</span>
                        </div>
                        <p className="text-xs text-blue-700">Upload a new file to replace it</p>
                      </div>
                    ) : formData.template_file ? (
                      <div className="text-sm text-gray-700 bg-teal-50 px-3 py-2 rounded inline-flex items-center gap-2 border border-teal-200">
                        <FileText className="h-4 w-4 text-teal-600" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-teal-900">{fileName}</span>
                          <span className="text-xs text-teal-700">{(formData.template_file.size / 1024).toFixed(2)} KB</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="ml-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded p-1 transition-colors"
                          title="Remove file"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded inline-block">
                        {fileName}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AddConsentFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  template: PropTypes.object
};

export default AddConsentFormModal;
