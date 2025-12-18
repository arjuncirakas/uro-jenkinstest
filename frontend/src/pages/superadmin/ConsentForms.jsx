import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Edit2,
  Trash2,
  Download,
  Eye,
  Loader2,
  FileCheck,
  Sparkles,
  X
} from 'lucide-react';
import { consentFormService } from '../../services/consentFormService';
import ErrorModal from '../../components/modals/ErrorModal';
import SuccessModal from '../../components/modals/SuccessModal';
import AddConsentFormModal from '../../components/modals/AddConsentFormModal';

const ConsentForms = () => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, auto-generated, uploaded
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Fetch consent form templates
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await consentFormService.getConsentFormTemplates();
      console.log('Fetch templates response:', response);
      if (response.success) {
        setTemplates(response.data || []);
      } else {
        console.error('Failed to fetch templates:', response.error);
        setErrorMessage(response.error || 'Failed to fetch consent form templates');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      const errorMsg = error?.response?.data?.message || 
                      error?.message || 
                      'Failed to fetch consent form templates';
      console.error('Error details:', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        url: error?.config?.url,
        baseURL: error?.config?.baseURL,
        fullURL: error?.config?.baseURL + error?.config?.url
      });
      
      // Provide more helpful error message for 404
      let displayError = errorMsg;
      if (error?.response?.status === 404) {
        displayError = 'The consent forms API endpoint was not found. Please check if the backend server is running and the route is properly configured. If this persists, please contact the administrator.';
      }
      
      setErrorMessage(displayError);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Retry function for error modal
  const handleRetry = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    fetchTemplates();
  };

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !searchValue || 
      template.procedure_name?.toLowerCase().includes(searchValue.toLowerCase()) ||
      template.test_name?.toLowerCase().includes(searchValue.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'auto-generated' && template.is_auto_generated) ||
      (filterStatus === 'uploaded' && !template.is_auto_generated);
    
    return matchesSearch && matchesFilter;
  });

  const handleDelete = (template) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await consentFormService.deleteConsentFormTemplate(selectedTemplate.id);
      if (response.success) {
        setSuccessMessage('Consent form template deleted successfully');
        setShowSuccessModal(true);
        fetchTemplates();
      } else {
        setErrorMessage(response.error || 'Failed to delete template');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setErrorMessage(error?.response?.data?.message || 'Failed to delete template');
      setShowErrorModal(true);
    } finally {
      setShowDeleteModal(false);
      setSelectedTemplate(null);
    }
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setShowPreviewModal(true);
  };

  const generateAutoPreviewHTML = (template) => {
    const name = template.procedure_name || template.test_name;
    const type = template.procedure_name ? 'Procedure' : 'Test';
    
    return `
      <div style="font-family: 'Arial', sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1);">
        <div style="text-align: center; border-bottom: 3px solid #0d9488; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #0d9488; font-size: 28px; margin: 0; font-weight: 700;">CONSENT FORM</h1>
          <p style="color: #6b7280; font-size: 14px; margin-top: 5px;">${type} Consent</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; font-weight: 600;">${name.toUpperCase()}</h2>
          <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">
            I hereby give my consent for the ${template.procedure_name ? 'procedure' : 'test'} mentioned above to be performed on me.
          </p>
        </div>

        <div style="margin-bottom: 30px; padding: 20px; background: #f9fafb; border-left: 4px solid #0d9488; border-radius: 4px;">
          <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Patient Information</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
            <div>
              <strong style="color: #374151;">Patient Name:</strong>
              <p style="color: #6b7280; margin-top: 5px;">_________________________</p>
            </div>
            <div>
              <strong style="color: #374151;">Date of Birth:</strong>
              <p style="color: #6b7280; margin-top: 5px;">_________________________</p>
            </div>
            <div>
              <strong style="color: #374151;">Hospital Number:</strong>
              <p style="color: #6b7280; margin-top: 5px;">_________________________</p>
            </div>
            <div>
              <strong style="color: #374151;">Date:</strong>
              <p style="color: #6b7280; margin-top: 5px;">_________________________</p>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Procedure/Test Details</h3>
          <p style="color: #4b5563; line-height: 1.8; font-size: 14px; margin-bottom: 15px;">
            I understand that the ${template.procedure_name ? 'procedure' : 'test'} involves:
          </p>
          <ul style="color: #4b5563; line-height: 1.8; font-size: 14px; padding-left: 20px;">
            <li>Explanation of the ${template.procedure_name ? 'procedure' : 'test'} has been provided to me</li>
            <li>I have been informed about the benefits and potential risks</li>
            <li>I have had the opportunity to ask questions</li>
            <li>I understand that I can withdraw my consent at any time</li>
          </ul>
        </div>

        <div style="margin-bottom: 30px; padding: 20px; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px;">
          <h3 style="color: #92400e; font-size: 16px; margin-bottom: 10px; font-weight: 600;">Important Notes</h3>
          <p style="color: #78350f; line-height: 1.6; font-size: 13px; margin: 0;">
            Please read this form carefully. If you have any questions or concerns, please discuss them with your healthcare provider before signing.
          </p>
        </div>

        <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
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

        <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 4px; text-align: center;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This is an auto-generated consent form template. It will be customized for each patient.
          </p>
        </div>
      </div>
    `;
  };

  const handleSuccess = () => {
    fetchTemplates();
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedTemplate(null);
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setFilterStatus('all');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="h-full overflow-y-auto w-full">
      <div className="w-full p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Consent Form Templates</h1>
                <p className="text-gray-500 text-sm mt-1">Manage consent form templates for procedures and tests</p>
              </div>
            </div>
          </div>

          {/* Add Template Button */}
          <div className="w-full lg:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full lg:w-auto inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Template
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 text-teal-600 mr-2" />
              Filters
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                    placeholder="Search templates..."
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="all">All Types</option>
                  <option value="auto-generated">Auto-Generated</option>
                  <option value="uploaded">Uploaded</option>
                </select>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={handleClearFilters}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Templates List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Templates ({filteredTemplates.length})
            </h3>
            {isLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-8 w-8 text-teal-600 animate-spin" />
              <p className="mt-2 text-sm text-gray-500">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new consent form template.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Template
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTemplates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
                            {template.is_auto_generated ? (
                              <Sparkles className="h-5 w-5 text-teal-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-teal-600" />
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {template.procedure_name || template.test_name || 'Untitled Template'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {template.procedure_name ? 'Procedure' : 'Test'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {template.procedure_name ? 'Procedure' : 'Test'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.is_auto_generated
                            ? 'text-purple-600 bg-purple-100'
                            : 'text-blue-600 bg-blue-100'
                        }`}>
                          {template.is_auto_generated ? (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" />
                              Auto-Generated
                            </>
                          ) : (
                            <>
                              <FileCheck className="h-3 w-3 mr-1" />
                              Uploaded
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(template.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePreview(template)}
                            className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview Template"
                          >
                            <Eye className="h-4 w-4 mr-1.5" />
                            <span className="text-xs font-medium">Preview</span>
                          </button>
                          <button
                            onClick={() => handleEdit(template)}
                            className="inline-flex items-center px-3 py-1.5 text-teal-600 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Edit Template"
                          >
                            <Edit2 className="h-4 w-4 mr-1.5" />
                            <span className="text-xs font-medium">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(template)}
                            className="inline-flex items-center px-3 py-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Template"
                          >
                            <Trash2 className="h-4 w-4 mr-1.5" />
                            <span className="text-xs font-medium">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Template
                  </h3>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">
                Are you sure you want to delete the template <strong>{selectedTemplate.procedure_name || selectedTemplate.test_name || 'Untitled Template'}</strong>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedTemplate(null);
                }}
                className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessMessage('');
        }}
        title="Success!"
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage('');
        }}
        onConfirm={handleRetry}
        message={errorMessage}
        title="Error"
      />

      {/* Add/Edit Modal */}
      <AddConsentFormModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedTemplate(null);
        }}
        onSuccess={handleSuccess}
        template={showEditModal ? selectedTemplate : null}
      />

      {/* Preview Modal */}
      {showPreviewModal && previewTemplate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Preview: {previewTemplate.procedure_name || previewTemplate.test_name || 'Untitled Template'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {previewTemplate.is_auto_generated ? 'Auto-Generated Template' : 'Uploaded PDF Template'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewTemplate(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Preview Content */}
            <div className="p-6">
              {previewTemplate.is_auto_generated ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="bg-white p-8 overflow-y-auto max-h-[70vh]"
                    dangerouslySetInnerHTML={{ __html: generateAutoPreviewHTML(previewTemplate) }}
                  />
                </div>
              ) : previewTemplate.template_file_url ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    src={previewTemplate.template_file_url}
                    className="w-full h-[70vh] border-0"
                    title="PDF Preview"
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No preview available</h3>
                  <p className="mt-1 text-sm text-gray-500">Template file not found or not accessible.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewTemplate(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsentForms;

