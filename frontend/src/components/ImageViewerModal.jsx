import React from 'react';
import { IoClose } from 'react-icons/io5';

const ImageViewerModal = ({ isOpen, onClose, imageUrl, fileName }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="relative w-full h-full flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 bg-black/80 text-white p-4 flex items-center justify-between z-10">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate">{fileName || 'Image Viewer'}</h3>
          </div>
          <button
            onClick={onClose}
            className="ml-4 bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <IoClose className="text-2xl" />
          </button>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4 pt-20">
          <img
            src={imageUrl}
            alt={fileName || 'Image'}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onError={(e) => {
              console.error('Error loading image:', e);
              e.target.style.display = 'none';
              const errorDiv = document.createElement('div');
              errorDiv.className = 'text-white text-center p-8';
              errorDiv.textContent = 'Failed to load image';
              e.target.parentElement.appendChild(errorDiv);
            }}
          />
        </div>

        {/* Close button overlay (click outside to close) */}
        <div
          className="absolute inset-0 -z-10"
          onClick={onClose}
          aria-label="Close modal"
        />
      </div>
    </div>
  );
};

export default ImageViewerModal;

