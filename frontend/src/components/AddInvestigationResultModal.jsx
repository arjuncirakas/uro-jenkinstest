import React, { useState, useEffect } from 'react';
import { IoClose, IoDocument, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { FiX } from 'react-icons/fi';
import { Upload } from 'lucide-react';
import { investigationService } from '../services/investigationService';

const AddInvestigationResultModal = ({ isOpen, onClose, investigationRequest, patient, existingResult, onSuccess, isPSATest = false, onStatusUpdate }) => {
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
      <div className="bg-white rounded-lg max-w-xl w-full flex flex-col">
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

        {/* Form Content - No scrolling */}
        <div className="flex-1 overflow-visible">
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
          {onStatusUpdate && (
            <div className="px-4 pb-3 border-t border-gray-200 pt-3">
              <h3 className="text-xs font-semibold text-gray-700 mb-2">Or Update Status</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (onStatusUpdate) {
                      await onStatusUpdate('not_required');
                    }
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors font-medium border border-gray-300 flex items-center justify-center gap-1.5"
                >
                  <FiX className="w-3.5 h-3.5" />
                  Not Required
                </button>
              </div>
            </div>
          )}
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
    </div>
  );
};

export default AddInvestigationResultModal;












