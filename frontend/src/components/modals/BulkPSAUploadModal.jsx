import React, { useState, useEffect } from 'react';
import { IoClose, IoCalendar, IoFlask, IoCloudUpload, IoTrash, IoAdd } from 'react-icons/io5';
import { investigationService } from '../../services/investigationService';
import { getPSAStatusByAge } from '../../utils/psaStatusByAge';

const BulkPSAUploadModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [psaEntries, setPsaEntries] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize with one empty entry
  useEffect(() => {
    if (isOpen) {
      setPsaEntries([{
        testDate: getTodayDate(),
        result: '',
        notes: '',
        status: 'Normal'
      }]);
      setUploadedFile(null);
      setFilePreview(null);
      setErrors({});
      setSubmitError('');
    }
  }, [isOpen]);

  // Handle file upload and auto-parse
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type - PDF, DOC, DOCX, XLS, XLSX, CSV
    const validTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|xls|xlsx|doc|docx|csv)$/i)) {
      setSubmitError('Invalid file type. Please upload a PDF, Excel (.xls, .xlsx), Word document (.doc, .docx), or CSV file.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitError('File size exceeds 10MB limit.');
      return;
    }

    setUploadedFile(file);
    setSubmitError('');
    setFilePreview(null); // No preview for PDF/DOC/Excel files

    // Automatically parse the file
    setIsParsing(true);
    try {
      const result = await investigationService.parsePSAFile(file);
      
      if (result.success && result.data && result.data.psaEntries && result.data.psaEntries.length > 0) {
        // Auto-populate the table with extracted PSA entries
        setPsaEntries(result.data.psaEntries);
        setSubmitError('');
      } else {
        // If parsing failed or no entries found, keep one empty entry
        if (result.error) {
          setSubmitError(`Could not automatically extract PSA values: ${result.error}. Please enter them manually.`);
        } else {
          setSubmitError('No PSA values found in the file. Please enter them manually.');
        }
        // Keep at least one empty entry for manual entry
        if (psaEntries.length === 0) {
          setPsaEntries([{
            testDate: getTodayDate(),
            result: '',
            notes: '',
            status: 'Normal'
          }]);
        }
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setSubmitError('Failed to parse file. Please enter PSA values manually.');
      // Keep at least one empty entry for manual entry
      if (psaEntries.length === 0) {
        setPsaEntries([{
          testDate: getTodayDate(),
          result: '',
          notes: '',
          status: 'Normal'
        }]);
      }
    } finally {
      setIsParsing(false);
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setSubmitError('');
    setPsaEntries([{
      testDate: getTodayDate(),
      result: '',
      notes: '',
      status: 'Normal'
    }]);
    // Reset file input
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Add a new PSA entry
  const handleAddEntry = () => {
    setPsaEntries([...psaEntries, {
      testDate: getTodayDate(),
      result: '',
      notes: '',
      status: 'Normal'
    }]);
  };

  // Remove a PSA entry
  const handleRemoveEntry = (index) => {
    if (psaEntries.length > 1) {
      setPsaEntries(psaEntries.filter((_, i) => i !== index));
      // Clear error for removed entry
      const newErrors = { ...errors };
      delete newErrors[`date-${index}`];
      delete newErrors[`result-${index}`];
      setErrors(newErrors);
    }
  };

  // Handle input change for a specific entry
  const handleEntryChange = (index, field, value) => {
    const updatedEntries = [...psaEntries];
    
    // Auto-determine status based on PSA result and patient age
    if (field === 'result' && value) {
      const psaValue = parseFloat(value);
      if (!isNaN(psaValue)) {
        // Get patient age for age-based status determination
        const patientAge = patient?.age || patient?.patientAge || null;
        const statusResult = getPSAStatusByAge(psaValue, patientAge);
        updatedEntries[index].status = statusResult.status;
      }
    }
    
    updatedEntries[index][field] = value;
    setPsaEntries(updatedEntries);
    
    // Clear error when user starts typing
    const errorKey = `${field}-${index}`;
    if (errors[errorKey]) {
      const newErrors = { ...errors };
      delete newErrors[errorKey];
      setErrors(newErrors);
    }
  };

  // Validate all entries
  const validateEntries = () => {
    const newErrors = {};
    
    psaEntries.forEach((entry, index) => {
      if (!entry.testDate) {
        newErrors[`date-${index}`] = 'Test date is required';
      }
      
      if (!entry.result) {
        newErrors[`result-${index}`] = 'PSA result is required';
      } else if (isNaN(parseFloat(entry.result))) {
        newErrors[`result-${index}`] = 'PSA result must be a valid number';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!uploadedFile) {
      setSubmitError('Please upload a file first.');
      return;
    }

    if (!validateEntries()) {
      setSubmitError('Please fix the errors in the form.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Submit each PSA entry
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const entry of psaEntries) {
        try {
          const submitData = {
            testDate: entry.testDate,
            result: entry.result,
            notes: entry.notes || `Bulk uploaded from ${uploadedFile.name}`,
            status: entry.status,
            referenceRange: '0.0 - 4.0',
            testFile: uploadedFile // Attach the same file to each entry
          };

          const result = await investigationService.addPSAResult(patient.id, submitData);
          
          if (result.success) {
            successCount++;
            results.push({ success: true, entry });
          } else {
            failureCount++;
            results.push({ success: false, entry, error: result.error });
          }
        } catch (error) {
          failureCount++;
          results.push({ success: false, entry, error: error.message });
        }
      }

      // Trigger refresh events
      const refreshEvent = new CustomEvent('testResultAdded', {
        detail: {
          patientId: patient.id,
          testName: 'psa'
        }
      });
      window.dispatchEvent(refreshEvent);

      const psaAddedEvent = new CustomEvent('psaResultAdded', {
        detail: {
          patientId: patient.id,
          testName: 'psa'
        }
      });
      window.dispatchEvent(psaAddedEvent);

      if (onSuccess) {
        onSuccess(
          `Successfully added ${successCount} PSA result(s).${failureCount > 0 ? ` ${failureCount} failed.` : ''}`,
          true
        );
      }

      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setSubmitError('An unexpected error occurred. Please try again.');
      console.error('Error submitting bulk PSA results:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IoCloudUpload className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Upload PSA Results from File</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <IoClose className="w-6 h-6" />
            </button>
          </div>
          <p className="text-teal-100 mt-1">for {patient?.fullName || patient?.name || 'Patient'}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload File (PDF, Excel, Word, CSV) *
              </label>
              
              {/* Show upload area only if no file is uploaded */}
              {!uploadedFile && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileChange}
                    accept=".pdf,.xls,.xlsx,.doc,.docx,.csv"
                    className="hidden"
                    disabled={isParsing}
                  />
                  <label htmlFor="file-upload" className={`cursor-pointer ${isParsing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {isParsing ? (
                      <>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-2"></div>
                        <p className="text-sm text-gray-600 mb-1">Parsing file and extracting PSA values...</p>
                      </>
                    ) : (
                      <>
                        <IoCloudUpload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 mb-1">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500">
                          Supports: PDF, Excel (.xls, .xlsx), Word (.doc, .docx), CSV (Max 10MB) - Values will be extracted automatically
                        </p>
                      </>
                    )}
                  </label>
                </div>
              )}

              {/* Show file info with remove button when file is uploaded */}
              {uploadedFile && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <IoCloudUpload className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">
                            {uploadedFile.name}
                          </p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            {(uploadedFile.size / 1024).toFixed(2)} KB
                            {isParsing && ' • Parsing file and extracting PSA values...'}
                            {!isParsing && ' • PSA values extracted automatically'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="ml-4 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center space-x-1"
                      disabled={isParsing}
                    >
                      <IoTrash className="w-4 h-4" />
                      <span className="text-sm">Remove</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PSA Entries Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  PSA Results from File *
                </label>
                <button
                  type="button"
                  onClick={handleAddEntry}
                  className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-1"
                >
                  <IoAdd className="w-4 h-4" />
                  <span>Add Row</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">PSA Value (ng/mL)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Notes</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-600 w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {psaEntries.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="relative">
                            <input
                              type="date"
                              value={entry.testDate}
                              onChange={(e) => handleEntryChange(index, 'testDate', e.target.value)}
                              className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                                errors[`date-${index}`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            <IoCalendar className="absolute right-2 top-2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                          {errors[`date-${index}`] && (
                            <p className="text-red-500 text-xs mt-0.5">{errors[`date-${index}`]}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.1"
                            value={entry.result}
                            onChange={(e) => handleEntryChange(index, 'result', e.target.value)}
                            placeholder="e.g., 3.2"
                            className={`w-full px-2 py-1.5 text-sm border rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                              errors[`result-${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {errors[`result-${index}`] && (
                            <p className="text-red-500 text-xs mt-0.5">{errors[`result-${index}`]}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {(() => {
                            const patientAge = patient?.age || patient?.patientAge || null;
                            const psaValue = parseFloat(entry.result);
                            const statusInfo = !isNaN(psaValue) && entry.result ? getPSAStatusByAge(psaValue, patientAge) : { status: entry.status || 'Normal' };
                            
                            return (
                              <div className={`px-2 py-1.5 text-xs font-medium rounded ${
                                statusInfo.status === 'High' ? 'bg-red-100 text-red-700' :
                                statusInfo.status === 'Elevated' ? 'bg-orange-100 text-orange-700' :
                                statusInfo.status === 'Low' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`} title={patientAge && !isNaN(psaValue) && entry.result ? `Age ${patientAge}: ${statusInfo.message || statusInfo.status}` : ''}>
                                {statusInfo.status}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={entry.notes}
                            onChange={(e) => handleEntryChange(index, 'notes', e.target.value)}
                            placeholder="Optional notes"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {psaEntries.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEntry(index)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Remove row"
                            >
                              <IoTrash className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Enter the PSA values and dates from the uploaded file. You can add multiple rows for multiple test results.
              </p>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{submitError}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !uploadedFile}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>
                {isSubmitting ? 'Uploading...' : `Upload ${psaEntries.length} PSA Result(s)`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkPSAUploadModal;

