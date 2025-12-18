import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Sparkles, ChevronDown } from 'lucide-react';
import { consentFormService } from '../../services/consentFormService';

const AddConsentFormModal = ({ isOpen, onClose, onSuccess, template = null }) => {
  const [formData, setFormData] = useState({
    procedure_name: '',
    is_auto_generated: false,
    template_file: null
  });
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Populate form if editing
  useEffect(() => {
    if (template) {
      setFormData({
        procedure_name: template.procedure_name || template.test_name || '',
        is_auto_generated: template.is_auto_generated,
        template_file: null
      });
      setFileName('');
    } else {
      resetForm();
    }
  }, [template]);

  const resetForm = () => {
    setFormData({
      procedure_name: '',
      is_auto_generated: false,
      template_file: null
    });
    setFileName('');
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
    if (!formData.procedure_name.trim()) {
      setError('Procedure name is required');
      return;
    }

    if (!formData.is_auto_generated && !formData.template_file && !template) {
      setError('Template file is required when auto-generation is disabled');
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        procedure_name: formData.procedure_name,
        test_name: '', // Always empty since everything is a procedure
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

          {/* Preview Auto-Generated Form */}
          {formData.is_auto_generated && formData.procedure_name && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
                <button
                  type="button"
                  onClick={() => {
                    const previewWindow = window.open('', '_blank');
                    const name = formData.procedure_name;
                    const htmlContent = `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <title>${name} Consent Form</title>
                        <style>
                          @media print {
                            @page { margin: 20mm; }
                            body { margin: 0; }
                          }
                          body {
                            font-family: 'Arial', sans-serif;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 40px;
                            background: white;
                          }
                          .header {
                            text-align: center;
                            border-bottom: 3px solid #0d9488;
                            padding-bottom: 20px;
                            margin-bottom: 30px;
                          }
                          h1 {
                            color: #0d9488;
                            font-size: 28px;
                            margin: 0;
                            font-weight: 700;
                          }
                          .subtitle {
                            color: #6b7280;
                            font-size: 14px;
                            margin-top: 5px;
                          }
                          .section {
                            margin-bottom: 30px;
                          }
                          .patient-info {
                            padding: 20px;
                            background: #f9fafb;
                            border-left: 4px solid #0d9488;
                            border-radius: 4px;
                          }
                          .signature-section {
                            margin-top: 40px;
                            padding-top: 30px;
                            border-top: 2px solid #e5e7eb;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="header">
                          <h1>CONSENT FORM</h1>
                          <p class="subtitle">Procedure Consent</p>
                        </div>
                        <div class="section">
                          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; font-weight: 600;">${name.toUpperCase()}</h2>
                          <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">
                            I hereby give my consent for the procedure mentioned above to be performed on me.
                          </p>
                        </div>
                        <div class="patient-info">
                          <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Patient Information</h3>
                          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                            <div>
                              <strong style="color: #374151;">Patient Name:</strong>
                              <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">_________________________</p>
                            </div>
                            <div>
                              <strong style="color: #374151;">Date of Birth:</strong>
                              <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">_________________________</p>
                            </div>
                            <div>
                              <strong style="color: #374151;">Hospital Number (UPI):</strong>
                              <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">_________________________</p>
                            </div>
                            <div>
                              <strong style="color: #374151;">Age:</strong>
                              <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">_________________________</p>
                            </div>
                            <div>
                              <strong style="color: #374151;">Date:</strong>
                              <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                          </div>
                        </div>
                        <div class="section">
                          <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Procedure/Test Details</h3>
                          <p style="color: #4b5563; line-height: 1.8; font-size: 14px; margin-bottom: 15px;">
                            I understand that the procedure involves:
                          </p>
                          <ul style="color: #4b5563; line-height: 1.8; font-size: 14px; padding-left: 20px;">
                            <li>Explanation of the procedure has been provided to me</li>
                            <li>I have been informed about the benefits and potential risks</li>
                            <li>I have had the opportunity to ask questions</li>
                            <li>I understand that I can withdraw my consent at any time</li>
                          </ul>
                        </div>
                        <div class="signature-section">
                          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                            <div>
                              <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Patient Signature:</strong></p>
                              <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                              <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
                            </div>
                            <div>
                              <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Witness Signature:</strong></p>
                              <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                              <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
                            </div>
                          </div>
                          <div>
                            <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Doctor/Healthcare Provider Signature:</strong></p>
                            <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                            <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
                          </div>
                        </div>
                      </body>
                      </html>
                    `;
                    previewWindow.document.write(htmlContent);
                    previewWindow.document.close();
                  }}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  View Full Preview
                </button>
              </div>
              <div className="bg-white border border-gray-300 rounded p-3 max-h-64 overflow-y-auto">
                <div className="text-center border-b-2 border-teal-600 pb-2 mb-3">
                  <h4 className="text-teal-600 font-bold text-lg">CONSENT FORM</h4>
                  <p className="text-gray-500 text-xs">Procedure Consent</p>
                </div>
                <div className="mb-3">
                  <h5 className="font-semibold text-gray-800 mb-1">{formData.procedure_name.toUpperCase()}</h5>
                  <p className="text-sm text-gray-600">
                    I hereby give my consent for the procedure mentioned above to be performed on me.
                  </p>
                </div>
                <div className="bg-gray-50 border-l-4 border-teal-600 p-2 mb-3 rounded">
                  <h6 className="font-semibold text-gray-800 text-xs mb-1">Patient Information</h6>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>Patient Name: _______________</div>
                    <div>Date of Birth: _______________</div>
                    <div>Hospital Number (UPI): _______________</div>
                    <div>Age: _______________</div>
                    <div>Date: {new Date().toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  <p className="font-semibold mb-1">Procedure/Test Details:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>Explanation of the procedure has been provided</li>
                    <li>Informed about benefits and potential risks</li>
                    <li>Opportunity to ask questions</li>
                    <li>Can withdraw consent at any time</li>
                  </ul>
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200 text-xs text-gray-500">
                  <p>Signature sections for Patient, Witness, and Doctor/Healthcare Provider</p>
                </div>
              </div>
            </div>
          )}

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
