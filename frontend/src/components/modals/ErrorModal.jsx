import React, { useEffect } from 'react';
import { AlertCircle, X, AlertTriangle, XCircle } from 'lucide-react';

const ErrorModal = ({ isOpen, onClose, title, message, errors, onConfirm }) => {
  useEffect(() => {
    if (isOpen) {
      // Auto-close after 8 seconds for errors (longer than success)
      const timer = setTimeout(() => {
        onClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 transform transition-all animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {title || 'Validation Error'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {message || 'Please correct the following errors and try again'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {errors && errors.length > 0 ? (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6">
              <div className="text-sm text-red-800">
                <div className="font-semibold text-base mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Validation Errors
                </div>
                <div className="space-y-3">
                  {errors.map((error, index) => (
                    <div key={index} className="flex items-start">
                      <XCircle className="h-4 w-4 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-red-700 capitalize">
                          {error.field.replace(/([A-Z])/g, ' $1').trim()}:
                        </div>
                        <div className="text-red-800 mt-1">
                          {error.message}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-gray-600">
                {message || 'An error occurred. Please try again.'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex justify-end">
          <button
            onClick={onConfirm || onClose}
            className="bg-red-600 text-white px-8 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorModal;