import React, { useState, useEffect, useRef } from 'react'; // eslint-disable-line no-unused-vars
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { IoClose, IoDownload, IoPrint } from 'react-icons/io5';
import { useEscapeKey } from '../utils/useEscapeKey';

const FullScreenPDFModal = ({ isOpen, onClose, pdfUrl, fileName, autoPrint = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const embedRef = useRef(null);
  const hasPrintedRef = useRef(false);

  // Close on Escape key
  useEscapeKey(() => {
    if (isOpen) {
      onClose();
    }
  });

  // Reset state when modal opens/closes or PDF changes
  useEffect(() => {
    if (isOpen && pdfUrl) {
      console.log('[FullScreenPDFModal] Modal opening:', {
        isOpen,
        pdfUrl: pdfUrl.substring(0, 50) + '...',
        fileName,
        autoPrint,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        bodyExists: !!document.body
      });
      setIsLoading(true);
      setPdfError(false);
      hasPrintedRef.current = false;

      // Fallback: Hide loading after a timeout (iframes don't always fire onLoad reliably)
      const loadingTimeout = setTimeout(() => {
        console.log('[FullScreenPDFModal] Initial loading timeout - hiding loading state');
        setIsLoading(false);
      }, 800); // 800ms timeout

      return () => clearTimeout(loadingTimeout);
    } else if (!isOpen) {
      console.log('[FullScreenPDFModal] Modal closed');
    }
  }, [isOpen, pdfUrl, fileName, autoPrint]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      console.log('[FullScreenPDFModal] Locking body scroll');
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        console.log('[FullScreenPDFModal] Restoring body scroll');
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Verify modal was rendered correctly after mount
  useEffect(() => {
    if (isOpen && pdfUrl) {
      const timer = setTimeout(() => {
        const modalElement = document.querySelector('[data-testid="fullscreen-pdf-modal"]');
        if (modalElement) {
          const computedStyle = window.getComputedStyle(modalElement);
          const rect = modalElement.getBoundingClientRect();
          console.log('[FullScreenPDFModal] Modal element verified:', {
            found: true,
            position: computedStyle.position,
            top: computedStyle.top,
            left: computedStyle.left,
            width: computedStyle.width,
            height: computedStyle.height,
            zIndex: computedStyle.zIndex,
            boundingRect: {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            },
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight
            }
          });
        } else {
          console.error('[FullScreenPDFModal] ERROR: Modal element not found in DOM!');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, pdfUrl]);

  // Fallback: Check if iframe has loaded (for when onLoad doesn't fire)
  // MUST be before early return to follow Rules of Hooks
  useEffect(() => {
    if (isOpen && pdfUrl && isLoading) {
      // Timeout fallback - hide loading after 500ms (iframe loads quickly for blob URLs)
      const timeout = setTimeout(() => {
        console.log('[FullScreenPDFModal] Loading timeout - hiding loading state (iframe onLoad may not have fired)');
        setIsLoading(false);
        setPdfError(false);

        // Auto-print if enabled
        if (autoPrint && !hasPrintedRef.current) {
          hasPrintedRef.current = true;
          setTimeout(() => {
            try {
              const iframe = embedRef.current;
              if (iframe?.contentWindow) {
                iframe.contentWindow.focus();
                setTimeout(() => {
                  iframe.contentWindow.print();
                }, 100);
              } else {
                window.print();
              }
            } catch {
              window.print();
            }
          }, 500);
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [isOpen, pdfUrl, isLoading, autoPrint]);

  if (!isOpen || !pdfUrl) {
    if (!isOpen) {
      console.log('[FullScreenPDFModal] Not rendering - modal not open');
    }
    if (!pdfUrl) {
      console.log('[FullScreenPDFModal] Not rendering - no PDF URL');
    }
    return null;
  }

  console.log('[FullScreenPDFModal] Rendering modal with:', {
    isOpen,
    hasPdfUrl: !!pdfUrl,
    fileName,
    viewport: { width: window.innerWidth, height: window.innerHeight }
  });

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName || 'document.pdf';
      link.className = 'hidden';
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
      const iframe = embedRef.current;
      const contentWindow = iframe?.contentWindow;

      if (contentWindow) {
        contentWindow.focus();
        setTimeout(() => {
          contentWindow.print();
        }, 100);
      } else {
        window.print();
      }
    } catch (error) {
      console.error('[FullScreenPDFModal] Error printing PDF:', error);
      try {
        const iframe = embedRef.current;
        if (iframe?.contentWindow) {
          iframe.contentWindow.print();
        } else {
          window.print();
        }
      } catch (fallbackError) {
        console.error('[FullScreenPDFModal] Fallback print error:', fallbackError);
        window.print();
      }
    }
  };

  const handleIframeLoad = () => {
    console.log('[FullScreenPDFModal] PDF embed onLoad event fired');
    setIsLoading(false);
    setPdfError(false);

    // Auto-print if enabled and hasn't printed yet
    if (autoPrint && !hasPrintedRef.current) {
      console.log('[FullScreenPDFModal] Auto-print enabled, triggering print in 500ms');
      hasPrintedRef.current = true;
      setTimeout(() => {
        handlePrint();
      }, 500);
    }
  };

  const handleIframeError = () => {
    console.error('[FullScreenPDFModal] Iframe error loading PDF:', pdfUrl);
    setIsLoading(false);
    setPdfError(true);
  };

  const modalContent = (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black flex flex-col"
      data-testid="fullscreen-pdf-modal"
      style={{
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0
      }}
    >
      {/* Minimal Header */}
      <div
        className="bg-teal-600 text-white px-4 py-2 flex items-center justify-between"
        style={{ flexShrink: 0, height: '48px' }}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <h2 className="text-base font-semibold truncate">
            {fileName || 'PDF Viewer'}
          </h2>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handlePrint}
            className="p-1.5 bg-teal-700 hover:bg-teal-500 rounded transition-colors"
            title="Print"
            type="button"
          >
            <IoPrint className="text-lg" />
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 bg-teal-700 hover:bg-teal-500 rounded transition-colors"
            title="Download"
            type="button"
          >
            <IoDownload className="text-lg" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 bg-teal-700 hover:bg-teal-500 rounded transition-colors"
            title="Close"
            type="button"
          >
            <IoClose className="text-lg" />
          </button>
        </div>
      </div>

      {/* PDF Container - Takes up remaining space */}
      <div
        className="relative bg-gray-900 overflow-hidden"
        style={{
          flex: '1 1 0%',
          minHeight: 0,
          height: 'calc(100vh - 80px)' // 48px header + 32px footer
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
                type="button"
              >
                Try Downloading Instead
              </button>
            </div>
          </div>
        ) : (
          <iframe
            ref={embedRef}
            src={pdfUrl}
            className="border-none"
            title={fileName || 'PDF Document'}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.3s'
            }}
          />
        )}
      </div>

      {/* Minimal Footer */}
      <div
        className="bg-gray-100 px-4 flex items-center justify-between text-xs text-gray-600"
        style={{ flexShrink: 0, height: '32px' }}
      >
        <span>Press ESC to close</span>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors text-xs font-medium"
          type="button"
        >
          Close
        </button>
      </div>
    </div>
  );

  // Render at document body level using portal
  const portalTarget = document.body;
  console.log('[FullScreenPDFModal] Creating portal to document.body:', {
    bodyExists: !!portalTarget,
    bodyChildren: portalTarget?.children?.length || 0,
    viewportSize: {
      width: window.innerWidth,
      height: window.innerHeight
    }
  });

  return createPortal(modalContent, portalTarget);
};

FullScreenPDFModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  pdfUrl: PropTypes.string,
  fileName: PropTypes.string,
  autoPrint: PropTypes.bool
};

export default FullScreenPDFModal;

