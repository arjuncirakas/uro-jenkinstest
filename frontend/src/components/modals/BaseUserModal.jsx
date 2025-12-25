import React, { useState, useEffect } from 'react';
import { X, Mail, Phone, User } from 'lucide-react';
import SuccessModal from './SuccessModal';
import ErrorModal from './ErrorModal';
import PropTypes from 'prop-types';

/**
 * Regex patterns for validation
 */
const NAME_PATTERN = /^[a-zA-Z\s]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CLEAN_PATTERN = /[\s()-]/g;
const LETTERS_PATTERN = /[a-zA-Z]/;

/**
 * Validate name fields (first_name, last_name)
 */
const validateName = (value, fieldLabel, minLength = 0) => {
    if (!value.trim()) return `${fieldLabel} is required`;
    if (minLength > 0 && value.trim().length < minLength) {
        return `${fieldLabel} must be at least ${minLength} characters`;
    }
    if (!NAME_PATTERN.test(value.trim())) {
        return `${fieldLabel} can only contain letters and spaces`;
    }
    return '';
};

/**
 * Validate email field
 */
const validateEmail = (value) => {
    if (!value.trim()) return 'Email is required';
    if (!EMAIL_PATTERN.test(value)) return 'Please enter a valid email address';
    return '';
};

/**
 * Validate phone field
 */
const validatePhone = (value) => {
    if (!value.trim()) return 'Phone number is required';

    const cleanedPhone = value.replace(PHONE_CLEAN_PATTERN, '');
    const digitsOnly = cleanedPhone.replace(/^\+/, '');

    if (LETTERS_PATTERN.test(value)) return 'Phone number cannot contain letters';
    if (digitsOnly.length < 8) return 'Phone number must contain at least 8 digits';
    if (digitsOnly.length > 20) return 'Phone number cannot exceed 20 characters';
    return '';
};

/**
 * Validation handlers for each field type
 */
const fieldValidators = {
    first_name: (value) => validateName(value, 'First name', 2),
    last_name: (value) => validateName(value, 'Last name'),
    email: validateEmail,
    phone: validatePhone,
    department_id: (value) => !value ? 'Department is required' : '',
    organization: () => '' // Optional field
};

/**
 * Shared validation function for user forms
 */
export const validateField = (name, value, skipFields = []) => {
    if (skipFields.includes(name)) return '';
    const validator = fieldValidators[name];
    return validator ? validator(value) : '';
};


/**
 * BaseUserModal - Shared modal component for adding users (nurses, urologists)
 */
const BaseUserModal = ({
    isOpen,
    onClose,
    onSuccess,
    title,
    icon: Icon,
    submitService,
    initialFormData,
    renderExtraFields,
    successTitle,
    successMessage,
    errorTitle,
    submitButtonText,
    skipValidationFields = []
}) => {
    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData(initialFormData);
            setErrors({});
            setShowSuccessModal(false);
            setShowErrorModal(false);
            setErrorMessage('');
        }
    }, [isOpen, initialFormData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        const error = validateField(name, value, skipValidationFields);
        setErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        Object.keys(formData).forEach(key => {
            if (!skipValidationFields.includes(key)) {
                const error = validateField(key, formData[key], skipValidationFields);
                if (error) {
                    newErrors[key] = error;
                }
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await submitService(formData);

            if (response.success) {
                setShowSuccessModal(true);
                if (onSuccess) {
                    setTimeout(() => {
                        onSuccess();
                    }, 1500);
                }
            } else {
                setErrorMessage(response.error || response.message || 'Failed to create user');
                setShowErrorModal(true);
            }
        } catch (error) {
            console.error('Error creating user:', error);
            const message = error?.response?.data?.error ||
                error?.response?.data?.message ||
                error?.message ||
                'Failed to create user. Please try again.';
            setErrorMessage(message);
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                            <div className="rounded-lg p-2 bg-teal-50">
                                <Icon className="h-6 w-6 text-teal-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* First Name */}
                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 ${errors.first_name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter first name"
                                />
                            </div>
                            {errors.first_name && (
                                <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                            )}
                        </div>

                        {/* Last Name */}
                        <div>
                            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 ${errors.last_name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter last name"
                                />
                            </div>
                            {errors.last_name && (
                                <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 ${errors.email ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter email address"
                                />
                            </div>
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                Phone <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    onBlur={handleBlur}
                                    className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder="Enter phone number"
                                />
                            </div>
                            {errors.phone && (
                                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                            )}
                        </div>

                        {/* Extra fields rendered by child component */}
                        {renderExtraFields?.({ formData, errors, handleInputChange, handleBlur })}

                        {/* Buttons */}
                        <div className="flex space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Adding...' : submitButtonText}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Success Modal */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    onClose();
                }}
                title={successTitle}
                message={successMessage}
            />

            {/* Error Modal */}
            <ErrorModal
                isOpen={showErrorModal}
                onClose={() => setShowErrorModal(false)}
                message={errorMessage}
                title={errorTitle}
            />
        </>
    );
};

BaseUserModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func,
    title: PropTypes.string.isRequired,
    icon: PropTypes.elementType.isRequired,
    submitService: PropTypes.func.isRequired,
    initialFormData: PropTypes.object.isRequired,
    renderExtraFields: PropTypes.func,
    successTitle: PropTypes.string.isRequired,
    successMessage: PropTypes.string.isRequired,
    errorTitle: PropTypes.string.isRequired,
    submitButtonText: PropTypes.string.isRequired,
    skipValidationFields: PropTypes.arrayOf(PropTypes.string)
};

export default BaseUserModal;
