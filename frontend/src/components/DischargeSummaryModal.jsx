import React, { useState, useEffect } from 'react';
import { IoClose, IoCloudUpload, IoDocument, IoTrash, IoAdd, IoCalendar } from 'react-icons/io5';
import { FaFilePdf, FaFileWord, FaFileImage, FaPills } from 'react-icons/fa';

const DischargeSummaryModal = ({ isOpen, onClose, onSubmit, patient, pathway }) => {
  const getInitialFormData = () => {
    return {
      // admissionDate removed

      dischargeDate: new Date().toISOString().split('T')[0],
      dischargeTime: new Date().toTimeString().slice(0, 5),
      diagnosis: {
        primary: '',
        secondary: '',
        procedure: ''
      },
      procedure: {
        name: '',
        date: '',
        surgeon: '',
        complications: ''
      },
      clinicalSummary: '',
      investigations: [],
      medications: [
        { name: '', dose: '', frequency: '', duration: '', instructions: '' }
      ],
      followUp: {
        gpFollowUp: '',
        redFlags: ''
      },
      gpActions: [],
      additionalNotes: ''
    };
  };

  const [formData, setFormData] = useState(getInitialFormData());
  const [documents, setDocuments] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [errors, setErrors] = useState({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setDocuments([]);
      setErrors({});
    }
  }, [isOpen, patient]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleArrayChange = (index, value) => {
    setFormData(prev => {
      const newActions = [...prev.gpActions];
      newActions[index] = value;
      return { ...prev, gpActions: newActions };
    });
  };

  const addGPAction = () => {
    setFormData(prev => ({
      ...prev,
      gpActions: [...prev.gpActions, '']
    }));
  };

  const removeGPAction = (index) => {
    setFormData(prev => ({
      ...prev,
      gpActions: prev.gpActions.filter((_, i) => i !== index)
    }));
  };

  // Medication Handlers
  const handleMedicationChange = (index, field, value) => {
    setFormData(prev => {
      const newMedications = [...prev.medications];
      newMedications[index] = { ...newMedications[index], [field]: value };
      return { ...prev, medications: newMedications };
    });
  };

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, { name: '', dose: '', frequency: '', duration: '', instructions: '' }]
    }));
  };

  const removeMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      // Create FormData for file upload
      const uploadedDocs = files.map(file => ({
        id: Date.now() + Math.random(),
        name: file.name,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        type: file.type,
        file: file
      }));

      setDocuments(prev => [...prev, ...uploadedDocs]);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploadingFile(false);
    }
  };

  const removeDocument = (docId) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId));
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return <FaFilePdf className="text-red-500" />;
    if (fileType.includes('word') || fileType.includes('doc')) return <FaFileWord className="text-blue-500" />;
    if (fileType.includes('image')) return <FaFileImage className="text-green-500" />;
    return <IoDocument className="text-gray-500" />;
  };

  const validateForm = () => {
    const newErrors = {};


    if (!formData.dischargeDate) newErrors.dischargeDate = 'Discharge date is required';
    if (!formData.clinicalSummary.trim()) newErrors.clinicalSummary = 'Clinical summary is required';
    if (!formData.diagnosis.primary.trim()) newErrors.diagnosisPrimary = 'Primary diagnosis is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      alert('Please fill in all required fields');
      return;
    }

    // Prepare documents array with only metadata (no file objects for JSON serialization)
    const documentMetadata = documents.map(doc => ({
      name: doc.name,
      size: doc.size,
      type: doc.type
    }));

    // Calculate admission date (hidden from user but required by backend)
    let admissionDate = '';
    if (patient?.createdAt || patient?.created_at) {
      const date = new Date(patient.createdAt || patient.created_at);
      if (!isNaN(date.getTime())) {
        admissionDate = date.toISOString().split('T')[0];
      }
    }
    // Fallback to today if no creation date
    if (!admissionDate) {
      admissionDate = new Date().toISOString().split('T')[0];
    }

    onSubmit({
      ...formData,
      admissionDate: admissionDate,
      documents: documentMetadata,
      additionalNotes: formData.additionalNotes
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-4 flex items-center justify-between rounded-t-lg flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">
              {pathway === 'Post-op Transfer' ? 'Surgical Discharge Summary' : 'Discharge Summary'}
            </h2>
            <p className="text-teal-100 text-sm mt-1">
              {patient?.fullName || patient?.name} • UPI: {patient?.upi}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/10 p-2 rounded transition-colors"
          >
            <IoClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">

            {/* Admission & Discharge Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Discharge Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discharge Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dischargeDate}
                    onChange={(e) => handleInputChange('dischargeDate', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.dischargeDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.dischargeDate && <p className="text-red-500 text-xs mt-1">{errors.dischargeDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discharge Time
                  </label>
                  <input
                    type="time"
                    value={formData.dischargeTime}
                    onChange={(e) => handleInputChange('dischargeTime', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Diagnosis</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Diagnosis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.diagnosis.primary}
                    onChange={(e) => handleNestedChange('diagnosis', 'primary', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.diagnosisPrimary ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {errors.diagnosisPrimary && <p className="text-red-500 text-xs mt-1">{errors.diagnosisPrimary}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Diagnosis / Medical History
                  </label>
                  <textarea
                    value={formData.diagnosis.secondary}
                    onChange={(e) => handleNestedChange('diagnosis', 'secondary', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                {pathway === 'Post-op Transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Procedure Performed
                    </label>
                    <input
                      type="text"
                      value={formData.diagnosis.procedure}
                      onChange={(e) => handleNestedChange('diagnosis', 'procedure', e.target.value)}
                      placeholder="e.g., Radical Prostatectomy, TURP"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Procedure Details - Only for Post-op */}
            {pathway === 'Post-op Transfer' && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Procedure Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Procedure Name
                    </label>
                    <input
                      type="text"
                      value={formData.procedure.name}
                      onChange={(e) => handleNestedChange('procedure', 'name', e.target.value)}
                      placeholder="e.g., Laparoscopic Radical Prostatectomy"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Procedure Date
                    </label>
                    <input
                      type="date"
                      value={formData.procedure.date}
                      onChange={(e) => handleNestedChange('procedure', 'date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Surgeon
                    </label>
                    <input
                      type="text"
                      value={formData.procedure.surgeon}
                      onChange={(e) => handleNestedChange('procedure', 'surgeon', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complications
                    </label>
                    <input
                      type="text"
                      value={formData.procedure.complications}
                      onChange={(e) => handleNestedChange('procedure', 'complications', e.target.value)}
                      placeholder="Enter complications, if any"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Clinical Summary */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Clinical Summary <span className="text-red-500">*</span>
              </h3>
              <textarea
                value={formData.clinicalSummary}
                onChange={(e) => handleInputChange('clinicalSummary', e.target.value)}
                rows={6}
                placeholder={pathway === 'Post-op Transfer'
                  ? "Describe the surgical procedure, post-operative recovery, patient status, and any complications..."
                  : "Provide comprehensive clinical summary including patient's condition, treatment, response, and overall status..."
                }
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors.clinicalSummary ? 'border-red-500' : 'border-gray-300'
                  }`}
              />
              {errors.clinicalSummary && <p className="text-red-500 text-xs mt-1">{errors.clinicalSummary}</p>}
            </div>

            {/* Medications */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FaPills className="mr-2 text-teal-600" />
                  Discharge Medications
                </h3>
                <button
                  onClick={addMedication}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center"
                >
                  <IoAdd className="mr-1" /> Add Medication
                </button>
              </div>

              <div className="space-y-4">
                {formData.medications.map((med, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Drug Name</label>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                          placeholder="e.g. Tamsulosin"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Dose</label>
                        <input
                          type="text"
                          value={med.dose}
                          onChange={(e) => handleMedicationChange(index, 'dose', e.target.value)}
                          placeholder="e.g. 400mcg"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                          placeholder="e.g. OD"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                          placeholder="e.g. 2 weeks"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                        />
                      </div>
                      <div className="lg:col-span-5">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Instructions</label>
                        <input
                          type="text"
                          value={med.instructions}
                          onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                          placeholder="e.g. Take after breakfast"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
                        />
                      </div>
                    </div>
                    {formData.medications.length > 1 && (
                      <button
                        onClick={() => removeMedication(index)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <IoClose className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Follow-up Instructions */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Instructions</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GP Follow-up
                  </label>
                  <input
                    type="text"
                    value={formData.followUp.gpFollowUp}
                    onChange={(e) => handleNestedChange('followUp', 'gpFollowUp', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warning Signs / Red Flags
                  </label>
                  <textarea
                    value={formData.followUp.redFlags}
                    onChange={(e) => handleNestedChange('followUp', 'redFlags', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* GP Actions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Required by GP</h3>
              <div className="space-y-3">
                {formData.gpActions.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No GP actions added yet. Click below to add one.</p>
                ) : (
                  formData.gpActions.map((action, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={action}
                        onChange={(e) => handleArrayChange(index, e.target.value)}
                        placeholder={`GP Action ${index + 1}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button
                        onClick={() => removeGPAction(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <IoTrash className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
                <button
                  onClick={addGPAction}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-teal-500 hover:text-teal-600 transition-colors"
                >
                  + Add GP Action
                </button>
              </div>
            </div>

            {/* Additional Notes */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h3>
              <textarea
                value={formData.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                rows={4}
                placeholder="Any additional information for the GP or patient..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Document Upload */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Discharge Documents</h3>

              {/* Upload Button */}
              <div className="mb-4">
                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-teal-500 hover:bg-teal-50 transition-colors">
                  <IoCloudUpload className="w-6 h-6 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    {uploadingFile ? 'Uploading...' : 'Click to upload discharge documents'}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadingFile}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">Accepted: PDF, DOC, DOCX, JPG, PNG (Max 10MB each)</p>
              </div>

              {/* Document List */}
              {documents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">Attached Documents ({documents.length})</p>
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {getFileIcon(doc.type)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.size}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <IoTrash className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              Create Discharge Summary & Complete Transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DischargeSummaryModal;

