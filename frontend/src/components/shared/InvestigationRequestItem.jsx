import React, { useState, useEffect } from 'react';
import { Eye, Edit } from 'lucide-react';
import PropTypes from 'prop-types';
import ConsentFormSection from './ConsentFormSection';
import InvestigationResultItem from './InvestigationResultItem';
import { computeConsentFormData } from '../../utils/consentFormHelpers';

/**
 * Shared component for rendering investigation request items
 * Reduces duplication between UrologistPatientDetailsModal and NursePatientDetailsModal
 */
const InvestigationRequestItem = ({
  request,
  investigationName,
  hasResults,
  uploadedResult,
  sortedResults,
  patient,
  consentFormTemplates,
  printingConsentForm,
  uploadingConsentForms,
  getConsentFormTemplate,
  getPatientConsentForm,
  getPrintButtonTitle,
  handlePrintConsentForm,
  handleConsentFormUpload,
  handleViewConsentForm,
  handleEditResult,
  handleViewFile,
  renderUploadButton,
  investigationService,
  setErrorModalTitle,
  setErrorModalMessage,
  setIsErrorModalOpen,
  setSuccessModalTitle,
  setSuccessModalMessage,
  setIsSuccessModalOpen,
  fetchInvestigationRequests,
  showErrorAlert = false
}) => {
  const handleViewClick = () => {
    if (uploadedResult?.filePath) {
      if (handleViewFile) {
        handleViewFile(uploadedResult.filePath);
      } else {
        // Normalize the file path - remove 'uploads/' prefix if present
        // The backend middleware expects paths relative to uploads directory
        let normalizedPath = uploadedResult.filePath;
        if (normalizedPath.startsWith('uploads/') || normalizedPath.startsWith('uploads\\')) {
          normalizedPath = normalizedPath.replace(/^uploads[/\\]/, '');
        }
        
        // Encode the file path properly for URL
        let encodedPath = normalizedPath;
        if (normalizedPath.includes('/')) {
          const pathSegments = normalizedPath.split('/');
          encodedPath = pathSegments
            .map(segment => segment ? encodeURIComponent(segment) : '')
            .filter(segment => segment !== '')
            .join('/');
        } else {
          encodedPath = encodeURIComponent(normalizedPath);
        }
        
        const fileUrl = uploadedResult.filePath.startsWith('http')
          ? uploadedResult.filePath
          : `${import.meta.env.VITE_API_URL || 'https://uroprep.ahimsa.global/api'}/investigations/files/${encodedPath}`;
        window.open(fileUrl, '_blank');
      }
    } else {
      // If no filePath, scroll to results or show a message
      // The results are already visible below, so we can just ensure they're in view
      const resultElement = document.querySelector(`[data-result-id="${uploadedResult?.id}"]`);
      if (resultElement) {
        resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const handleEditClick = () => {
    handleEditResult(request, uploadedResult);
  };

  const renderActionButtons = () => {
    if (hasResults) {
      // Show View button if there are results, regardless of filePath
      // Show Edit button only if there's a filePath to edit
      const hasFilePath = uploadedResult?.filePath;
      return (
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleViewClick}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 ${
              hasFilePath
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 opacity-75 cursor-pointer'
            }`}
            title={hasFilePath ? `View ${investigationName} result file` : 'View result details'}
          >
            <Eye className="w-3 h-3" />
            View {investigationName} Result
          </button>
          {hasFilePath && (
            <button
              onClick={handleEditClick}
              className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded border border-teal-200 hover:bg-teal-100 transition-colors flex items-center gap-1.5"
              title="Edit/Re-upload result"
            >
              <Edit className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }
    return renderUploadButton(request, investigationName);
  };

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' or 'error'

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleStatusUpdate = async (newStatus) => {
    if (!request.id || request.isClinicalInvestigation) return;
    try {
      const result = await investigationService.updateInvestigationRequestStatus(request.id, newStatus);
      if (result && result.success) {
        fetchInvestigationRequests();
        window.dispatchEvent(new CustomEvent('investigationStatusUpdated', {
          detail: { patientId: patient?.id, testName: investigationName, status: newStatus }
        }));
        
        // Show toast notification instead of modal
        if (newStatus === 'not_required') {
          setToastMessage('Investigation status updated to NOT REQUIRED.');
          setToastType('success');
        } else {
          setToastMessage('Investigation status updated to REQUIRED.');
          setToastType('success');
        }
      }
    } catch (error) {
      setToastMessage('Failed to update investigation request status');
      setToastType('error');
    }
  };

  const handleMarkAsRequired = async () => {
    await handleStatusUpdate('pending');
  };

  const handleMarkAsNotRequired = async () => {
    await handleStatusUpdate('not_required');
  };

  const consentFormData = computeConsentFormData(
    investigationName,
    getConsentFormTemplate,
    getPatientConsentForm,
    consentFormTemplates
  );

  return (
    <div key={`request-${request.id}`} className="bg-gray-50 rounded-md p-4 border border-gray-200 hover:border-gray-300 transition-colors w-full">
      <div className="flex items-start justify-between gap-4 mb-3 w-full">
        <div className="flex items-center gap-2 flex-1">
          <h5 className="font-semibold text-gray-900 text-base">{investigationName}</h5>
          {(request.status || '').toLowerCase() === 'not_required' && (
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full border border-gray-200">
              Not Required
            </span>
          )}
        </div>
        <div className="flex-shrink-0">
          {renderActionButtons()}
        </div>
      </div>

      <div className="w-full">
        {/* Show all result details inline */}
        {hasResults && sortedResults.length > 0 && (
          <div className="space-y-3 w-full">
              {sortedResults.map((result, idx) => (
                <InvestigationResultItem
                  key={result.id || idx}
                  result={result}
                  index={idx}
                  totalResults={sortedResults.length}
                />
              ))}
            </div>
        )}

        {!hasResults && request.notes && (
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Notes: </span>
            <span>{request.notes}</span>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className={`mt-3 p-2.5 rounded-md border text-xs font-medium transition-all ${
            toastType === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}>
            {toastMessage}
          </div>
        )}

        {/* Status update controls */}
        {!hasResults && !request.isClinicalInvestigation && request.id && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {(request.status || '').toLowerCase() === 'not_required' ? (
              <button
                onClick={handleMarkAsRequired}
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-300"
              >
                Required
              </button>
            ) : (
              <button
                onClick={handleMarkAsNotRequired}
                className="px-3 py-1.5 text-xs font-medium rounded transition-colors bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-300"
              >
                Not Required
              </button>
            )}
          </div>
        )}

        {/* Consent Form Section */}
        {!consentFormData.isPSATest && (() => {
          const handleErrorAlert = showErrorAlert ? (message) => {
            setErrorModalTitle('Error');
            setErrorModalMessage(message);
            setIsErrorModalOpen(true);
          } : undefined;

          const isNotRequired = (request.status || '').toLowerCase() === 'not_required';

          return (
            <ConsentFormSection
              investigationName={investigationName}
              templateToUse={consentFormData.templateToUse}
              hasUploadedForm={consentFormData.hasUploadedForm}
              printingConsentForm={printingConsentForm}
              uploadingConsentForms={uploadingConsentForms}
              getPrintButtonTitle={getPrintButtonTitle}
              handlePrintConsentForm={handlePrintConsentForm}
              handleConsentFormUpload={handleConsentFormUpload}
              handleViewConsentForm={handleViewConsentForm}
              patientConsentForm={consentFormData.patientConsentForm}
              showErrorAlert={showErrorAlert}
              onErrorAlert={handleErrorAlert}
              isNotRequired={isNotRequired}
            />
          );
        })()}
      </div>
    </div>
  );
};

InvestigationRequestItem.propTypes = {
  request: PropTypes.object.isRequired,
  investigationName: PropTypes.string.isRequired,
  hasResults: PropTypes.bool.isRequired,
  uploadedResult: PropTypes.object,
  sortedResults: PropTypes.array.isRequired,
  patient: PropTypes.object.isRequired,
  consentFormTemplates: PropTypes.array.isRequired,
  printingConsentForm: PropTypes.bool.isRequired,
  uploadingConsentForms: PropTypes.object.isRequired,
  getConsentFormTemplate: PropTypes.func.isRequired,
  getPatientConsentForm: PropTypes.func.isRequired,
  getPrintButtonTitle: PropTypes.func.isRequired,
  handlePrintConsentForm: PropTypes.func.isRequired,
  handleConsentFormUpload: PropTypes.func.isRequired,
  handleViewConsentForm: PropTypes.func.isRequired,
  handleEditResult: PropTypes.func.isRequired,
  handleViewFile: PropTypes.func,
  renderUploadButton: PropTypes.func.isRequired,
  investigationService: PropTypes.object.isRequired,
  setErrorModalTitle: PropTypes.func.isRequired,
  setErrorModalMessage: PropTypes.func.isRequired,
  setIsErrorModalOpen: PropTypes.func.isRequired,
  setSuccessModalTitle: PropTypes.func.isRequired,
  setSuccessModalMessage: PropTypes.func.isRequired,
  setIsSuccessModalOpen: PropTypes.func.isRequired,
  fetchInvestigationRequests: PropTypes.func.isRequired,
  showErrorAlert: PropTypes.bool
};

export default InvestigationRequestItem;

