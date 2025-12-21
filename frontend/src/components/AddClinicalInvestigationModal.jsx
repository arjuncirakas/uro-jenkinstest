import React, { useState, useEffect } from 'react';
import { IoClose, IoPrint, IoCloudUpload } from 'react-icons/io5';
import { FaFlask, FaXRay, FaMicroscope } from 'react-icons/fa';
import { Eye, Upload, FileText } from 'lucide-react';
import { notesService } from '../services/notesService';
import { consentFormService } from '../services/consentFormService';

const AddClinicalInvestigationModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [selectedInvestigationTypes, setSelectedInvestigationTypes] = useState([]); // Changed to array for multi-select
  const [testNamesByType, setTestNamesByType] = useState({}); // Object to store test names for each investigation type
  const [customTestNames, setCustomTestNames] = useState({}); // Object to store custom test names for each type
  const [customTestConsentRequired, setCustomTestConsentRequired] = useState({}); // Object to store consent required flag for custom tests
  const [customTestConsentData, setCustomTestConsentData] = useState({}); // Object to store consent form data for custom tests (file only)
  const [isUrgent, setIsUrgent] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Consent form state
  const [consentFormTemplates, setConsentFormTemplates] = useState([]);
  const [patientConsentForms, setPatientConsentForms] = useState([]);
  const [loadingConsentForms, setLoadingConsentForms] = useState(false);

  // Fetch consent forms when modal opens
  useEffect(() => {
    if (isOpen && patient?.id) {
      fetchConsentForms();
    }
  }, [isOpen, patient?.id]);

  const fetchConsentForms = async () => {
    const patientId = patient?.id || patient?.patientId || patient?.patient_id;
    if (!patientId) return;

    setLoadingConsentForms(true);
    try {
      // Fetch templates
      const templatesResponse = await consentFormService.getConsentFormTemplates();
      if (templatesResponse.success) {
        setConsentFormTemplates(templatesResponse.data || []);
      }

      // Fetch patient consent forms
      const patientFormsResponse = await consentFormService.getPatientConsentForms(patientId);
      if (patientFormsResponse.success) {
        setPatientConsentForms(patientFormsResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching consent forms:', error);
    } finally {
      setLoadingConsentForms(false);
    }
  };

  // Get consent form template for a test
  const getConsentFormTemplate = (testName) => {
    const normalizedTestName = testName.toUpperCase();
    return consentFormTemplates.find(t => 
      (t.test_name && t.test_name.toUpperCase() === normalizedTestName) ||
      (t.procedure_name && t.procedure_name.toUpperCase() === normalizedTestName)
    );
  };

  // Get patient consent form for a test
  const getPatientConsentForm = (testName) => {
    const normalizedTestName = testName.toUpperCase();
    return patientConsentForms.find(cf => {
      if (cf.consent_form_name) {
        const consentFormName = cf.consent_form_name.toUpperCase();
        if (consentFormName === normalizedTestName) {
          return true;
        }
      }
      const template = consentFormTemplates.find(t => t.id === cf.template_id || t.id === cf.consent_form_id);
      if (template) {
        return (template.test_name && template.test_name.toUpperCase() === normalizedTestName) ||
               (template.procedure_name && template.procedure_name.toUpperCase() === normalizedTestName);
      }
      return false;
    });
  };

  // Print consent form
  const handlePrintConsentForm = async (template, testName) => {
    if (!template || !patient) return;

    try {
      if (template.is_auto_generated) {
        const printWindow = window.open('', '_blank');
        const name = template.procedure_name || template.test_name || testName;
        const type = template.procedure_name ? 'Procedure' : 'Test';
        const dateOfBirth = patient.dateOfBirth || patient.date_of_birth || '';
        const formattedDOB = dateOfBirth ? new Date(dateOfBirth).toLocaleDateString('en-GB') : '';
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${name} Consent Form</title>
            <style>
              @media print {
                @page { margin: 20mm; }
                body { margin: 0; }
              }
              body {
                font-family: 'Arial', sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
                background: white;
              }
              .header {
                text-align: center;
                border-bottom: 3px solid #0d9488;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              h1 {
                color: #0d9488;
                font-size: 28px;
                margin: 0;
                font-weight: 700;
              }
              .subtitle {
                color: #6b7280;
                font-size: 14px;
                margin-top: 5px;
              }
              .section {
                margin-bottom: 30px;
              }
              .patient-info {
                padding: 20px;
                background: #f9fafb;
                border-left: 4px solid #0d9488;
                border-radius: 4px;
              }
              .signature-section {
                margin-top: 40px;
                padding-top: 30px;
                border-top: 2px solid #e5e7eb;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>CONSENT FORM</h1>
              <p class="subtitle">${type} Consent</p>
            </div>
            <div class="section">
              <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 15px; font-weight: 600;">${name.toUpperCase()}</h2>
              <p style="color: #4b5563; line-height: 1.6; font-size: 14px;">
                I hereby give my consent for the ${template.procedure_name ? 'procedure' : 'test'} mentioned above to be performed on me.
              </p>
            </div>
            <div class="patient-info">
              <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Patient Information</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
                <div>
                  <strong style="color: #374151;">Patient Name:</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${patient.name || patient.fullName || '_________________________'}</p>
                </div>
                <div>
                  <strong style="color: #374151;">Date of Birth:</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${formattedDOB || '_________________________'}</p>
                </div>
                <div>
                  <strong style="color: #374151;">Hospital Number (UPI):</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${patient.upi || '_________________________'}</p>
                </div>
                <div>
                  <strong style="color: #374151;">Age:</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${patient.age ? `${patient.age} years` : '_________________________'}</p>
                </div>
                <div>
                  <strong style="color: #374151;">Date:</strong>
                  <p style="color: #1f2937; margin-top: 5px; font-weight: 500; border-bottom: 1px solid #9ca3af; min-height: 20px;">${new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>
            <div class="section">
              <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 15px; font-weight: 600;">Procedure/Test Details</h3>
              <p style="color: #4b5563; line-height: 1.8; font-size: 14px; margin-bottom: 15px;">
                I understand that the ${template.procedure_name ? 'procedure' : 'test'} involves:
              </p>
              <ul style="color: #4b5563; line-height: 1.8; font-size: 14px; padding-left: 20px;">
                <li>Explanation of the ${template.procedure_name ? 'procedure' : 'test'} has been provided to me</li>
                <li>I have been informed about the benefits and potential risks</li>
                <li>I have had the opportunity to ask questions</li>
                <li>I understand that I can withdraw my consent at any time</li>
              </ul>
            </div>
            <div class="signature-section">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
                <div>
                  <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Patient Signature:</strong></p>
                  <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                  <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
                </div>
                <div>
                  <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Witness Signature:</strong></p>
                  <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                  <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
                </div>
              </div>
              <div>
                <p style="color: #374151; font-size: 14px; margin-bottom: 10px;"><strong>Doctor/Healthcare Provider Signature:</strong></p>
                <div style="border-bottom: 2px solid #9ca3af; height: 50px; margin-bottom: 10px;"></div>
                <p style="color: #6b7280; font-size: 12px;">Date: _________________</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = () => {
          printWindow.print();
        };
      } else if (template.template_file_url) {
        const printWindow = window.open(template.template_file_url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          };
        }
      }
    } catch (error) {
      console.error('Error printing consent form:', error);
      alert('Failed to print consent form. Please try again.');
    }
  };

  if (!isOpen) return null;

  const investigationTypes = [
    { value: 'psa', label: 'PSA Test', icon: FaFlask },
    { value: 'trus', label: 'TRUS', icon: FaXRay },
    { value: 'mri', label: 'MRI', icon: FaXRay },
    { value: 'biopsy', label: 'Biopsy', icon: FaMicroscope },
    { value: 'custom', label: 'Custom Test', icon: FaFlask },
  ];

  // Separate custom test from other types for better layout
  const standardTypes = investigationTypes.filter(t => t.value !== 'custom');
  const customType = investigationTypes.find(t => t.value === 'custom');

  const commonTests = {
    psa: ['PSA Total', 'PSA Free', 'PSA Ratio', 'PSA Density'],
    trus: ['TRUS Guided Biopsy', 'TRUS Volume Assessment'],
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

      // Create consent form templates for custom tests if consent is required
      const consentFormPromises = [];
      if (selectedInvestigationTypes.includes('custom') && customTestConsentRequired['custom']) {
        const customName = customTestNames['custom'];
        const consentData = customTestConsentData['custom'];
        if (customName && consentData) {
          consentFormPromises.push(
            consentFormService.createConsentFormTemplate({
              procedure_name: customName,
              test_name: '',
              is_auto_generated: false,
              template_file: consentData.template_file || null
            })
          );
        }
      }

      // Create clinical note directly (not an appointment)
      const result = await notesService.addNote(patient.id, {
        noteContent,
        noteType: 'clinical_investigation'
      });
      
      if (result.success) {
        console.log('✅ Clinical investigation note created:', result.data);
        
        // Create consent form templates if needed
        if (consentFormPromises.length > 0) {
          try {
            await Promise.all(consentFormPromises);
            console.log('✅ Consent form templates created for custom tests');
          } catch (consentError) {
            console.error('❌ Failed to create consent form templates:', consentError);
            // Don't fail the whole operation if consent form creation fails
          }
        }
        
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
    setCustomTestConsentRequired({});
    setCustomTestConsentData({});
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
            <div className="space-y-3">
              {/* Standard Investigation Types */}
              <div className="grid grid-cols-2 gap-3">
                {standardTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedInvestigationTypes.includes(type.value);
                  const testsForType = testNamesByType[type.value] || [];
                  
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
                    {isSelected && (
                      <div className="mt-3">
                        <label className="block text-xs font-semibold text-gray-700 mb-2">
                          Test/Procedure Name <span className="text-red-500">*</span>
                          <span className="text-gray-400 text-xs ml-1 font-normal">(Select one or more)</span>
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                          {commonTests[type.value]?.map((test) => {
                            const isChecked = testsForType.includes(test);
                            const consentTemplate = getConsentFormTemplate(test);
                            const patientConsentForm = getPatientConsentForm(test);
                            // Check for uploaded signed form - only consider it signed if it's manually uploaded
                            // Auto-attached forms have file_path set to template paths, which should not be considered "signed"
                            const filePath = patientConsentForm?.file_path || 
                                             patientConsentForm?.filePath ||
                                             patientConsentForm?.signed_file_path ||
                                             patientConsentForm?.signed_filePath;
                            
                            // Only consider it signed if the file path indicates a manually uploaded file
                            // (starts with 'uploads/consent-forms/patients/') and not a template reference
                            const hasUploadedForm = filePath && 
                              filePath.startsWith('uploads/consent-forms/patients/') &&
                              !filePath.includes('templates/') &&
                              !filePath.includes('auto-generated');
                            const requiresConsent = ['biopsy', 'trus', 'mri'].includes(type.value.toLowerCase());
                            
                            return (
                              <div key={test} className="mb-2">
                                <label className="flex items-center p-2.5 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTestNameToggle(type.value, test)}
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 cursor-pointer"
                                  />
                                  <span className="ml-3 text-sm text-gray-700 font-medium flex-1">{test}</span>
                                </label>
                                
                                {/* Consent Form Section for Biopsy, TRUS, MRI */}
                                {isChecked && requiresConsent && (
                                  <div className="ml-7 mt-2 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-semibold text-gray-700">Consent Form</span>
                                      {hasUploadedForm && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                          Signed
                                        </span>
                                      )}
                                      {!consentTemplate && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">
                                          Template Not Available
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => consentTemplate && handlePrintConsentForm(consentTemplate, test)}
                                        disabled={!consentTemplate}
                                        className={`px-2 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${
                                          consentTemplate
                                            ? 'text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100'
                                            : 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'
                                        }`}
                                      >
                                        <IoPrint className="w-3 h-3" />
                                        Print
                                      </button>
                                      <label className={`px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                                        consentTemplate
                                          ? 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100'
                                          : 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed'
                                      }`}>
                                        <IoCloudUpload className="w-3 h-3" />
                                        {hasUploadedForm ? 'Re-upload' : 'Upload Signed'}
                                        <input
                                          type="file"
                                          accept=".pdf,image/*"
                                          onChange={async (e) => {
                                            const file = e.target.files[0];
                                            if (file && consentTemplate && patient?.id) {
                                              const result = await consentFormService.uploadConsentForm(patient.id, consentTemplate.id, file);
                                              if (result.success) {
                                                await fetchConsentForms();
                                                alert('Consent form uploaded successfully');
                                              } else {
                                                alert('Failed to upload consent form: ' + result.error);
                                              }
                                            }
                                            e.target.value = '';
                                          }}
                                          className="hidden"
                                          disabled={!consentTemplate}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                )}
                              </div>
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
                  </div>
                );
              })}
              </div>
              
              {/* Custom Test Section - Full Width */}
              {customType && (() => {
                const Icon = customType.icon;
                const isSelected = selectedInvestigationTypes.includes(customType.value);
                const customNameForType = customTestNames[customType.value] || '';
                
                return (
                  <div className="w-full">
                    <label className="cursor-pointer">
                      <div className={`p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-teal-400 hover:bg-teal-50/30'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleInvestigationTypeToggle(customType.value)}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 focus:ring-2 cursor-pointer"
                        />
                        <Icon className={`text-lg ${isSelected ? 'text-teal-600' : 'text-gray-500'}`} />
                        <span className="font-medium text-sm">{customType.label}</span>
                      </div>
                    </label>
                    
                    {/* Show Custom Test Name input directly below Custom Test button */}
                    {isSelected && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-2">
                            Custom Test Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={customNameForType}
                            onChange={(e) => setCustomTestNames(prev => ({
                              ...prev,
                              [customType.value]: e.target.value
                            }))}
                            placeholder="Enter custom test name..."
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white"
                            required
                          />
                        </div>
                        
                        {/* Consent Required Checkbox */}
                        <div className="bg-purple-50 rounded-lg border border-purple-200 p-3">
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={customTestConsentRequired[customType.value] || false}
                              onChange={(e) => {
                                setCustomTestConsentRequired(prev => ({
                                  ...prev,
                                  [customType.value]: e.target.checked
                                }));
                                if (!e.target.checked) {
                                  // Clear consent data if unchecked
                                  setCustomTestConsentData(prev => {
                                    const newData = { ...prev };
                                    delete newData[customType.value];
                                    return newData;
                                  });
                                }
                              }}
                              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                            />
                            <div className="ml-3">
                              <span className="text-sm font-medium text-gray-800">Consent Form Required</span>
                              <p className="text-xs text-gray-600 mt-0.5">
                                This test requires a consent form
                              </p>
                            </div>
                          </label>
                        </div>
                        
                        {/* Consent Form Options (if consent required) */}
                        {customTestConsentRequired[customType.value] && customNameForType && (
                          <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 space-y-3">
                            <label className="block text-xs font-semibold text-gray-700">
                              Consent Form Template
                            </label>
                            
                            {/* Upload Template Option */}
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-2">
                                Upload Template File (PDF)
                              </label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-teal-500 transition-colors bg-white">
                                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                <label className="cursor-pointer">
                                  <span className="text-teal-600 hover:text-teal-700 font-medium text-xs">
                                    Choose a file
                                  </span>
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) => {
                                      const file = e.target.files[0];
                                      if (file) {
                                        if (file.type !== 'application/pdf') {
                                          alert('Only PDF files are allowed');
                                          return;
                                        }
                                        if (file.size > 10 * 1024 * 1024) {
                                          alert('File size must be less than 10MB');
                                          return;
                                        }
                                        setCustomTestConsentData(prev => ({
                                          ...prev,
                                          [customType.value]: {
                                            ...prev[customType.value],
                                            template_file: file
                                          }
                                        }));
                                      }
                                      e.target.value = '';
                                    }}
                                    className="hidden"
                                  />
                                </label>
                                <p className="text-xs text-gray-500 mt-1">PDF up to 10MB</p>
                                {customTestConsentData[customType.value]?.template_file && (
                                  <div className="mt-2 text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block">
                                    {customTestConsentData[customType.value].template_file.name}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
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

