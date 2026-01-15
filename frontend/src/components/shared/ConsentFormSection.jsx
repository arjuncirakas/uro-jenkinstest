import React from 'react';
import { IoPrint, IoCloudUpload } from 'react-icons/io5';
import { Eye } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Shared component for rendering consent form section in patient details modals
 * Reduces duplication between UrologistPatientDetailsModal and NursePatientDetailsModal
 */
const ConsentFormSection = ({
  investigationName,
  templateToUse,
  hasUploadedForm,
  printingConsentForm,
  uploadingConsentForms,
  getPrintButtonTitle,
  handlePrintConsentForm,
  handleConsentFormUpload,
  handleViewConsentForm,
  patientConsentForm,
  showErrorAlert = false,
  onErrorAlert,
  isNotRequired = false
}) => {

  return (
    <div className="w-full max-w-full mt-4 pt-4 border-t border-gray-200 box-border">
      <div className="flex items-center justify-between mb-3 w-full">
        <span className="text-xs font-semibold text-gray-700">Consent Form</span>
        <div className="flex items-center gap-2">
          {hasUploadedForm && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Signed</span>
          )}
          {!templateToUse && (
            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Template Not Available</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap mb-2 w-full">
        <button
          type="button"
          onClick={() => templateToUse && !isNotRequired && handlePrintConsentForm(templateToUse, investigationName)}
          disabled={!templateToUse || printingConsentForm === investigationName || isNotRequired}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${templateToUse && printingConsentForm !== investigationName && !isNotRequired
            ? 'text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100'
            : 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'}`}
          title={isNotRequired
            ? 'Test is marked as Not Required. Consent form actions are disabled.'
            : getPrintButtonTitle(templateToUse, printingConsentForm === investigationName)}
        >
          {printingConsentForm === investigationName ? (
            <>
              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading...</span>
            </>
          ) : (
            <>
              <IoPrint className="w-3 h-3" />
              Print
            </>
          )}
        </button>
        <label className={`px-3 py-1.5 text-xs font-medium rounded transition-colors flex items-center gap-1.5 ${templateToUse && !isNotRequired
            ? 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 cursor-pointer'
            : 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'
          }`}
        >
          <IoCloudUpload className="w-3 h-3" />
          {hasUploadedForm ? `Re-upload Signed ${investigationName}` : `Upload Signed ${investigationName}`}
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && templateToUse && !isNotRequired) {
                handleConsentFormUpload(investigationName, templateToUse, file);
              } else if (file && !templateToUse) {
                if (showErrorAlert && onErrorAlert) {
                  onErrorAlert('Consent form template not available. Please create one in the superadmin panel first.');
                } else {
                  alert('Consent form template not available. Please create one in the superadmin panel first.');
                }
              } else if (file && isNotRequired) {
                if (showErrorAlert && onErrorAlert) {
                  onErrorAlert('Test is marked as Not Required. Consent form actions are disabled.');
                } else {
                  alert('Test is marked as Not Required. Consent form actions are disabled.');
                }
              }
              e.target.value = '';
            }}
            className="hidden"
            disabled={!templateToUse || uploadingConsentForms[investigationName.toLowerCase()] || isNotRequired}
          />
        </label>
      </div>
      {hasUploadedForm && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => handleViewConsentForm(patientConsentForm)}
            className="w-full px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3 h-3" />
            View {investigationName} Consent Form
          </button>
        </div>
      )}
    </div>
  );
};

ConsentFormSection.propTypes = {
  investigationName: PropTypes.string.isRequired,
  templateToUse: PropTypes.object,
  hasUploadedForm: PropTypes.bool.isRequired,
  printingConsentForm: PropTypes.oneOfType([PropTypes.string, PropTypes.oneOf([null])]),
  uploadingConsentForms: PropTypes.object.isRequired,
  getPrintButtonTitle: PropTypes.func.isRequired,
  handlePrintConsentForm: PropTypes.func.isRequired,
  handleConsentFormUpload: PropTypes.func.isRequired,
  handleViewConsentForm: PropTypes.func.isRequired,
  patientConsentForm: PropTypes.object,
  showErrorAlert: PropTypes.bool,
  onErrorAlert: PropTypes.func,
  isNotRequired: PropTypes.bool
};

export default ConsentFormSection;

