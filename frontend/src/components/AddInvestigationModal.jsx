import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { FaFlask, FaStethoscope, FaXRay, FaMicroscope } from 'react-icons/fa';
import { investigationService } from '../services/investigationService';

const AddInvestigationModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [selectedInvestigationTypes, setSelectedInvestigationTypes] = useState([]); // Changed to array for multi-select
  const [testNamesByType, setTestNamesByType] = useState({}); // Object to store test names for each investigation type
  const [customTestNames, setCustomTestNames] = useState({}); // Object to store custom test names for each type
  const [priority, setPriority] = useState('routine');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const investigationTypes = [
    { value: 'psa', label: 'PSA Test', icon: FaFlask },
    { value: 'trus', label: 'TRUS', icon: FaXRay },
    { value: 'mri', label: 'MRI', icon: FaXRay },
    { value: 'biopsy', label: 'Biopsy', icon: FaMicroscope },
    { value: 'custom', label: 'Custom Test', icon: FaFlask },
  ];

  const commonTests = {
    psa: ['PSA Total', 'PSA Free', 'PSA Ratio', 'PSA Velocity', 'PSA Density'],
    trus: ['TRUS Prostate', 'TRUS Guided Biopsy', 'TRUS Volume Assessment'],
    mri: ['MRI Prostate', 'MRI Pelvis', 'MRI Abdomen', 'Multi-parametric MRI'],
    biopsy: ['Prostate Biopsy', 'Transperineal Biopsy', 'Transrectal Biopsy', 'Fusion Biopsy', 'Template Biopsy'],
    custom: ['Custom Test'],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setError('');
    setIsSubmitting(true);
    
    try {
      // Validate patient ID
      if (!patient || !patient.id) {
        setError('Patient information is missing');
        setIsSubmitting(false);
        return;
      }

      // Validate required fields
      if (selectedInvestigationTypes.length === 0) {
        setError('Please select at least one investigation type');
        setIsSubmitting(false);
        return;
      }

      // Collect all investigation requests - one per investigation type with its tests
      const requestsToSubmit = [];
      
      selectedInvestigationTypes.forEach(invType => {
        if (invType === 'custom') {
          const customName = customTestNames[invType];
          if (customName && customName.trim() !== '') {
            requestsToSubmit.push({
              investigationType: invType,
              testNames: null,
              customTestName: customName,
              priority,
              notes,
              scheduledDate: scheduledDate && scheduledDate.trim() !== '' ? scheduledDate.trim() : null,
              scheduledTime: null
            });
          }
        } else {
          const testsForType = testNamesByType[invType] || [];
          const validTests = testsForType.filter(name => name && name.trim() !== '' && name !== 'other');
          if (validTests.length > 0) {
            requestsToSubmit.push({
              investigationType: invType,
              testNames: validTests,
              customTestName: null,
              priority,
              notes,
              scheduledDate: scheduledDate && scheduledDate.trim() !== '' ? scheduledDate.trim() : null,
              scheduledTime: null
            });
          }
        }
      });
      
      if (requestsToSubmit.length === 0) {
        setError('Please select at least one test/procedure for the selected investigation type(s)');
        setIsSubmitting(false);
        return;
      }
      
      // Only include scheduledDate if it's explicitly provided and not empty
      const hasScheduledDate = scheduledDate && scheduledDate.trim() !== '';
      
      // Submit all investigation requests
      const results = await Promise.all(
        requestsToSubmit.map(requestData => 
          investigationService.createInvestigationRequest(patient.id, requestData)
        )
      );
      
      // Check if all requests were successful
      const allSuccessful = results.every(result => result.success);
      const failedCount = results.filter(result => !result.success).length;
      
      if (allSuccessful) {
        console.log('✅ All investigation requests created:', results.length);
        
        // Call success callback
        if (onSuccess) {
          const message = results.length === 1 
            ? 'Investigation request created successfully!'
            : `${results.length} investigation requests created successfully!`;
          onSuccess(message);
        }
        
        // Reset form and close
        handleClose();
      } else {
        console.error('❌ Some investigation requests failed:', failedCount);
        setError(`${failedCount} of ${requestsToSubmit.length} investigation request(s) failed. Please try again.`);
        setIsSubmitting(false);
      }

      console.log('🔍 Submitting investigation request with multiple tests:', requestData);
      
      // Call the API - backend will create multiple requests
      const result = await investigationService.createInvestigationRequest(patient.id, requestData);
      
      if (result.success) {
        console.log('✅ Investigation request(s) created:', result.data);
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result.message || 'Investigation request(s) created successfully!');
        }
        
        // Reset form and close
        handleClose();
      } else {
        console.error('❌ Failed to create investigation request:', result.error);
        setError(result.error || 'Failed to create investigation request');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('❌ Error creating investigation request:', err);
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedInvestigationTypes([]);
    setTestNamesByType({});
    setCustomTestNames({});
    setPriority('routine');
    setNotes('');
    setScheduledDate('');
    setError('');
    setIsSubmitting(false);
    onClose();
  };

  // Handle investigation type toggle
  const handleInvestigationTypeToggle = (typeValue) => {
    setSelectedInvestigationTypes(prev => {
      if (prev.includes(typeValue)) {
        // Remove if already selected - also clear its test names
        const newTypes = prev.filter(t => t !== typeValue);
        setTestNamesByType(prevTests => {
          const newTests = { ...prevTests };
          delete newTests[typeValue];
          return newTests;
        });
        setCustomTestNames(prevCustom => {
          const newCustom = { ...prevCustom };
          delete newCustom[typeValue];
          return newCustom;
        });
        return newTypes;
      } else {
        // Add if not selected
        return [...prev, typeValue];
      }
    });
  };

  // Handle checkbox change for multi-select test names
  const handleTestNameToggle = (invType, testName) => {
    if (testName === 'other') {
      return;
    }
    
    setTestNamesByType(prev => {
      const testsForType = prev[invType] || [];
      if (testsForType.includes(testName)) {
        // Remove if already selected
        return {
          ...prev,
          [invType]: testsForType.filter(name => name !== testName)
        };
      } else {
        // Add if not selected
        return {
          ...prev,
          [invType]: [...testsForType, testName]
        };
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Request New Investigation</h2>
            {patient && (() => {
              // Try multiple possible property names for patient name
              const patientName = patient.name || 
                                patient.patientName || 
                                patient.fullName ||
                                (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : null) ||
                                (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : null);
              return patientName ? (
                <p className="text-sm text-gray-600 mt-1">
                  Patient: <span className="font-medium">{patientName}</span>
                </p>
              ) : null;
            })()}
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
          {/* Investigation Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Investigation Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {investigationTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedInvestigationTypes.includes(type.value);
                const testsForType = testNamesByType[type.value] || [];
                const customNameForType = customTestNames[type.value] || '';
                
                return (
                  <div key={type.value} className="flex flex-col">
                    <label className="cursor-pointer">
                      <div className={`p-4 rounded-lg border transition-colors flex items-center gap-3 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleInvestigationTypeToggle(type.value)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                        />
                        <Icon className="text-lg" />
                        <span className="font-medium text-sm">{type.label}</span>
                      </div>
                    </label>
                    
                    {/* Show Test Name multi-select checkboxes directly below selected investigation type */}
                    {isSelected && type.value !== 'custom' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Test/Procedure Name <span className="text-red-500">*</span>
                          <span className="text-gray-400 text-xs ml-1">(Select one or more)</span>
                        </label>
                        <div className="border border-gray-300 rounded-lg p-2 max-h-48 overflow-y-auto bg-white">
                          {commonTests[type.value]?.map((test) => {
                            const isChecked = testsForType.includes(test);
                            return (
                              <label
                                key={test}
                                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTestNameToggle(type.value, test)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2"
                                />
                                <span className="ml-2 text-sm text-gray-700">{test}</span>
                              </label>
                            );
                          })}
                          {testsForType.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                {testsForType.length} test{testsForType.length !== 1 ? 's' : ''} selected
                              </p>
                            </div>
                          )}
                        </div>
                        {testsForType.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">Please select at least one test</p>
                        )}
                      </div>
                    )}
                    
                    {/* Show Custom Test Name input directly below Custom Test button */}
                    {isSelected && type.value === 'custom' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Custom Test Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={customNameForType}
                          onChange={(e) => setCustomTestNames(prev => ({
                            ...prev,
                            [type.value]: e.target.value
                          }))}
                          placeholder="Enter custom test name..."
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                          required
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


          {/* Priority */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {[
                { 
                  value: 'urgent', 
                  label: 'Urgent', 
                  color: 'red',
                  tooltip: 'Requires immediate attention - typically within 24-48 hours'
                },
                { 
                  value: 'soon', 
                  label: 'Soon', 
                  color: 'yellow',
                  tooltip: 'Should be scheduled within 1-2 weeks'
                },
                { 
                  value: 'routine', 
                  label: 'Routine', 
                  color: 'green',
                  tooltip: 'Standard scheduling - can be scheduled at next available appointment'
                },
              ].map((priorityOption) => (
                <div key={priorityOption.value} className="flex-1 relative group">
                  <button
                    type="button"
                    onClick={() => setPriority(priorityOption.value)}
                    className={`w-full px-3 py-2 rounded-lg border font-medium text-sm transition-colors ${
                      priority === priorityOption.value
                        ? `border-${priorityOption.color}-500 bg-${priorityOption.color}-50 text-${priorityOption.color}-700`
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {priorityOption.label}
                  </button>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap shadow-lg">
                      {priorityOption.tooltip}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduled Date - Optional */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date <span className="text-gray-400 text-xs">(Optional - leave blank for request only)</span>
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              onBlur={(e) => {
                // Clear if empty string
                if (!e.target.value || e.target.value.trim() === '') {
                  setScheduledDate('');
                }
              }}
              min={(() => {
                const now = new Date();
                return now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
              })()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
              placeholder="Leave blank to create request only (no appointment)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank to create an investigation request without scheduling an appointment
            </p>
          </div>

          {/* Clinical Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinical Notes / Reason for Request
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Please add your notes..."
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
              disabled={selectedInvestigationTypes.length === 0 || isSubmitting || (() => {
                // Check if at least one investigation type has tests selected
                for (const invType of selectedInvestigationTypes) {
                  if (invType === 'custom') {
                    if (customTestNames[invType] && customTestNames[invType].trim() !== '') {
                      return false; // Has custom test name
                    }
                  } else {
                    const tests = testNamesByType[invType] || [];
                    if (tests.length > 0) {
                      return false; // Has tests selected
                    }
                  }
                }
                return true; // No tests selected for any type
              })()}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Requesting...
                </>
              ) : (
                'Request Investigation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddInvestigationModal;

