import React from 'react';
import { IoClose, IoCalendar, IoFlask } from 'react-icons/io5';
import { getPSAStatusByAge, getPSAThresholdByAge } from '../../utils/psaStatusByAge';
import PropTypes from 'prop-types';

/**
 * Get today's date in YYYY-MM-DD format
 */
export const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calculate PSA status based on value and patient age
 */
export const calculatePSAStatus = (psaValue, patientAge) => {
    if (isNaN(psaValue)) return 'Normal';
    const statusResult = getPSAStatusByAge(psaValue, patientAge);
    return statusResult.status;
};

/**
 * Validate PSA form data
 */
export const validatePSAForm = (formData) => {
    const errors = {};

    if (!formData.testDate) {
        errors.testDate = 'Test date is required';
    }

    if (!formData.result) {
        errors.result = 'PSA result is required';
    } else if (isNaN(parseFloat(formData.result))) {
        errors.result = 'PSA result must be a valid number';
    }

    return errors;
};

/**
 * Handle input change with auto-status calculation
 */
export const createInputChangeHandler = (setFormData, setErrors, errors, patientAge) => {
    return (e) => {
        const { name, value } = e.target;

        let newStatus = 'Normal';
        if (name === 'result' && value) {
            const psaValue = parseFloat(value);
            newStatus = calculatePSAStatus(psaValue, patientAge);
        }

        setFormData(prev => ({
            ...prev,
            [name]: value,
            status: name === 'result' ? newStatus : prev.status
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
};

/**
 * Dispatch PSA-related events for table refresh
 */
export const dispatchPSAEvents = (patientId, testDate, eventType = 'added') => {
    const refreshEvent = new CustomEvent('testResultAdded', {
        detail: { patientId, testName: 'psa', testDate }
    });
    window.dispatchEvent(refreshEvent);

    const psaEvent = new CustomEvent(eventType === 'added' ? 'psaResultAdded' : 'psaResultUpdated', {
        detail: { patientId, testName: 'psa', testDate }
    });
    window.dispatchEvent(psaEvent);
};

/**
 * Get status display styling
 */
const getStatusStyles = (status) => {
    const styles = {
        High: { border: 'border-red-300 bg-red-50', text: 'text-red-700' },
        Elevated: { border: 'border-orange-300 bg-orange-50', text: 'text-orange-700' },
        Low: { border: 'border-yellow-300 bg-yellow-50', text: 'text-yellow-700' },
        Normal: { border: 'border-green-300 bg-green-50', text: 'text-green-700' }
    };
    return styles[status] || styles.Normal;
};

/**
 * PSA Status Display Component
 */
export const PSAStatusDisplay = ({ psaValue, patientAge }) => {
    const statusInfo = !isNaN(psaValue)
        ? getPSAStatusByAge(psaValue, patientAge)
        : { status: 'Normal', message: 'Enter PSA value' };
    const threshold = patientAge ? getPSAThresholdByAge(patientAge) : 4.0;
    const styles = getStatusStyles(statusInfo.status);

    return (
        <div className={`w-full px-3 py-2 border rounded-lg ${styles.border}`}>
            <span className={`font-medium ${styles.text}`}>
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
};

PSAStatusDisplay.propTypes = {
    psaValue: PropTypes.number,
    patientAge: PropTypes.number
};

/**
 * Shared Modal Header Component
 */
export const PSAModalHeader = ({ title, patientName, onClose }) => (
    <div className="bg-teal-600 text-white p-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <IoFlask className="w-6 h-6" />
                <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
            >
                <IoClose className="w-6 h-6" />
            </button>
        </div>
        <p className="text-teal-100 mt-1">for {patientName}</p>
    </div>
);

PSAModalHeader.propTypes = {
    title: PropTypes.string.isRequired,
    patientName: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
};

/**
 * Test Date Input Component
 */
export const TestDateInput = ({ value, onChange, error }) => (
    <div>
        <label htmlFor="testDate" className="block text-sm font-medium text-gray-700 mb-2">
            Test Date *
        </label>
        <div className="relative">
            <input
                id="testDate"
                type="date"
                name="testDate"
                value={value}
                onChange={onChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${error ? 'border-red-500' : 'border-gray-300'
                    }`}
            />
            <IoCalendar className="absolute right-3 top-2.5 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
);

TestDateInput.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    error: PropTypes.string
};

/**
 * PSA Result Input Component
 */
export const PSAResultInput = ({ value, onChange, error }) => (
    <div>
        <label htmlFor="psaResult" className="block text-sm font-medium text-gray-700 mb-2">
            PSA Result (ng/mL) *
        </label>
        <input
            id="psaResult"
            type="number"
            step="0.1"
            name="result"
            value={value}
            onChange={onChange}
            placeholder="e.g., 3.2"
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${error ? 'border-red-500' : 'border-gray-300'
                }`}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
);

PSAResultInput.propTypes = {
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onChange: PropTypes.func.isRequired,
    error: PropTypes.string
};

/**
 * Notes Input Component
 */
export const NotesInput = ({ value, onChange }) => (
    <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes
        </label>
        <textarea
            id="notes"
            name="notes"
            value={value}
            onChange={onChange}
            rows={3}
            placeholder="Additional notes about the PSA result..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
        />
    </div>
);

NotesInput.propTypes = {
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

/**
 * Error Message Component
 */
export const ErrorMessage = ({ message }) => message ? (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <p className="text-red-600 text-sm">{message}</p>
    </div>
) : null;

ErrorMessage.propTypes = {
    message: PropTypes.string
};

/**
 * Action Buttons Component
 */
export const ActionButtons = ({ onCancel, isSubmitting, isAdded, submitText, submittingText, addedText }) => {
    const getButtonText = () => {
        if (isAdded) return addedText;
        if (isSubmitting) return submittingText;
        return submitText;
    };

    return (
        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
                type="button"
                onClick={onCancel}
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
                <span>{getButtonText()}</span>
            </button>
        </div>
    );
};

ActionButtons.propTypes = {
    onCancel: PropTypes.func.isRequired,
    isSubmitting: PropTypes.bool,
    isAdded: PropTypes.bool,
    submitText: PropTypes.string.isRequired,
    submittingText: PropTypes.string.isRequired,
    addedText: PropTypes.string
};

/**
 * Modal Wrapper Component
 */
export const PSAModalWrapper = ({ children }) => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
            {children}
        </div>
    </div>
);

PSAModalWrapper.propTypes = {
    children: PropTypes.node.isRequired
};
