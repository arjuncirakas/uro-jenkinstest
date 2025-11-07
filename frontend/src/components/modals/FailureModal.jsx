import React, { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

const FailureModal = ({ 
  isOpen, 
  onClose, 
  title = 'Operation Failed', 
  message = 'Something went wrong. Please try again.'
}) => {
  useEffect(() => {
    if (isOpen) {
      // Auto-close after 8 seconds for errors
      const timer = setTimeout(() => {
        onClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl border border-gray-200 max-w-lg w-full mx-4 transform transition-all animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Please review the error and try again
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 p-1.5 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 mb-1">
                  Error Details
                </p>
                <p className="text-sm text-red-800 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FailureModal;
