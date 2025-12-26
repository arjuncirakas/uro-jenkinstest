import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoDocument, IoCheckmarkCircle, IoCloseCircle, IoPrint, IoCloudUpload } from 'react-icons/io5';
import { FiX } from 'react-icons/fi';
import { Upload, Eye } from 'lucide-react';
import { investigationService } from '../services/investigationService';
import { consentFormService } from '../services/consentFormService';
import { printConsentForm } from '../utils/consentFormUtils';
import PDFViewerModal from './PDFViewerModal';
import ImageViewerModal from './ImageViewerModal';

const AddInvestigationResultModal = ({ isOpen, onClose, investigationRequest, patient, existingResult, onSuccess, isPSATest = false, onStatusUpdate }) => {
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Consent form state
  const [consentFormTemplates, setConsentFormTemplates] = useState([]);
  const [patientConsentForms, setPatientConsentForms] = useState([]);
  const [loadingConsentForms, setLoadingConsentForms] = useState(false);
  const [uploadingConsentForm, setUploadingConsentForm] = useState(false);
  const [consentFormNotification, setConsentFormNotification] = useState({ type: '', message: '' });
  const [isPDFViewerModalOpen, setIsPDFViewerModalOpen] = useState(false);
  const [pdfViewerUrl, setPdfViewerUrl] = useState(null);
  const [pdfViewerFileName, setPdfViewerFileName] = useState(null);
  const [isImageViewerModalOpen, setIsImageViewerModalOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState(null);
  const [imageViewerFileName, setImageViewerFileName] = useState(null);

  // Get existing file info (calculate before early return)
  const existingFilePath = existingResult?.filePath || existingResult?.file_path || null;
  const existingFileName = existingResult?.fileName || existingResult?.file_name || null;
  const hasExistingFile = !!existingFilePath;

  // Initialize form with existing result data when modal opens or existingResult changes
  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setResult('');
      setNotes('');
      setFile(null);
      setFileName('');
      setError('');
      setConsentFormNotification({ type: '', message: '' });
      return;
    }

    if (existingResult) {
      setResult(existingResult.result || '');
      setNotes(existingResult.notes || '');
      // Note: We don't set the file state for existing files since they're already uploaded
      // We'll display them separately
    } else {
      // Reset form when no existing result
      setResult('');
      setNotes('');
      setFile(null);
      setFileName('');
    }
  }, [existingResult, isOpen]);

  // Debug logging
  useEffect(() => {
    if (isOpen && existingResult) {
      console.log('🔍 AddInvestigationResultModal - Existing result:', existingResult);
      console.log('🔍 AddInvestigationResultModal - File path:', existingFilePath);
      console.log('🔍 AddInvestigationResultModal - File name:', existingFileName);
      console.log('🔍 AddInvestigationResultModal - Has existing file:', hasExistingFile);
    }
  }, [existingResult, existingFilePath, existingFileName, hasExistingFile, isOpen]);

  // Fetch consent form templates and patient consent forms
  const fetchConsentForms = useCallback(async () => {
    const patientId = patient?.id || patient?.patientId || patient?.patient_id;
    if (!patientId) return;

    setLoadingConsentForms(true);
    try {
      // Fetch templates
      const templatesResponse = await consentFormService.getConsentFormTemplates();
      if (templatesResponse.success) {
        setConsentFormTemplates(templatesResponse.data || []);
      }

      // Fetch patient consent forms
      const patientFormsResponse = await consentFormService.getPatientConsentForms(patientId);
      if (patientFormsResponse.success) {
        setPatientConsentForms(patientFormsResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching consent forms:', error);
    } finally {
      setLoadingConsentForms(false);
    }
  }, [patient?.id, patient?.patientId, patient?.patient_id]);

  // Fetch consent forms when modal opens
  useEffect(() => {
    if (isOpen && patient?.id && !isPSATest) {
      fetchConsentForms();
    }
  }, [isOpen, patient?.id, isPSATest, fetchConsentForms]);

  // Debug: Log when patientConsentForms changes
  useEffect(() => {
    if (isOpen && patientConsentForms.length > 0) {
      console.log('🔄 patientConsentForms updated:', patientConsentForms);
    }
  }, [patientConsentForms, isOpen]);

  // Get consent form template for the investigation
  const getConsentFormTemplate = (testName) => {
    if (!testName) return null;
    const normalizedTestName = testName.toUpperCase().trim();
    return consentFormTemplates.find(t => 
      (t.test_name && t.test_name.toUpperCase().trim() === normalizedTestName) ||
      (t.procedure_name && t.procedure_name.toUpperCase().trim() === normalizedTestName)
    );
  };

  // Get patient consent form for the investigation
  const getPatientConsentForm = (testName, templateId = null) => {
    if (!testName) return null;
    const normalizedTestName = testName.toUpperCase().trim();
    
    // Debug logging
    console.log('🔍 getPatientConsentForm - Searching for:', normalizedTestName, 'with templateId:', templateId);
    console.log('🔍 Available patient consent forms:', patientConsentForms);
    console.log('🔍 Available templates:', consentFormTemplates);
    
    const foundForm = patientConsentForms.find(cf => {
      // First, if we have a templateId, try matching by consent_form_id directly
      if (templateId && (cf.consent_form_id === templateId || cf.template_id === templateId)) {
        console.log('✅ Matched by template ID:', cf);
        return true;
      }
      
      // Second, try matching by consent_form_name
      if (cf.consent_form_name) {
        const consentFormName = cf.consent_form_name.toUpperCase().trim();
        if (consentFormName === normalizedTestName) {
          console.log('✅ Matched by consent_form_name:', cf);
          return true;
        }
      }
      
      // Third, try matching by test_name or procedure_name from the joined data
      if (cf.test_name) {
        const cfTestName = cf.test_name.toUpperCase().trim();
        if (cfTestName === normalizedTestName) {
          console.log('✅ Matched by test_name:', cf);
          return true;
        }
      }
      
      if (cf.procedure_name) {
        const cfProcName = cf.procedure_name.toUpperCase().trim();
        if (cfProcName === normalizedTestName) {
          console.log('✅ Matched by procedure_name:', cf);
          return true;
        }
      }
      
      // Fourth, try matching by template
      const template = consentFormTemplates.find(t => 
        t.id === cf.template_id || 
        t.id === cf.consent_form_id ||
        cf.template_id === t.id ||
        cf.consent_form_id === t.id
      );
      
      if (template) {
        const templateTestName = template.test_name ? template.test_name.toUpperCase().trim() : '';
        const templateProcName = template.procedure_name ? template.procedure_name.toUpperCase().trim() : '';
        const matches = (templateTestName === normalizedTestName) ||
                       (templateProcName === normalizedTestName);
        
        if (matches) {
          console.log('✅ Matched by template:', { template, cf });
        }
        return matches;
      }
      
      return false;
    });
    
    console.log('🔍 Found form:', foundForm);
    return foundForm;
  };

  // Print consent form
  const handlePrintConsentForm = async (template, testName) => {
    const onError = (errorMsg) => {
      setConsentFormNotification({ type: 'error', message: errorMsg });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
    };
    await printConsentForm(template, testName, patient, onError);
  };

  // Handle consent form upload
  const handleConsentFormUpload = async (testName, template, file) => {
    if (!file || !template || !patient) return;

    const patientId = patient.id || patient.patientId || patient.patient_id;
    if (!patientId) {
      setConsentFormNotification({ type: 'error', message: 'Patient ID is missing' });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
      return;
    }

    setUploadingConsentForm(true);
    setConsentFormNotification({ type: '', message: '' });
    try {
      const result = await consentFormService.uploadConsentForm(patientId, template.id, file);
      if (result.success) {
        console.log('✅ Consent form uploaded successfully:', result.data);
        
        // Wait for backend to process, then refresh once
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchConsentForms();
        
        setConsentFormNotification({ type: 'success', message: `${testName} signed consent form uploaded successfully` });
        // Clear notification after 5 seconds
        setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
      } else {
        setConsentFormNotification({ type: 'error', message: `Failed to upload consent form: ${result.error || 'Unknown error'}` });
        setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
      }
    } catch (error) {
      console.error('Error uploading consent form:', error);
      setConsentFormNotification({ type: 'error', message: 'Failed to upload consent form. Please try again.' });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
    } finally {
      setUploadingConsentForm(false);
    }
  };

  // View uploaded consent form
  const handleViewConsentForm = async (consentForm) => {
    if (!consentForm) {
      console.error('No consent form provided to handleViewConsentForm');
      return;
    }
    
    const filePath = consentForm.file_path || 
                     consentForm.filePath || 
                     consentForm.signed_file_path || 
                     consentForm.signed_filePath;
    
    if (!filePath) {
      console.error('No file path found in consent form:', consentForm);
      setConsentFormNotification({ type: 'error', message: 'No file available to view' });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
      return;
    }
    
    const normalizedPath = filePath.replace(/\\/g, '/');
    let relativePath = normalizedPath;
    if (relativePath.startsWith('uploads/')) {
      relativePath = relativePath.replace(/^uploads\//, '');
    }
    
    const fileExtension = normalizedPath.split('.').pop().toLowerCase();
    const fileName = consentForm.file_name || consentForm.fileName || 'Consent Form';
    
    try {
      const response = await consentFormService.getConsentFormFile(relativePath);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch file');
      }

      const blob = response.data;
      const blobUrl = URL.createObjectURL(blob);
      
      if (fileExtension === 'pdf') {
        setPdfViewerUrl(blobUrl);
        setPdfViewerFileName(fileName);
        setIsPDFViewerModalOpen(true);
      } else {
        setImageViewerUrl(blobUrl);
        setImageViewerFileName(fileName);
        setIsImageViewerModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching consent form file:', error);
      setConsentFormNotification({ type: 'error', message: 'Failed to view consent form. Please try again.' });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
    }
  };

  // Close PDF viewer and cleanup
  const handleClosePDFViewer = () => {
    setIsPDFViewerModalOpen(false);
    if (pdfViewerUrl) {
      URL.revokeObjectURL(pdfViewerUrl);
      setPdfViewerUrl(null);
    }
    setTimeout(() => {
      setPdfViewerFileName(null);
    }, 300);
  };

  // Close image viewer and cleanup
  const handleCloseImageViewer = () => {
    setIsImageViewerModalOpen(false);
    if (imageViewerUrl) {
      URL.revokeObjectURL(imageViewerUrl);
      setImageViewerUrl(null);
    }
    setTimeout(() => {
      setImageViewerFileName(null);
    }, 300);
  };

  // Early return after all hooks
  if (!isOpen || !investigationRequest) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF, JPG, PNG, DOC, and DOCX files are allowed');
        return;
      }

      // Validate file size (10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setFileName('');
    // Reset the file input
    const fileInput = document.getElementById('report-upload');
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      // Create the test result data
      const testData = {
        testName: investigationRequest.investigationName || investigationRequest.investigation_name,
        testDate: new Date().toISOString().split('T')[0],
        result: result || '',
        notes: notes || '',
        testFile: isPSATest ? null : file // Don't include file for PSA tests
      };

      console.log('🔍 Submitting investigation result:', {
        ...testData,
        testFile: file ? file.name : 'No file'
      });

      // Call the API to add the test result
      const resultResponse = await investigationService.addOtherTestResult(patient.id, testData);

      if (resultResponse.success) {
        console.log('✅ Investigation result added:', resultResponse.data);

        // Dispatch event to refresh investigation management table
        window.dispatchEvent(new CustomEvent('testResultAdded', {
          detail: {
            patientId: patient?.id,
            requestId: investigationRequest.id,
            testName: investigationRequest.investigationName || investigationRequest.investigation_name
          }
        }));

        // Call success callback
        if (onSuccess) {
          onSuccess('Investigation result added successfully!', investigationRequest.id);
        }

        // Reset form and close
        handleClose();
      } else {
        console.error('❌ Failed to add investigation result:', resultResponse.error);
        setError(resultResponse.error || 'Failed to add investigation result');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('❌ Error adding investigation result:', err);
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult('');
    setNotes('');
    setFile(null);
    setFileName('');
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Investigation Result</h2>
            {patient && (
              <p className="text-xs text-gray-600 mt-0.5">
                Patient: <span className="font-medium">{patient.name}</span>
              </p>
            )}
            <p className="text-xs text-purple-600 mt-0.5">
              Investigation: <span className="font-medium">{investigationRequest.investigationName || investigationRequest.investigation_name}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <IoClose className="text-lg" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-4">
            {/* Result */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Result Value
              </label>
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="e.g., 5.2 ng/mL, Positive, Negative"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Upload Report - Hidden for PSA tests */}
            {!isPSATest && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Upload Report
                </label>
                {/* Show existing file if available */}
                {hasExistingFile && !file && (
                  <div className="border-2 border-blue-400 bg-blue-50 rounded-md p-2.5 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <IoDocument className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-900 truncate">
                            {existingFileName || 'Uploaded File'}
                          </p>
                          <p className="text-xs text-blue-700 mt-0.5">
                            Existing uploaded file
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('🔍 View button clicked');
                              console.log('🔍 Existing result:', existingResult);
                              console.log('🔍 Existing file path:', existingFilePath);

                              if (!existingFilePath) {
                                console.error('❌ No file path available');
                                alert('File path is not available. Please check if the file was uploaded correctly.');
                                return;
                              }

                              if (typeof existingFilePath !== 'string' || existingFilePath.trim() === '') {
                                console.error('❌ Invalid file path:', existingFilePath);
                                alert('Invalid file path. Please contact support.');
                                return;
                              }

                              try {
                                console.log('📂 Attempting to view file:', existingFilePath);
                                await investigationService.viewFile(existingFilePath);
                                console.log('✅ File view request completed');
                              } catch (error) {
                                console.error('❌ Error viewing file:', error);
                                const errorMessage = error?.response?.data?.message || error?.message || 'Unable to open file. Please check the console for details.';
                                alert(`Error viewing file: ${errorMessage}`);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 transition-colors text-xs font-medium px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={existingFilePath ? "View file" : "No file available"}
                            disabled={!existingFilePath}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {file ? (
                  // Show newly attached file
                  <div className="border-2 border-teal-400 bg-teal-50 rounded-md p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          <IoDocument className="w-4 h-4 text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-teal-900 truncate">
                            {fileName}
                          </p>
                          <p className="text-xs text-teal-700 mt-0.5">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex items-center space-x-1.5">
                          <IoCheckmarkCircle className="w-4 h-4 text-green-500" />
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove file"
                          >
                            <IoCloseCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Show upload area - Reduced size
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-3 text-center hover:border-teal-500 transition-colors">
                    <input
                      type="file"
                      id="report-upload"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                    />
                    <label
                      htmlFor="report-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-1" />
                      <p className="text-xs text-gray-600 mb-0.5">
                        {hasExistingFile ? 'Click to replace existing file or drag and drop' : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, JPG, PNG, DOC, DOCX (max 10MB)
                      </p>
                    </label>
                  </div>
                )}
                {error && (
                  <p className="text-red-500 text-xs mt-1">{error}</p>
                )}
              </div>
            )}

            {/* Notes - Reduced size */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Clinical Notes / Interpretation
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Enter interpretation, recommendations, or additional notes..."
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-none"
              />
            </div>
          </form>

          {/* Status Update Section */}
          {onStatusUpdate && !hasExistingFile && (
            <div className="px-4 pb-2 border-t border-gray-200 pt-2">
              <h3 className="text-xs font-semibold text-gray-700 mb-1.5">Or Update Status</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (onStatusUpdate) {
                      await onStatusUpdate('not_required');
                    }
                  }}
                  className="flex-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors font-medium border border-gray-300 flex items-center justify-center gap-1.5"
                >
                  <FiX className="w-3.5 h-3.5" />
                  Not Required
                </button>
              </div>
            </div>
          )}

          {/* Consent Form Section - Professional minimal design, hidden for PSA tests */}
          {!isPSATest && (() => {
            const investigationName = investigationRequest?.investigationName || investigationRequest?.investigation_name || '';
            const consentTemplate = getConsentFormTemplate(investigationName);
            const patientConsentForm = getPatientConsentForm(investigationName, consentTemplate?.id);
            
            // Check if form has been uploaded - simplified check
            const filePath = patientConsentForm?.file_path || patientConsentForm?.filePath || patientConsentForm?.signed_file_path || patientConsentForm?.signed_filePath;
            const fileName = patientConsentForm?.file_name || patientConsentForm?.fileName || 'Consent Form';
            
            // Simplified check - if patientConsentForm exists and has a file_path, it's uploaded
            // Only exclude if it's clearly a template or auto-generated
            // Be very lenient - any file_path means it's uploaded
            const hasUploadedForm = !!(patientConsentForm && 
                                   filePath && 
                                   typeof filePath === 'string' &&
                                   filePath.trim() !== '' &&
                                   !filePath.toLowerCase().includes('template') &&
                                   !filePath.toLowerCase().includes('auto-generated'));
            
            // Debug logging
            console.log('🔍 Consent Form Section Render:', {
              investigationName,
              hasPatientConsentForm: !!patientConsentForm,
              patientConsentForm,
              filePath,
              fileName,
              hasUploadedForm,
              patientConsentFormsCount: patientConsentForms.length,
              templatesCount: consentFormTemplates.length
            });

            return (
              <div className="px-4 pb-2 mt-2">
                {/* Consent Form Section */}
                <div className="border-t border-gray-200 pt-2">
                  {/* Section Header */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-gray-700">
                      Consent Form for {investigationName}
                    </h3>
                    {hasUploadedForm && (
                      <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                        Uploaded
                      </span>
                    )}
                  </div>

                  {/* Notification Message */}
                  {consentFormNotification.message && (
                    <div className={`mb-2 p-1.5 rounded text-xs ${
                      consentFormNotification.type === 'success' 
                        ? 'bg-gray-50 text-gray-700 border border-gray-200' 
                        : 'bg-gray-50 text-gray-700 border border-gray-200'
                    }`}>
                      {consentFormNotification.message}
                    </div>
                  )}

                  {/* Uploaded File Info */}
                  {hasUploadedForm && (
                    <div className="mb-2 p-1.5 bg-gray-50 rounded border border-gray-200">
                      <div className="flex items-center gap-2">
                        <IoDocument className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs text-gray-600 truncate">{fileName}</span>
                      </div>
                    </div>
                  )}

                  {/* Loading/Uploading Status - Single Loader */}
                  {(loadingConsentForms || uploadingConsentForm) && (
                    <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>{uploadingConsentForm ? 'Uploading...' : 'Loading...'}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => consentTemplate && handlePrintConsentForm(consentTemplate, investigationName)}
                        disabled={!consentTemplate || loadingConsentForms}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded border transition-colors flex items-center justify-center gap-1.5 ${
                          consentTemplate && !loadingConsentForms
                            ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                            : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                        }`}
                        title={!consentTemplate ? 'Consent form template not available. Please create one in the superadmin panel.' : 'Print consent form'}
                      >
                        <IoPrint className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>

                      <label className={`flex-1 px-3 py-2 text-xs font-medium rounded border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        consentTemplate && !loadingConsentForms && !uploadingConsentForm
                          ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                          : 'text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed'
                      }`}
                      title={!consentTemplate ? 'Consent form template not available. Please create one in the superadmin panel.' : hasUploadedForm ? 'Re-upload signed consent form' : 'Upload signed consent form'}
                      >
                        <IoCloudUpload className="w-3.5 h-3.5" />
                        <span>{hasUploadedForm ? 'Re-upload' : 'Upload Signed'}</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file && consentTemplate) {
                              handleConsentFormUpload(investigationName, consentTemplate, file);
                            } else if (file && !consentTemplate) {
                              setConsentFormNotification({ type: 'error', message: 'Consent form template not available. Please create one in the superadmin panel first.' });
                              setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
                            }
                            // Reset input
                            e.target.value = '';
                          }}
                          className="hidden"
                          disabled={!consentTemplate || loadingConsentForms || uploadingConsentForm}
                        />
                      </label>
                    </div>

                    {/* View Consent Form Button - Only visible when form is uploaded */}
                    {hasUploadedForm && (
                      <button
                        type="button"
                        onClick={() => handleViewConsentForm(patientConsentForm)}
                        className="w-full px-3 py-2 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5"
                        title="View uploaded consent form"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Consent Form</span>
                      </button>
                    )}
                  </div>

                  {/* Helper Text */}
                  {!consentTemplate && (
                    <p className="mt-2 text-xs text-gray-500 text-center">
                      Template not available
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
          {/* Error Message */}
          {error && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-3 py-2 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
                  Saving...
                </>
              ) : (
                'Save Result'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <PDFViewerModal
        isOpen={isPDFViewerModalOpen}
        onClose={handleClosePDFViewer}
        pdfUrl={pdfViewerUrl}
        fileName={pdfViewerFileName}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={isImageViewerModalOpen}
        onClose={handleCloseImageViewer}
        imageUrl={imageViewerUrl}
        fileName={imageViewerFileName}
      />
    </div>
  );
};

export default AddInvestigationResultModal;












