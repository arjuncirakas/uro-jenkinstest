import React, { useState } from 'react';
import { IoClose } from 'react-icons/io5';
import { FaFlask, FaXRay, FaMicroscope } from 'react-icons/fa';
import { notesService } from '../services/notesService';

const AddClinicalInvestigationModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [selectedInvestigationTypes, setSelectedInvestigationTypes] = useState([]); // Changed to array for multi-select
  const [testNamesByType, setTestNamesByType] = useState({}); // Object to store test names for each investigation type
  const [customTestNames, setCustomTestNames] = useState({}); // Object to store custom test names for each type
  const [isUrgent, setIsUrgent] = useState(false);
  const [notes, setNotes] = useState('');
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

      // Collect all test names for all selected investigation types
      const allTests = [];
      const investigationTypesList = [];
      
      selectedInvestigationTypes.forEach(invType => {
        if (invType === 'custom') {
          const customName = customTestNames[invType];
          if (customName && customName.trim() !== '') {
            investigationTypesList.push('CUSTOM');
            allTests.push(`${invType.toUpperCase()}: ${customName}`);
          }
        } else {
          const testsForType = testNamesByType[invType] || [];
          const validTests = testsForType.filter(name => name && name.trim() !== '' && name !== 'other');
          if (validTests.length > 0) {
            investigationTypesList.push(invType.toUpperCase());
            validTests.forEach(test => {
              allTests.push(`${invType.toUpperCase()}: ${test}`);
            });
          }
        }
      });
      
      if (allTests.length === 0) {
        setError('Please select at least one test/procedure for the selected investigation type(s)');
        setIsSubmitting(false);
        return;
      }

      // Format test names for display (remove investigation type prefixes)
      const testNamesDisplay = allTests.map(test => {
        // Remove investigation type prefix if present (e.g., "PSA: PSA Total" -> "PSA Total")
        if (test.includes(':')) {
          return test.split(':').slice(1).join(':').trim();
        }
        return test;
      }).join(', ');

      // Determine priority based on checkbox
      const priority = isUrgent ? 'urgent' : 'routine';
      
      // Create clinical note content for clinical investigation
      const noteContent = `CLINICAL INVESTIGATION

Test/Procedure Name: ${testNamesDisplay}
Priority: ${priority.charAt(0).toUpperCase() + priority.slice(1)}
${notes ? `Clinical Notes:\n${notes}` : ''}`.trim();

      console.log('🔍 Creating clinical investigation note:', { patientId: patient.id, noteContent });

      // Create clinical note directly (not an appointment)
      const result = await notesService.addNote(patient.id, {
        noteContent,
        noteType: 'clinical_investigation'
      });
      
      if (result.success) {
        console.log('✅ Clinical investigation note created:', result.data);
        
        // Call success callback
        if (onSuccess) {
          onSuccess('Clinical investigation added successfully!');
        }
        
        // Reset form and close
        handleClose();
      } else {
        console.error('❌ Failed to create clinical investigation note:', result.error);
        setError(result.error || 'Failed to add clinical investigation');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('❌ Error creating clinical investigation note:', err);
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedInvestigationTypes([]);
    setTestNamesByType({});
    setCustomTestNames({});
    setIsUrgent(false);
    setNotes('');
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
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex-shrink-0 bg-teal-600 px-6 py-4 flex items-center justify-between border-b border-teal-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Add Clinical Investigation</h2>
            {patient && (() => {
              // Try multiple possible property names for patient name
              const patientName = patient.name || 
                                patient.patientName || 
                                patient.fullName ||
                                (patient.first_name && patient.last_name ? `${patient.first_name} ${patient.last_name}` : null) ||
                                (patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : null);
              return patientName ? (
                <p className="text-sm font-medium text-white mt-1">
                  {patientName}
                </p>
              ) : null;
            })()}
          </div>
          <button
            onClick={handleClose}
            className="text-white/90 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded"
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Investigation Type */}
          <div>
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
                      <div className={`p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-teal-400 hover:bg-teal-50/30'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleInvestigationTypeToggle(type.value)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 cursor-pointer"
                        />
                        <Icon className={`text-lg ${isSelected ? 'text-teal-600' : 'text-gray-500'}`} />
                        <span className="font-medium text-sm">{type.label}</span>
                      </div>
                    </label>
                    
                    {/* Show Test Name multi-select checkboxes directly below selected investigation type */}
                    {isSelected && type.value !== 'custom' && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                          Test/Procedure Name <span className="text-red-500">*</span>
                          <span className="text-gray-400 text-xs ml-1 font-normal">(Select one or more)</span>
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                          {commonTests[type.value]?.map((test) => {
                            const isChecked = testsForType.includes(test);
                            return (
                              <label
                                key={test}
                                className="flex items-center p-2.5 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTestNameToggle(type.value, test)}
                                  className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 cursor-pointer"
                                />
                                <span className="ml-3 text-sm text-gray-700 font-medium">{test}</span>
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
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
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
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white"
                          required
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Urgent Checkbox */}
          <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2 cursor-pointer"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-800">Urgent</span>
                <p className="text-xs text-gray-600 mt-0.5">
                  Requires immediate attention - typically within 24-48 hours
                </p>
              </div>
            </label>
          </div>

          {/* Clinical Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinical Notes / Reason for Investigation
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Enter clinical indication, symptoms, or reason for investigation..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none transition-all bg-white"
            />
          </div>

          </form>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 bg-white border-t border-gray-300 px-6 py-4">
          {/* Error Message */}
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Adding...
                </>
              ) : (
                'Add Clinical Investigation'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddClinicalInvestigationModal;

