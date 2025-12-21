import React, { useState, useEffect } from 'react';
import { IoClose, IoCalendar, IoFlask } from 'react-icons/io5';
import { investigationService } from '../../services/investigationService';
import { getPSAStatusByAge, getPSAThresholdByAge } from '../../utils/psaStatusByAge';

const AddPSAResultModal = ({ isOpen, onClose, patient, onSuccess }) => {
  // Get today's date in YYYY-MM-DD format for the date input
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    testDate: getTodayDate(),
    result: '',
    notes: '',
    status: 'Normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form with today's date when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayDate = `${year}-${month}-${day}`;
      
      setFormData({
        testDate: todayDate,
        result: '',
        notes: '',
        status: 'Normal'
      });
      setErrors({});
      setIsAdded(false);
    }
  }, [isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-determine status based on PSA result and patient age
    let newStatus = 'Normal';
    if (name === 'result' && value) {
      const psaValue = parseFloat(value);
      if (!isNaN(psaValue)) {
        // Get patient age for age-based status determination
        const patientAge = patient?.age || patient?.patientAge || null;
        const statusResult = getPSAStatusByAge(psaValue, patientAge);
        newStatus = statusResult.status;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
      status: name === 'result' ? newStatus : prev.status
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };


  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.testDate) {
      newErrors.testDate = 'Test date is required';
    }
    
    if (!formData.result) {
      newErrors.result = 'PSA result is required';
    } else if (isNaN(parseFloat(formData.result))) {
      newErrors.result = 'PSA result must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const submitData = {
        ...formData,
        referenceRange: '0.0 - 4.0' // Default reference range
      };
      
      const result = await investigationService.addPSAResult(patient.id, submitData);
      
      if (result.success) {
        setIsSubmitting(false);
        setIsAdded(true);
        
        // Trigger custom events to refresh tables
        const refreshEvent = new CustomEvent('testResultAdded', {
          detail: {
            patientId: patient.id,
            testName: 'psa',
            testDate: formData.testDate
          }
        });
        window.dispatchEvent(refreshEvent);
        
        // Also dispatch PSA-specific event for PatientList and InvestigationManagement
        const psaAddedEvent = new CustomEvent('psaResultAdded', {
          detail: {
            patientId: patient.id,
            testName: 'psa',
            testDate: formData.testDate
          }
        });
        window.dispatchEvent(psaAddedEvent);
        
        // Call onSuccess with skipModal flag to refresh data without showing modal
        if (onSuccess) {
          onSuccess('PSA result added successfully!', true);
        }
        
        // Reset form
        setFormData({
          testDate: getTodayDate(),
          result: '',
          notes: '',
          status: 'Normal'
        });
        
        // Show "Added" for 1 second, then close modal
        setTimeout(() => {
          setIsAdded(false);
          onClose();
        }, 1000);
      } else {
        setErrors({ submit: result.error || 'Failed to add PSA result' });
        setIsSubmitting(false);
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred. Please try again.' });
      console.error('Error adding PSA result:', error);
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <IoFlask className="w-6 h-6" />
              <h2 className="text-xl font-semibold">Add PSA Result</h2>
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
          <div className="space-y-4">
            {/* Test Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="testDate"
                  value={formData.testDate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                    errors.testDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <IoCalendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.testDate && (
                <p className="text-red-500 text-sm mt-1">{errors.testDate}</p>
              )}
            </div>

            {/* PSA Result */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PSA Result (ng/mL) *
              </label>
              <input
                type="number"
                step="0.1"
                name="result"
                value={formData.result}
                onChange={handleInputChange}
                placeholder="e.g., 3.2"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                  errors.result ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.result && (
                <p className="text-red-500 text-sm mt-1">{errors.result}</p>
              )}
            </div>

            {/* Status - Auto-determined based on age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status (Auto-determined based on age)
              </label>
              {(() => {
                const patientAge = patient?.age || patient?.patientAge || null;
                const psaValue = parseFloat(formData.result);
                const statusInfo = !isNaN(psaValue) ? getPSAStatusByAge(psaValue, patientAge) : { status: 'Normal', message: 'Enter PSA value' };
                const threshold = patientAge ? getPSAThresholdByAge(patientAge) : 4.0;
                
                return (
                  <div className={`w-full px-3 py-2 border rounded-lg ${
                    statusInfo.status === 'High' ? 'border-red-300 bg-red-50' :
                    statusInfo.status === 'Elevated' ? 'border-orange-300 bg-orange-50' :
                    statusInfo.status === 'Low' ? 'border-yellow-300 bg-yellow-50' :
                    'border-green-300 bg-green-50'
                  }`}>
                    <span className={`font-medium ${
                      statusInfo.status === 'High' ? 'text-red-700' :
                      statusInfo.status === 'Elevated' ? 'text-orange-700' :
                      statusInfo.status === 'Low' ? 'text-yellow-700' :
                      'text-green-700'
                    }`}>
                      {statusInfo.status}
                    </span>
                    <div className="text-xs text-gray-600 mt-1">
                      {patientAge ? (
                        <span>Age {patientAge}: {statusInfo.message || `Threshold: ${threshold} ng/mL`}</span>
                      ) : (
                        <span>Age not available: Using standard threshold (4.0 ng/mL)</span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional notes about the PSA result..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
              />
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAdded}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>
                {isAdded ? 'Added' : isSubmitting ? 'Adding...' : 'Add PSA Result'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPSAResultModal;
