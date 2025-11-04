import React from 'react';
import { IoClose, IoCheckmarkCircle } from 'react-icons/io5';
import { useEscapeKey } from '../utils/useEscapeKey';

const SuccessModal = ({ isOpen, onClose, title, message }) => {
  // Handle Escape key to close modal
  const [showConfirmModal, closeConfirmModal] = useEscapeKey(onClose, isOpen);
  // Not using confirm modal for simple modals without data

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden transform transition-all animate-slideUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close modal"
        >
          <IoClose className="text-2xl" />
        </button>

        {/* Icon Section */}
        <div className="pt-8 pb-6 px-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-50 mb-4">
            <IoCheckmarkCircle className="text-5xl text-teal-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {title || 'Success!'}
          </h2>
          <p className="text-gray-600 leading-relaxed">
            {message || 'Operation completed successfully!'}
          </p>
        </div>

        {/* Action Section */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 active:bg-teal-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
