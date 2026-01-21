import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { IoClose, IoChevronDown } from 'react-icons/io5';
import { patientService } from '../services/patientService';

const ReassignUrologistModal = ({ isOpen, onClose, patient, onReassigned }) => {
  const [urologists, setUrologists] = useState([]);
  const [loadingUrologists, setLoadingUrologists] = useState(false);
  const [selectedUrologist, setSelectedUrologist] = useState(null);
  const [selectedUrologistId, setSelectedUrologistId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Fetch urologists when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUrologists();
      // Reset state
      setSelectedUrologist(null);
      setSelectedUrologistId(null);
      setError(null);
    }
  }, [isOpen]);

  const fetchUrologists = async () => {
    setLoadingUrologists(true);
    setError(null);

    try {
      const result = await patientService.getAllUrologists();
      if (result.success) {
        // Filter out current urologist if patient has one
        const currentUrologist = patient?.assignedUrologist || patient?.assigned_urologist;
        let filteredUrologists = result.data || [];
        
        // Only filter if patient has an assigned urologist
        if (currentUrologist && currentUrologist !== 'Not assigned' && currentUrologist.trim() !== '') {
          filteredUrologists = filteredUrologists.filter(u => {
            const urologistName = u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim();
            return urologistName !== currentUrologist;
          });
        }
        
        setUrologists(filteredUrologists);
      } else {
        setError(result.error || 'Failed to load urologists');
      }
    } catch (err) {
      console.error('Error fetching urologists:', err);
      setError('Failed to load urologists');
    } finally {
      setLoadingUrologists(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedUrologistId) {
      setError('Please select a urologist');
      return;
    }

    setIsReassigning(true);
    setError(null);

    try {
      const result = await patientService.reassignUrologist(patient.id, selectedUrologistId);

      if (result.success) {
        // Dispatch event to refresh patient list and appointments
        window.dispatchEvent(new CustomEvent('patient:reassigned', {
          detail: {
            patientId: patient.id,
            previousUrologist: result.data.previousUrologist,
            newUrologist: result.data.newUrologist,
            appointmentsUpdated: result.data.appointmentsUpdated,
            appointmentsRescheduled: result.data.appointmentsRescheduled
          }
        }));

        if (onReassigned) {
          onReassigned(result.data);
        }

        onClose();
      } else {
        setError(result.error || 'Failed to reassign urologist');
      }
    } catch (err) {
      console.error('Error reassigning urologist:', err);
      setError('Failed to reassign urologist. Please try again.');
    } finally {
      setIsReassigning(false);
    }
  };

  if (!isOpen) return null;

  const currentUrologist = patient?.assignedUrologist || patient?.assigned_urologist || 'Not assigned';
  const hasAssignedUrologist = currentUrologist && currentUrologist !== 'Not assigned' && currentUrologist.trim() !== '';
  const modalTitle = hasAssignedUrologist ? 'Reassign Urologist' : 'Assign Urologist';
  const buttonText = hasAssignedUrologist ? 'Reassign Urologist' : 'Assign Urologist';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isReassigning}
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Assignment */}
          {hasAssignedUrologist && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Current Urologist</p>
              <p className="text-base font-medium text-gray-900">{currentUrologist}</p>
            </div>
          )}

          {/* Patient Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Patient</p>
            <p className="text-base font-medium text-gray-900">
              {patient?.first_name} {patient?.last_name} ({patient?.upi})
            </p>
          </div>

          {/* Urologist Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select New Urologist <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <div
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white cursor-pointer flex items-center justify-between transition-colors hover:border-gray-400"
                onClick={() => !isReassigning && setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className={selectedUrologist ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedUrologist || 'Choose a urologist...'}
                </span>
                <IoChevronDown
                  className={`text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {loadingUrologists ? (
                    <div className="px-3 py-2 text-center text-gray-500 text-sm">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mx-auto mb-1"></div>
                      Loading urologists...
                    </div>
                  ) : !urologists || urologists.length === 0 ? (
                    <div className="px-3 py-2 text-center text-gray-500 text-sm">
                      No urologists available
                    </div>
                  ) : (
                    urologists.map((urologist) => {
                      const urologistName = urologist.name || `${urologist.first_name || ''} ${urologist.last_name || ''}`.trim();
                      return (
                        <div
                          key={urologist.id}
                          className="px-3 py-2 hover:bg-teal-50 cursor-pointer text-sm transition-colors border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            setSelectedUrologist(urologistName);
                            setSelectedUrologistId(urologist.id);
                            setIsDropdownOpen(false);
                            setError(null);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-gray-900">{urologistName}</span>
                            {urologist.specialization && (
                              <span className="text-teal-600 text-xs">{urologist.specialization}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> {hasAssignedUrologist ? 'Reassigning' : 'Assigning'} will update all future appointments to the {hasAssignedUrologist ? 'new' : 'selected'} urologist. 
              If there are scheduling conflicts, appointments will be automatically rescheduled to available slots.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isReassigning}
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={!selectedUrologistId || isReassigning}
            className="px-4 py-2 text-sm font-medium text-teal-700 bg-teal-100 border border-teal-400 rounded-lg hover:bg-teal-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isReassigning ? (
              <>
                <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
                {hasAssignedUrologist ? 'Reassigning...' : 'Assigning...'}
              </>
            ) : (
              buttonText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

ReassignUrologistModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  patient: PropTypes.object.isRequired,
  onReassigned: PropTypes.func
};

export default ReassignUrologistModal;
