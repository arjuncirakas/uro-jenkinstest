import React, { useState, useEffect } from 'react';
import { IoCloudUpload, IoDocument, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { investigationService } from '../../services/investigationService';
import {
  validatePSAForm,
  createInputChangeHandler,
  dispatchPSAEvents,
  PSAStatusDisplay,
  PSAModalHeader,
  TestDateInput,
  PSAResultInput,
  NotesInput,
  ErrorMessage,
  ActionButtons,
  PSAModalWrapper
} from './PSAModalShared';
import PropTypes from 'prop-types';

// File upload utilities (only PDF allowed)
const ALLOWED_FILE_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const EditPSAResultModal = ({ isOpen, onClose, patient, psaResult, onSuccess }) => {
  const [formData, setFormData] = useState({
    testDate: '',
    result: '',
    notes: '',
    status: 'Normal'
  });
  const [testFile, setTestFile] = useState(null);
  const [existingFileName, setExistingFileName] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const patientAge = patient?.age || patient?.patientAge || null;

  // Initialize form with existing data
  useEffect(() => {
    if (psaResult && isOpen) {
      const testDate = psaResult.testDate || psaResult.test_date;
      let formattedDate = '';
      if (testDate) {
        formattedDate = testDate.includes('T') ? testDate.split('T')[0] : testDate.split(' ')[0];
      }

      setFormData({
        testDate: formattedDate,
        result: psaResult.result || '',
        notes: psaResult.notes || '',
        status: psaResult.status || 'Normal'
      });

      if (psaResult.filePath || psaResult.file_path) {
        setExistingFileName(psaResult.fileName || psaResult.file_name || 'Existing file');
      } else {
        setExistingFileName(null);
      }
      setTestFile(null);
      setErrors({});
    }
  }, [psaResult, isOpen]);

  const handleInputChange = createInputChangeHandler(setFormData, setErrors, errors, patientAge);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setErrors(prev => ({ ...prev, file: 'Please select a PDF, DOC, or DOCX file. Image files are not supported.' }));
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrors(prev => ({ ...prev, file: 'File size must be less than 10MB' }));
        return;
      }

      setTestFile(file);
      setErrors(prev => ({ ...prev, file: '' }));
    }
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setTestFile(null);
    const fileInput = document.getElementById('editPsaFile');
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validatePSAForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        referenceRange: '0.0 - 4.0',
        testFile: testFile
      };

      const result = await investigationService.updatePSAResult(psaResult.id, submitData);

      if (result.success) {
        onSuccess('PSA result updated successfully!');
        dispatchPSAEvents(patient.id, formData.testDate, 'updated');
        onClose();
      } else {
        setErrors({ submit: result.error || 'Failed to update PSA result' });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
      console.error('Error updating PSA result:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const patientName = patient?.fullName || patient?.name || 'Patient';

  return (
    <PSAModalWrapper>
      <PSAModalHeader
        title="Edit PSA Result"
        patientName={patientName}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          <TestDateInput
            value={formData.testDate}
            onChange={handleInputChange}
            error={errors.testDate}
          />

          <PSAResultInput
            value={formData.result}
            onChange={handleInputChange}
            error={errors.result}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status (Auto-determined based on age)
            </label>
            <PSAStatusDisplay
              psaValue={parseFloat(formData.result)}
              patientAge={patientAge}
            />
          </div>

          {/* File Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attach PSA Report (Optional)
            </label>
            {existingFileName && !testFile && (
              <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <IoDocument className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-blue-900">Current file: {existingFileName}</span>
                </div>
                <p className="text-xs text-blue-700 mt-1">Upload a new file to replace it</p>
              </div>
            )}
            {testFile ? (
              <div className="border-2 border-teal-400 bg-teal-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <IoDocument className="w-6 h-6 text-teal-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-teal-900 truncate">{testFile.name}</p>
                      <p className="text-xs text-teal-700 mt-0.5">{formatFileSize(testFile.size)}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      <IoCheckmarkCircle className="w-5 h-5 text-green-500" />
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Remove file"
                      >
                        <IoCloseCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-teal-400 transition-colors">
                <input
                  type="file"
                  id="editPsaFile"
                  onChange={handleFileChange}
                  accept=".pdf"
                  className="hidden"
                />
                <label htmlFor="editPsaFile" className="cursor-pointer block">
                  <IoCloudUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {existingFileName ? 'Click to upload new file' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PDF only (max 10MB)</p>
                </label>
              </div>
            )}
            {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file}</p>}
          </div>

          <NotesInput
            value={formData.notes}
            onChange={handleInputChange}
          />

          <ErrorMessage message={errors.submit} />
        </div>

        <ActionButtons
          onCancel={onClose}
          isSubmitting={isSubmitting}
          submitText="Update PSA Result"
          submittingText="Updating..."
        />
      </form>
    </PSAModalWrapper>
  );
};

EditPSAResultModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  patient: PropTypes.object,
  psaResult: PropTypes.object,
  onSuccess: PropTypes.func
};

export default EditPSAResultModal;
