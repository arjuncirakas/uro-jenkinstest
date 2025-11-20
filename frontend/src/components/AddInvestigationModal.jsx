import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { FaFlask, FaStethoscope, FaXRay, FaMicroscope } from 'react-icons/fa';
import { investigationService } from '../services/investigationService';

const AddInvestigationModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [investigationType, setInvestigationType] = useState('');
  const [testName, setTestName] = useState('');
  const [customTestName, setCustomTestName] = useState('');
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

      // Handle form submission logic here
      const finalTestName = investigationType === 'custom' ? customTestName : testName;
      
      const requestData = {
        investigationType,
        testName: investigationType !== 'custom' ? testName : null,
        customTestName: investigationType === 'custom' ? customTestName : null,
        priority,
        notes,
        scheduledDate: scheduledDate || null,
        scheduledTime: null // Can be added later if needed
      };

      console.log('🔍 Submitting investigation request:', requestData);
      
      // Call the API
      const result = await investigationService.createInvestigationRequest(patient.id, requestData);
      
      if (result.success) {
        console.log('✅ Investigation request created:', result.data);
        
        // Call success callback
        if (onSuccess) {
          onSuccess('Investigation request created successfully!');
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
    setInvestigationType('');
    setTestName('');
    setCustomTestName('');
    setPriority('routine');
    setNotes('');
    setScheduledDate('');
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
            <h2 className="text-xl font-semibold text-gray-900">Request New Investigation</h2>
            {patient && (
              <p className="text-sm text-gray-600 mt-1">
                Patient: <span className="font-medium">{patient.name}</span>
              </p>
            )}
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
                const isSelected = investigationType === type.value;
                return (
                  <div key={type.value} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => {
                        setInvestigationType(type.value);
                        setTestName('');
                        setCustomTestName('');
                      }}
                      className={`p-4 rounded-lg border transition-colors flex items-center gap-3 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="text-lg" />
                      <span className="font-medium text-sm">{type.label}</span>
                    </button>
                    
                    {/* Show Test Name dropdown directly below selected investigation type */}
                    {isSelected && type.value !== 'custom' && (
                      <div className="mt-3">
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Test/Procedure Name <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={testName}
                          onChange={(e) => setTestName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                          required
                        >
                          <option value="">Select a test...</option>
                          {commonTests[type.value]?.map((test) => (
                            <option key={test} value={test}>
                              {test}
                            </option>
                          ))}
                          <option value="other">Other (specify in notes)</option>
                        </select>
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
                          value={customTestName}
                          onChange={(e) => setCustomTestName(e.target.value)}
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
                { value: 'urgent', label: 'Urgent', color: 'red' },
                { value: 'soon', label: 'Soon', color: 'yellow' },
                { value: 'routine', label: 'Routine', color: 'green' },
              ].map((priorityOption) => (
                <button
                  key={priorityOption.value}
                  type="button"
                  onClick={() => setPriority(priorityOption.value)}
                  className={`flex-1 px-3 py-2 rounded-lg border font-medium text-sm transition-colors ${
                    priority === priorityOption.value
                      ? `border-${priorityOption.color}-500 bg-${priorityOption.color}-50 text-${priorityOption.color}-700`
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {priorityOption.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scheduled Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={(() => {
                const now = new Date();
                return now.getFullYear() + '-' + 
                       String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(now.getDate()).padStart(2, '0');
              })()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
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
              placeholder="Enter clinical indication, symptoms, or reason for investigation..."
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
              disabled={!investigationType || (investigationType === 'custom' ? !customTestName : !testName) || isSubmitting}
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

