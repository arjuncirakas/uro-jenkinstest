import React from 'react';
import { IoClose, IoDownload } from 'react-icons/io5';

const ImageViewerModal = ({ isOpen, onClose, imageUrl, fileName, blobUrl }) => {
  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    // Use blobUrl if available (better for download), otherwise use dataUrl
    const urlToUse = blobUrl || imageUrl;
    const link = document.createElement('a');
    link.href = urlToUse;
    link.download = fileName || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 text-white p-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold">{fileName || 'Image Viewer'}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-teal-700 rounded transition-colors"
              title="Download image"
            >
              <IoDownload className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-teal-700 rounded transition-colors"
              title="Close"
            >
              <IoClose className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
          <img
            src={imageUrl}
            alt={fileName || 'Image'}
            className="max-w-full max-h-[calc(90vh-120px)] object-contain"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 rounded-b-lg flex items-center justify-between">
          <p className="text-sm text-gray-600">{fileName || 'Image'}</p>
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2"
          >
            <IoDownload className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;

