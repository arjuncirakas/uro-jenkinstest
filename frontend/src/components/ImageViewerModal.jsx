import React, { useState, useEffect } from 'react';
import { IoClose, IoDownload, IoExpand, IoContract } from 'react-icons/io5';
import { useEscapeKey } from '../utils/useEscapeKey';

const ImageViewerModal = ({ isOpen, onClose, imageUrl, fileName }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Close on Escape key
  useEscapeKey(() => {
    if (isOpen) {
      onClose();
    }
  });

  // Reset state when modal opens/closes or image changes
  useEffect(() => {
    if (isOpen && imageUrl) {
      setIsLoading(true);
      setImageError(false);
      setIsZoomed(false);
    }
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = fileName || 'image';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image. Please try again.');
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setImageError(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 text-white px-6 py-4 rounded-t-xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {fileName || 'Image Viewer'}
            </h2>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleDownload}
              className="p-2 bg-teal-700 hover:bg-teal-500 rounded-lg transition-colors"
              title="Download"
            >
              <IoDownload className="text-xl" />
            </button>
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2 bg-teal-700 hover:bg-teal-500 rounded-lg transition-colors"
              title={isZoomed ? "Fit to screen" : "Zoom in"}
            >
              {isZoomed ? <IoContract className="text-xl" /> : <IoExpand className="text-xl" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-teal-700 hover:bg-teal-500 rounded-lg transition-colors"
              title="Close"
            >
              <IoClose className="text-xl" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 overflow-auto bg-gray-900 p-4 flex items-center justify-center relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                <p className="text-white text-sm">Loading image...</p>
              </div>
            </div>
          )}

          {imageError ? (
            <div className="text-center p-8">
              <div className="text-red-400 text-lg mb-2">Failed to load image</div>
              <p className="text-gray-400 text-sm mb-4">
                The image could not be displayed. It may be corrupted or in an unsupported format.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                Try Downloading Instead
              </button>
            </div>
          ) : (
            <img
              src={imageUrl}
              alt={fileName || 'Image'}
              className={`max-w-full max-h-full object-contain transition-transform duration-300 ${
                isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={() => setIsZoomed(!isZoomed)}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-3 rounded-b-xl flex items-center justify-between text-sm text-gray-600 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <span>Click image to zoom</span>
            <span>•</span>
            <span>Press ESC to close</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;

