import React, { useState, useEffect } from 'react';
import { investigationService } from '../../services/investigationService';
import {
  getTodayDate,
  validatePSAForm,
  createInputChangeHandler,
  dispatchPSAEvents,
  PSAStatusDisplay,
  PSAModalHeader,
  TestDateInput,
  PSAResultInput,
  NotesInput,
  ErrorMessage,
  ActionButtons,
  PSAModalWrapper
} from './PSAModalShared';
import PropTypes from 'prop-types';

const AddPSAResultModal = ({ isOpen, onClose, patient, onSuccess }) => {
  const [formData, setFormData] = useState({
    testDate: getTodayDate(),
    result: '',
    notes: '',
    status: 'Normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [errors, setErrors] = useState({});

  const patientAge = patient?.age || patient?.patientAge || null;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        testDate: getTodayDate(),
        result: '',
        notes: '',
        status: 'Normal'
      });
      setErrors({});
      setIsAdded(false);
    }
  }, [isOpen]);

  const handleInputChange = createInputChangeHandler(setFormData, setErrors, errors, patientAge);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validatePSAForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        referenceRange: '0.0 - 4.0'
      };

      const result = await investigationService.addPSAResult(patient.id, submitData);

      if (result.success) {
        setIsSubmitting(false);
        setIsAdded(true);

        dispatchPSAEvents(patient.id, formData.testDate, 'added');

        if (onSuccess) {
          onSuccess('PSA result added successfully!', true);
        }

        setFormData({
          testDate: getTodayDate(),
          result: '',
          notes: '',
          status: 'Normal'
        });

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

  const patientName = patient?.fullName || patient?.name || 'Patient';

  return (
    <PSAModalWrapper>
      <PSAModalHeader
        title="Add PSA Result"
        patientName={patientName}
        onClose={onClose}
      />

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          <TestDateInput
            value={formData.testDate}
            onChange={handleInputChange}
            error={errors.testDate}
          />

          <PSAResultInput
            value={formData.result}
            onChange={handleInputChange}
            error={errors.result}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status (Auto-determined based on age)
            </label>
            <PSAStatusDisplay
              psaValue={parseFloat(formData.result)}
              patientAge={patientAge}
            />
          </div>

          <NotesInput
            value={formData.notes}
            onChange={handleInputChange}
          />

          <ErrorMessage message={errors.submit} />
        </div>

        <ActionButtons
          onCancel={onClose}
          isSubmitting={isSubmitting}
          isAdded={isAdded}
          submitText="Add PSA Result"
          submittingText="Adding..."
          addedText="Added"
        />
      </form>
    </PSAModalWrapper>
  );
};

AddPSAResultModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  patient: PropTypes.object,
  onSuccess: PropTypes.func
};

export default AddPSAResultModal;
