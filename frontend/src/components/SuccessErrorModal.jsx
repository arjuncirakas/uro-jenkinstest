import React from 'react';
import { FiCheckCircle, FiXCircle, FiX } from 'react-icons/fi';

const SuccessErrorModal = ({ 
  isOpen, 
  onClose, 
  message, 
  type = 'success' // 'success' or 'error'
}) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success';
  const bgColor = isSuccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const textColor = isSuccess ? 'text-green-800' : 'text-red-800';
  const iconColor = isSuccess ? 'text-green-600' : 'text-red-600';
  const Icon = isSuccess ? FiCheckCircle : FiXCircle;
  const title = isSuccess ? 'Success' : 'Error';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className={`${bgColor} border-2 rounded-lg shadow-xl max-w-md w-full p-6 relative`}>
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 ${textColor} hover:opacity-70 transition-opacity`}
        >
          <FiX className="w-5 h-5" />
        </button>
        
        <div className="flex items-start gap-4">
          <Icon className={`${iconColor} text-4xl flex-shrink-0 mt-1`} />
          <div className="flex-1">
            <h3 className={`${textColor} font-semibold text-lg mb-2`}>{title}</h3>
            <p className={`${textColor} text-sm`}>{message}</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2 ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white font-medium rounded-lg transition-colors`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessErrorModal;





