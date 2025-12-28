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
      data-testid="fullscreen-pdf-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 99999,
        margin: 0,
        padding: 0,
        overflow: 'hidden'
      }}
    >
      {/* Minimal Header */}
      <div
        style={{
          backgroundColor: '#0d9488',
          color: 'white',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          height: '48px',
          minHeight: '48px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
            {fileName || 'PDF Viewer'}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '6px',
              backgroundColor: '#0f766e',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Print"
            type="button"
          >
            <IoPrint style={{ fontSize: '18px', color: 'white' }} />
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: '6px',
              backgroundColor: '#0f766e',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Download"
            type="button"
          >
            <IoDownload style={{ fontSize: '18px', color: 'white' }} />
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '6px',
              backgroundColor: '#0f766e',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
            type="button"
          >
            <IoClose style={{ fontSize: '18px', color: 'white' }} />
          </button>
        </div>
      </div>

      {/* PDF Container - Takes up remaining space */}
      <div
        style={{
          position: 'relative',
          backgroundColor: '#1f2937',
          overflow: 'hidden',
          flex: '1 1 auto',
          minHeight: 0,
          height: 'calc(100vh - 80px)'
        }}
      >
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                border: '2px solid transparent',
                borderBottomColor: '#14b8a6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>Loading PDF...</p>
            </div>
          </div>
        )}

        {pdfError ? (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ color: '#f87171', fontSize: '18px', marginBottom: '8px' }}>Failed to load PDF</div>
              <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
                The PDF could not be displayed. It may be corrupted or in an unsupported format.
              </p>
              <button
                onClick={handleDownload}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0d9488',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
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
        style={{
          backgroundColor: '#f3f4f6',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: '#4b5563',
          flexShrink: 0,
          height: '32px',
          minHeight: '32px'
        }}
      >
        <span>Press ESC to close</span>
        <button
          onClick={onClose}
          style={{
            padding: '4px 12px',
            backgroundColor: '#0d9488',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500
          }}
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

