import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { IoClose, IoDocument, IoCheckmarkCircle, IoCloseCircle, IoPrint, IoCloudUpload } from 'react-icons/io5';
import { FiX } from 'react-icons/fi';
import { Upload, Eye, Trash } from 'lucide-react';
import { investigationService } from '../services/investigationService';
import { consentFormService } from '../services/consentFormService';
import { getConsentFormBlobUrl } from '../utils/consentFormUtils';
import FullScreenPDFModal from './FullScreenPDFModal';
import ImageViewerModal from './ImageViewerModal';
import ConfirmationModal from './modals/ConfirmationModal';

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
  const [printingConsentForm, setPrintingConsentForm] = useState(false);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [showRemoveFileConfirm, setShowRemoveFileConfirm] = useState(false);

  // Get existing file info (calculate before early return)
  const existingFilePath = existingResult?.filePath || existingResult?.file_path || null;
  const existingFileName = existingResult?.fileName || existingResult?.file_name || null;
  const hasExistingFile = !!existingFilePath && !removeExistingFile;

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
      setRemoveExistingFile(false);
      setShowRemoveFileConfirm(false);
      return;
    }

    if (existingResult) {
      setResult(existingResult.result || '');
      setNotes(existingResult.notes || '');
      setRemoveExistingFile(false);
      setShowRemoveFileConfirm(false);
      // Note: We don't set the file state for existing files since they're already uploaded
      // We'll display them separately
    } else {
      // Reset form when no existing result
      setResult('');
      setNotes('');
      setFile(null);
      setFileName('');
      setRemoveExistingFile(false);
    }
  }, [existingResult, isOpen]);


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

  // Listen for image viewer events
  useEffect(() => {
    const handleOpenImageViewer = (event) => {
      const { imageUrl, fileName } = event.detail;

      if (!imageUrl) {
        return;
      }

      setImageViewerUrl(imageUrl);
      setImageViewerFileName(fileName || 'Image');
      setIsImageViewerModalOpen(true);
    };

    const handleOpenPDFViewer = (event) => {
      const { pdfUrl, fileName } = event.detail;

      if (!pdfUrl) {
        return;
      }

      setPdfViewerUrl(pdfUrl);
      setPdfViewerFileName(fileName || 'PDF');
      setIsPDFViewerModalOpen(true);
    };

    window.addEventListener('openImageViewer', handleOpenImageViewer);
    window.addEventListener('openPDFViewer', handleOpenPDFViewer);

    return () => {
      window.removeEventListener('openImageViewer', handleOpenImageViewer);
      window.removeEventListener('openPDFViewer', handleOpenPDFViewer);
    };
  }, []);

  // Debug: Log when patientConsentForms changes
  useEffect(() => {
    if (isOpen && patientConsentForms.length > 0) {
      console.log('🔄 patientConsentForms updated:', patientConsentForms);
    }
  }, [patientConsentForms, isOpen]);

  // Get consent form template for the investigation
  // Get consent form template for a test - EXACT MATCH ONLY
  const getConsentFormTemplate = (testName) => {
    if (!testName) return null;
    const normalizedTestName = testName.toUpperCase().trim();
    const normalizedTestNameNoSpaces = normalizedTestName.replace(/\s+/g, '');

    return consentFormTemplates.find(t => {
      const templateTestName = t.test_name ? t.test_name.toUpperCase().trim() : '';
      const templateProcName = t.procedure_name ? t.procedure_name.toUpperCase().trim() : '';
      const templateTestNameNoSpaces = templateTestName.replace(/\s+/g, '');
      const templateProcNameNoSpaces = templateProcName.replace(/\s+/g, '');

      // Only match if names are exactly equal (with or without spaces)
      return (templateTestName && (
        templateTestName === normalizedTestName ||
        templateTestNameNoSpaces === normalizedTestNameNoSpaces
      )) || (templateProcName && (
        templateProcName === normalizedTestName ||
        templateProcNameNoSpaces === normalizedTestNameNoSpaces
      ));
    }) || null;
  };

  // Get patient consent form for the investigation - EXACT MATCH ONLY
  const getPatientConsentForm = (testName, templateId = null) => {
    if (!testName) return null;
    const normalizedTestName = testName.toUpperCase().trim();
    const normalizedTestNameNoSpaces = normalizedTestName.replace(/\s+/g, '');

    const foundForm = patientConsentForms.find(cf => {
      // First, try matching by consent_form_name - EXACT MATCH ONLY
      if (cf.consent_form_name) {
        const consentFormName = cf.consent_form_name.toUpperCase().trim();
        const consentFormNameNoSpaces = consentFormName.replace(/\s+/g, '');
        if (consentFormName === normalizedTestName ||
          consentFormNameNoSpaces === normalizedTestNameNoSpaces) {
          return true;
        }
      }

      // Second, try matching by template - EXACT MATCH ONLY
      const template = consentFormTemplates.find(t =>
        t.id === cf.template_id ||
        t.id === cf.consent_form_id ||
        (templateId && (t.id === templateId))
      );

      if (template) {
        const templateTestName = template.test_name?.toUpperCase().trim() || '';
        const templateProcName = template.procedure_name?.toUpperCase().trim() || '';
        const templateTestNameNoSpaces = templateTestName.replace(/\s+/g, '');
        const templateProcNameNoSpaces = templateProcName.replace(/\s+/g, '');

        // Only match if names are exactly equal
        return (templateTestName && (
          templateTestName === normalizedTestName ||
          templateTestNameNoSpaces === normalizedTestNameNoSpaces
        )) || (templateProcName && (
          templateProcName === normalizedTestName ||
          templateProcNameNoSpaces === normalizedTestNameNoSpaces
        ));
      }

      return false;
    });

    return foundForm || null;
  };

  // Print consent form - opens in modal
  const handlePrintConsentForm = async (template, testName) => {
    if (!template || !patient) {
      setConsentFormNotification({ type: 'error', message: 'Missing template or patient information' });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
      return;
    }

    setPrintingConsentForm(true);
    setConsentFormNotification({ type: '', message: '' });

    try {
      const result = await getConsentFormBlobUrl(template, testName, patient);

      if (result.success && result.blobUrl) {
        setPdfViewerUrl(result.blobUrl);
        setPdfViewerFileName(result.fileName || `${testName} Consent Form`);
        setIsPDFViewerModalOpen(true);
      } else {
        setConsentFormNotification({
          type: 'error',
          message: result.error || 'Failed to load consent form'
        });
        setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
      }
    } catch (error) {
      setConsentFormNotification({
        type: 'error',
        message: 'Failed to load consent form. Please try again.'
      });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
    } finally {
      setPrintingConsentForm(false);
    }
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

  // Helper function to check if form is uploaded
  const checkHasUploadedForm = (patientConsentForm) => {
    if (!patientConsentForm) return false;
    
    const filePath = patientConsentForm?.file_path || patientConsentForm?.filePath || 
                     patientConsentForm?.signed_file_path || patientConsentForm?.signed_filePath;
    
    if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
      return false;
    }
    
    // Check if patient has uploaded a consent form
    // File paths can be stored with or without 'uploads/' prefix (database vs filesystem)
    // Must contain 'consent-forms/patients/' and not be a template or auto-generated
    return (filePath.includes('consent-forms/patients/') || filePath.includes('consent-forms\\patients\\')) &&
           !filePath.includes('templates/') && 
           !filePath.includes('templates\\') &&
           !filePath.includes('auto-generated');
  };

  // Helper function to get button className
  const getButtonClassName = (isEnabled) => {
    const baseClasses = 'flex-1 px-3 py-2 text-xs font-medium rounded border transition-colors flex items-center justify-center gap-1.5';
    if (isEnabled) {
      return `${baseClasses} text-gray-700 bg-white border-gray-300 hover:bg-gray-50`;
    }
    return `${baseClasses} text-gray-400 bg-gray-50 border-gray-200 cursor-not-allowed`;
  };

  // Helper function to handle file upload
  const handleFileUpload = (file, investigationName, consentTemplate, isNotRequired) => {
    if (file && consentTemplate && !isNotRequired) {
      handleConsentFormUpload(investigationName, consentTemplate, file);
    } else if (file && !consentTemplate) {
      setConsentFormNotification({ 
        type: 'error', 
        message: 'Consent form template not available. Please create one in the superadmin panel first.' 
      });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
    } else if (file && isNotRequired) {
      setConsentFormNotification({ 
        type: 'error', 
        message: 'Test is marked as Not Required. Consent form actions are disabled.' 
      });
      setTimeout(() => setConsentFormNotification({ type: '', message: '' }), 5000);
    }
  };

  // Render consent form section - extracted to reduce cognitive complexity
  const renderConsentFormSection = () => {
    if (isPSATest) return null;

    const investigationName = investigationRequest?.investigationName || investigationRequest?.investigation_name || '';
    const consentTemplate = getConsentFormTemplate(investigationName);
    const patientConsentForm = getPatientConsentForm(investigationName, consentTemplate?.id);
    const isNotRequired = (investigationRequest?.status || '').toLowerCase() === 'not_required';
    const hasUploadedForm = checkHasUploadedForm(patientConsentForm);
    const fileName = patientConsentForm?.file_name || patientConsentForm?.fileName || 'Consent Form';

    // Get button title text
    const getButtonTitle = () => {
      if (isNotRequired) {
        return 'Test is marked as Not Required. Consent form actions are disabled.';
      }
      if (!consentTemplate) {
        return 'Consent form template not available. Please create one in the superadmin panel.';
      }
      if (printingConsentForm) {
        return 'Loading consent form...';
      }
      return 'View consent form';
    };

    // Get upload button title text
    const getUploadButtonTitle = () => {
      if (isNotRequired) {
        return 'Test is marked as Not Required. Consent form actions are disabled.';
      }
      if (!consentTemplate) {
        return 'Consent form template not available. Please create one in the superadmin panel.';
      }
      if (hasUploadedForm) {
        return 'Re-upload signed consent form';
      }
      return 'Upload signed consent form';
    };

    const isPrintButtonEnabled = consentTemplate && !loadingConsentForms && !printingConsentForm && !isNotRequired;
    const isUploadButtonEnabled = consentTemplate && !loadingConsentForms && !uploadingConsentForm && !isNotRequired;

    return (
      <div className="px-4 pb-2 mt-2">
        <div className="border-t border-gray-200 pt-2">
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

          {consentFormNotification.message && (
            <div className="mb-2 p-1.5 rounded text-xs bg-gray-50 text-gray-700 border border-gray-200">
              {consentFormNotification.message}
            </div>
          )}

          {hasUploadedForm && (
            <div className="mb-2 p-1.5 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center gap-2">
                <IoDocument className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-600 truncate">{fileName}</span>
              </div>
            </div>
          )}

          {(loadingConsentForms || uploadingConsentForm) && (
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>{uploadingConsentForm ? 'Uploading...' : 'Loading...'}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => consentTemplate && !isNotRequired && handlePrintConsentForm(consentTemplate, investigationName)}
                disabled={!isPrintButtonEnabled}
                className={getButtonClassName(isPrintButtonEnabled)}
                title={getButtonTitle()}
              >
                {printingConsentForm ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <IoPrint className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </>
                )}
              </button>

              <label 
                className={`${getButtonClassName(isUploadButtonEnabled)} ${isUploadButtonEnabled ? 'cursor-pointer' : ''}`}
                title={getUploadButtonTitle()}
              >
                <IoCloudUpload className="w-3.5 h-3.5" />
                <span>{hasUploadedForm ? 'Re-upload' : 'Upload Signed'}</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    handleFileUpload(file, investigationName, consentTemplate, isNotRequired);
                    e.target.value = '';
                  }}
                  className="hidden"
                  disabled={!isUploadButtonEnabled}
                />
              </label>
            </div>

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

          {!consentTemplate && (
            <p className="mt-2 text-xs text-gray-500 text-center">
              Template not available
            </p>
          )}
        </div>
      </div>
    );
  };

  // Close image viewer and cleanup
  const handleCloseImageViewer = () => {
    setIsImageViewerModalOpen(false);
    // Clean up blob URLs (both data URLs and blob URLs)
    if (imageViewerUrl) {
      // Only revoke if it's a blob URL (starts with 'blob:')
      // Data URLs (from FileReader.readAsDataURL) don't need to be revoked
      if (imageViewerUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageViewerUrl);
      }
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
      // Clear removeExistingFile flag when new file is selected (new file will replace old one)
      setRemoveExistingFile(false);

      // Validate file type (only PDF allowed)
      const allowedTypes = ['application/pdf'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF files are allowed.');
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
      // Validate required props
      if (!investigationRequest) {
        setError('Investigation request information is missing');
        setIsSubmitting(false);
        return;
      }

      if (!patient?.id && !patient?.patientId && !patient?.patient_id) {
        setError('Patient information is missing');
        setIsSubmitting(false);
        return;
      }

      const isUpdate = !!existingResult?.id;
      const testDate = existingResult?.testDate || existingResult?.test_date || new Date().toISOString().split('T')[0];
      const patientId = patient?.id || patient?.patientId || patient?.patient_id;

      // Create the test result data
      const testData = {
        testName: investigationRequest.investigationName || investigationRequest.investigation_name,
        testDate: testDate,
        result: result || '',
        notes: notes || '',
        testFile: isPSATest ? null : file, // Don't include file for PSA tests
        removeFile: removeExistingFile && !file // Remove file flag if user clicked remove and no new file
      };

      // Call the API to update or add the test result
      const resultResponse = isUpdate
        ? await investigationService.updateOtherTestResult(existingResult.id, testData)
        : await investigationService.addOtherTestResult(patientId, testData);

      if (resultResponse.success) {
        // Dispatch event to refresh investigation management table
        window.dispatchEvent(new CustomEvent('testResultAdded', {
          detail: {
            patientId: patientId, // Use the extracted patientId variable
            requestId: investigationRequest.id,
            testName: investigationRequest.investigationName || investigationRequest.investigation_name
          }
        }));

        // Call success callback
        if (onSuccess) {
          onSuccess(`Investigation result ${isUpdate ? 'updated' : 'added'} successfully!`, investigationRequest.id);
        }

        // Reset form and close
        handleClose();
      } else {
        setError(resultResponse.error || `Failed to ${isUpdate ? 'update' : 'add'} investigation result`);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Error submitting investigation result:', err);
      setError(err.message || 'An unexpected error occurred');
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
            {patient && (() => {
              // Try multiple possible property names for patient name
              // NOSONAR: patient.name, patient.patientName, patient.fullName, patient.first_name, patient.last_name, patient.firstName, and patient.lastName are validated in PropTypes.shape()
              const patientName = patient.name ||
                patient.patientName ||
                patient.fullName ||
                (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : null) ||
                (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : null) ||
                'Unknown Patient';
              return (
                <p className="text-xs text-gray-600 mt-0.5">
                  Patient: <span className="font-medium">{patientName}</span>
                </p>
              );
            })()}
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowRemoveFileConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors text-xs font-medium px-2 py-1 rounded hover:bg-red-100 flex items-center gap-1"
                            title="Remove existing file"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            Remove
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
                      accept=".pdf,application/pdf"
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
                        PDF only (max 10MB)
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
          {renderConsentFormSection()}
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
      <FullScreenPDFModal
        isOpen={isPDFViewerModalOpen}
        onClose={handleClosePDFViewer}
        pdfUrl={pdfViewerUrl}
        fileName={pdfViewerFileName}
        autoPrint={true}
      />

      {/* Image Viewer Modal */}
      <ImageViewerModal
        isOpen={isImageViewerModalOpen}
        onClose={handleCloseImageViewer}
        imageUrl={imageViewerUrl}
        fileName={imageViewerFileName}
      />

      {/* Remove File Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRemoveFileConfirm}
        onClose={() => setShowRemoveFileConfirm(false)}
        onConfirm={() => {
          setRemoveExistingFile(true);
          setShowRemoveFileConfirm(false);
        }}
        title="Remove File"
        message="Are you sure you want to remove this file? You can upload a new file to replace it."
        confirmText="Remove"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

AddInvestigationResultModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  investigationRequest: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    investigationName: PropTypes.string,
    investigation_name: PropTypes.string,
    status: PropTypes.string
  }),
  patient: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    patientId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    patient_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    patientName: PropTypes.string,
    fullName: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    first_name: PropTypes.string,
    last_name: PropTypes.string
  }),
  existingResult: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    testDate: PropTypes.string,
    test_date: PropTypes.string,
    result: PropTypes.string,
    notes: PropTypes.string,
    filePath: PropTypes.string,
    file_path: PropTypes.string,
    fileName: PropTypes.string,
    file_name: PropTypes.string
  }),
  onSuccess: PropTypes.func,
  isPSATest: PropTypes.bool,
  onStatusUpdate: PropTypes.func
};

export default AddInvestigationResultModal;












