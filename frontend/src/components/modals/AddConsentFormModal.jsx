import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Sparkles } from 'lucide-react';
import { consentFormService } from '../../services/consentFormService';

const AddConsentFormModal = ({ isOpen, onClose, onSuccess, template = null }) => {
  const [formData, setFormData] = useState({
    procedure_name: '',
    test_name: '',
    is_auto_generated: true,
    template_file: null
  });
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [templateType, setTemplateType] = useState('procedure');

  // Populate form if editing
  useEffect(() => {
    if (template) {
      setFormData({
        procedure_name: template.procedure_name || '',
        test_name: template.test_name || '',
        is_auto_generated: template.is_auto_generated,
        template_file: null
      });
      setTemplateType(template.procedure_name ? 'procedure' : 'test');
      setFileName('');
    } else {
      resetForm();
    }
  }, [template]);

  const resetForm = () => {
    setFormData({
      procedure_name: '',
      test_name: '',
      is_auto_generated: true,
      template_file: null
    });
    setFileName('');
    setTemplateType('procedure');
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (templateType === 'procedure' && !formData.procedure_name.trim()) {
      setError('Procedure name is required');
      return;
    }
    if (templateType === 'test' && !formData.test_name.trim()) {
      setError('Test name is required');
      return;
    }

    if (!formData.is_auto_generated && !formData.template_file && !template) {
      setError('Template file is required when auto-generation is disabled');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        procedure_name: templateType === 'procedure' ? formData.procedure_name : '',
        test_name: templateType === 'test' ? formData.test_name : '',
        is_auto_generated: formData.is_auto_generated,
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Template Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTemplateType('procedure')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${templateType === 'procedure'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="font-medium">Procedure</div>
                <div className="text-xs text-gray-500">Surgical procedures</div>
              </button>
              <button
                type="button"
                onClick={() => setTemplateType('test')}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${templateType === 'test'
                    ? 'border-teal-600 bg-teal-50 text-teal-700'
                    : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="font-medium">Test</div>
                <div className="text-xs text-gray-500">Medical tests</div>
              </button>
            </div>
          </div>

          {/* Procedure/Test Name */}
          {templateType === 'procedure' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Procedure Name *
              </label>
              <input
                type="text"
                name="procedure_name"
                value={formData.procedure_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g., Transurethral Resection of Prostate"
                required
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Name *
              </label>
              <input
                type="text"
                name="test_name"
                value={formData.test_name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="e.g., PSA Blood Test"
                required
              />
            </div>
          )}

          {/* Auto-Generate Toggle */}
          <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <div>
                <div className="font-medium text-gray-900">Auto-Generate Template</div>
                <div className="text-sm text-gray-500">
                  Generate a standard template automatically
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_auto_generated}
                onChange={(e) => setFormData(prev => ({ ...prev, is_auto_generated: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* File Upload (if not auto-generated) */}
          {!formData.is_auto_generated && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Template File (PDF) {!template && '*'}
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                <label className="cursor-pointer">
                  <span className="text-teal-600 hover:text-teal-700 font-medium">
                    Choose a file
                  </span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 mt-1">or drag and drop</p>
                <p className="text-xs text-gray-400 mt-2">PDF up to 10MB</p>
                {fileName && (
                  <div className="mt-3 text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded inline-block">
                    {fileName}
                  </div>
                )}
              </div>
            </div>
          )}

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

export default AddConsentFormModal;
