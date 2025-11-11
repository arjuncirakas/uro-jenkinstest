import React, { useState } from 'react';
import { IoClose, IoDocument, IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { Upload } from 'lucide-react';
import { investigationService } from '../services/investigationService';

const AddInvestigationResultModal = ({ isOpen, onClose, investigationRequest, patient, onSuccess }) => {
  const [result, setResult] = useState('');
  const [referenceRange, setReferenceRange] = useState('');
  const [status, setStatus] = useState('Normal');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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
        referenceRange: referenceRange || '',
        status: status,
        notes: notes || '',
        testFile: file
      };

      console.log('🔍 Submitting investigation result:', {
        ...testData,
        testFile: file ? file.name : 'No file'
      });
      
      // Call the API to add the test result
      const resultResponse = await investigationService.addOtherTestResult(patient.id, testData);
      
      if (resultResponse.success) {
        console.log('✅ Investigation result added:', resultResponse.data);
        
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
    setReferenceRange('');
    setStatus('Normal');
    setNotes('');
    setFile(null);
    setFileName('');
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Add Investigation Result</h2>
            {patient && (
              <p className="text-sm text-gray-600 mt-1">
                Patient: <span className="font-medium">{patient.name}</span>
              </p>
            )}
            <p className="text-sm text-purple-600 mt-1">
              Investigation: <span className="font-medium">{investigationRequest.investigationName || investigationRequest.investigation_name}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6">
            {/* Result */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Result Value
              </label>
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="e.g., 5.2 ng/mL, Positive, Negative"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Reference Range */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Range
              </label>
              <input
                type="text"
                value={referenceRange}
                onChange={(e) => setReferenceRange(e.target.value)}
                placeholder="e.g., 0.0 - 4.0 ng/mL, Normal range"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                required
              >
                <option value="Normal">Normal</option>
                <option value="Elevated">Elevated</option>
                <option value="Low Risk">Low Risk</option>
                <option value="Intermediate">Intermediate</option>
                <option value="High Risk">High Risk</option>
                <option value="Available">Available</option>
                <option value="Not Available">Not Available</option>
              </select>
            </div>

            {/* Upload Report */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Report
              </label>
              {file ? (
                // Show attached file
                <div className="border-2 border-teal-400 bg-teal-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <IoDocument className="w-6 h-6 text-teal-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-teal-900 truncate">
                          {fileName}
                        </p>
                        <p className="text-xs text-teal-700 mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
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
                // Show upload area
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
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
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, JPG, PNG, DOC, DOCX (max 10MB)
                    </p>
                  </label>
                </div>
              )}
              {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Clinical Notes / Interpretation
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Enter interpretation, recommendations, or additional notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 resize-none"
              />
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
          {/* Error Message */}
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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












