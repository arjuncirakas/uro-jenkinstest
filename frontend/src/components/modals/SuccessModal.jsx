import React, { useEffect } from 'react';
import { CheckCircle, X, User, Hash, Phone, Mail } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, title, message, details, onConfirm }) => {
  useEffect(() => {
    if (isOpen) {
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

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
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {title || 'Success!'}
              </h3>
              {!message && (
                <p className="text-sm text-gray-500 mt-1">
                  Operation completed successfully
                </p>
              )}
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
          {details && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
              <div className="text-sm text-green-800">
                <div className="font-semibold text-base mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Patient Details
                </div>
                <div className="space-y-3">
                  {details.name && (
                    <div className="flex items-center">
                      <User className="h-4 w-4 text-green-600 mr-3" />
                      <div>
                        <span className="font-medium text-green-700">Name:</span>
                        <span className="ml-2 text-green-800">{details.name}</span>
                      </div>
                    </div>
                  )}
                  {details.upi && (
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 text-green-600 mr-3" />
                      <div>
                        <span className="font-medium text-green-700">UPI:</span>
                        <span className="ml-2 text-green-800 font-mono">{details.upi}</span>
                      </div>
                    </div>
                  )}
                  {details.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-green-600 mr-3" />
                      <div>
                        <span className="font-medium text-green-700">Phone:</span>
                        <span className="ml-2 text-green-800">{details.phone}</span>
                      </div>
                    </div>
                  )}
                  {details.email && (
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 text-green-600 mr-3" />
                      <div>
                        <span className="font-medium text-green-700">Email:</span>
                        <span className="ml-2 text-green-800">{details.email}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!details && (
            <div className="text-center py-4">
              <div className="text-gray-600">
                {message || 'Operation completed successfully'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex justify-end">
          <button
            onClick={onConfirm || onClose}
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;