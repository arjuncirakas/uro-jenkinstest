import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Edit2, Trash2, Eye, Loader2, FileCheck, Filter } from 'lucide-react';
import { consentFormService } from '../../services/consentFormService';
import AddConsentFormModal from '../../components/modals/AddConsentFormModal';

const ConsentForms = () => {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch templates
  const fetchTemplates = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await consentFormService.getConsentFormTemplates();
      if (response.success) {
        setTemplates(response.data);
      } else {
        setError(response.error || 'Failed to fetch templates');
      }
    } catch (err) {
      setError('Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Filter templates
  useEffect(() => {
    let filtered = templates;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(template =>
        (template.procedure_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (template.test_name?.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }


    setFilteredTemplates(filtered);
  }, [templates, searchQuery]);

  // Handle delete
  const handleDelete = (template) => {
    setSelectedTemplate(template);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await consentFormService.deleteConsentFormTemplate(selectedTemplate.id);
      if (response.success) {
        setSuccess('Template deleted successfully');
        fetchTemplates();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to delete template');
      }
    } catch (err) {
      setError('Failed to delete template');
    } finally {
      setShowDeleteModal(false);
      setSelectedTemplate(null);
    }
  };

  // Handle edit
  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setShowEditModal(true);
  };

  // Handle success
  const handleSuccess = () => {
    setSuccess(selectedTemplate ? 'Template updated successfully' : 'Template created successfully');
    setTimeout(() => setSuccess(''), 3000);
    fetchTemplates();
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedTemplate(null);
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Consent Form Templates
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage consent form templates for procedures and tests
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full lg:w-auto inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Template
          </button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="h-5 w-5 text-teal-600 mr-2" />
              Filters
            </h3>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex items-end gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
                    placeholder="Search templates..."
                  />
                </div>
              </div>

              {/* Clear Filters */}
              <div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all duration-200"
                >
                  Clear
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
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new consent form template.
              </p>
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
                            <FileText className="h-5 w-5 text-teal-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {template.procedure_name || template.test_name || 'Untitled'}
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-100">
                          <FileCheck className="h-3 w-3 mr-1" />
                          Uploaded
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(template.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
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
                Are you sure you want to delete the template{' '}
                <strong>{selectedTemplate.procedure_name || selectedTemplate.test_name}</strong>?
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
    </div>
  );
};

export default ConsentForms;
