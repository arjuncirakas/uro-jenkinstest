import React from 'react';
import { IoClose, IoWarning } from 'react-icons/io5';

const ConfirmModal = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  title, 
  message, 
  confirmText = "Save Changes", 
  cancelText = "Cancel", 
  confirmButtonClass = "bg-blue-600 hover:bg-blue-700",
  showSaveButton = true,
  isDeleteModal = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4" style={{zIndex: 9999}}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <IoWarning className="text-2xl text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {title || 'Unsaved Changes'}
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <IoClose className="text-2xl" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-gray-600 leading-relaxed">
            {message || 'You have unsaved changes. Do you want to save before closing?'}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={() => onCancel()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          {showSaveButton && !isDeleteModal && (
            <button
              onClick={() => onConfirm(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
            >
              Don't Save
            </button>
          )}
          <button
            onClick={() => isDeleteModal ? onConfirm() : onConfirm(true)}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${confirmButtonClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
