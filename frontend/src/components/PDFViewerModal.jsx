import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { IoClose, IoDownload, IoPrint } from 'react-icons/io5';
import { useEscapeKey } from '../utils/useEscapeKey';

const PDFViewerModal = ({ isOpen, onClose, pdfUrl, fileName, autoPrint = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const iframeRef = React.useRef(null);
  const hasPrintedRef = React.useRef(false);

  // Close on Escape key
  useEscapeKey(() => {
    if (isOpen) {
      onClose();
    }
  });

  // Reset state when modal opens/closes or PDF changes
  useEffect(() => {
    if (isOpen && pdfUrl) {
      setIsLoading(true);
      setPdfError(false);
      hasPrintedRef.current = false;
    }
  }, [isOpen, pdfUrl]);

  if (!isOpen || !pdfUrl) return null;

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName || 'document.pdf';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    try {
      const iframe = iframeRef.current;
      const contentWindow = iframe?.contentWindow;
      
      if (contentWindow) {
        // Focus the iframe first to ensure print dialog works
        contentWindow.focus();
        // Small delay to ensure focus is set
        setTimeout(() => {
          contentWindow.print();
        }, 100);
      } else {
        // Fallback: try to print the current window
        window.print();
      }
    } catch (error) {
      console.error('Error printing PDF:', error);
      // Fallback: try alternative print methods
      try {
        const iframe = iframeRef.current;
        if (iframe) {
          // Try accessing contentDocument for same-origin content
          if (iframe.contentDocument) {
            iframe.contentDocument.execCommand('print', false, null);
          } else if (iframe.contentWindow) {
            iframe.contentWindow.print();
          }
        }
      } catch (fallbackError) {
        console.error('Fallback print error:', fallbackError);
        // Last resort: print current window
        window.print();
      }
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setPdfError(false);
    
    // Auto-print if enabled and hasn't printed yet
    if (autoPrint && !hasPrintedRef.current) {
      hasPrintedRef.current = true;
      // Small delay to ensure PDF is fully rendered
      setTimeout(() => {
        handlePrint();
      }, 500);
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setPdfError(true);
  };

  // Render modal at document body level to avoid parent container constraints
  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999
      }}
    >
      <div 
        className="w-full h-full flex flex-col bg-white"
        style={{
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh'
        }}
      >
        {/* Header */}
        <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate">
              {fileName || 'PDF Viewer'}
            </h2>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handlePrint}
              className="p-2 bg-teal-700 hover:bg-teal-500 rounded-lg transition-colors"
              title="Print"
            >
              <IoPrint className="text-xl" />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-teal-700 hover:bg-teal-500 rounded-lg transition-colors"
              title="Download"
            >
              <IoDownload className="text-xl" />
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

        {/* PDF Container - Full screen */}
        <div 
          className="flex-1 relative bg-gray-900 overflow-hidden"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            height: '100%'
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
                <p className="text-white text-sm">Loading PDF...</p>
              </div>
            </div>
          )}

          {pdfError ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-red-400 text-lg mb-2">Failed to load PDF</div>
                <p className="text-gray-400 text-sm mb-4">
                  The PDF could not be displayed. It may be corrupted or in an unsupported format.
                </p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                  Try Downloading Instead
                </button>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-full border-none"
              title={fileName || 'PDF Document'}
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              style={{ 
                display: isLoading ? 'none' : 'block',
                width: '100%',
                height: '100%',
                minHeight: 0,
                flex: '1 1 auto'
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-6 py-3 flex items-center justify-between text-sm text-gray-600 flex-shrink-0">
          <div className="flex items-center space-x-4">
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

  // Use portal to render at document body level, avoiding any parent container constraints
  return createPortal(modalContent, document.body);
};

PDFViewerModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  pdfUrl: PropTypes.string,
  fileName: PropTypes.string,
  autoPrint: PropTypes.bool
};

export default PDFViewerModal;
























