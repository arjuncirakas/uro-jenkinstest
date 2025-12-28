import React, { useState, useEffect, useRef } from 'react'; // eslint-disable-line no-unused-vars
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { IoClose, IoDownload, IoPrint } from 'react-icons/io5';
import { useEscapeKey } from '../utils/useEscapeKey';

/**
 * FullScreenPDFModal - Shows PDF preview and auto-triggers print
 * 
 * The modal preview shows the PDF (even if small due to Chrome blob URL limitations)
 * but immediately opens the print dialog which displays the PDF correctly.
 */
const FullScreenPDFModal = ({ isOpen, onClose, pdfUrl, fileName, autoPrint = true }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const iframeRef = useRef(null);
  const hasPrintedRef = useRef(false);

  // Close on Escape key
  useEscapeKey(() => {
    if (isOpen) {
      onClose();
    }
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && pdfUrl) {
      setIsLoading(true);
      setPdfError(false);
      hasPrintedRef.current = false;
    }
  }, [isOpen, pdfUrl]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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
    }
  };

  const handlePrint = () => {
    try {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } else {
        window.print();
      }
    } catch (error) {
      console.error('Error printing:', error);
      window.print();
    }
  };

  const handleIframeLoad = () => {
    console.log('[FullScreenPDFModal] PDF loaded');
    setIsLoading(false);
    setPdfError(false);

    // Auto-trigger print after load (only once)
    if (!hasPrintedRef.current) {
      hasPrintedRef.current = true;
      // Delay to ensure PDF is rendered
      setTimeout(() => {
        handlePrint();
      }, 800);
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setPdfError(true);
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 99999
      }}
      data-testid="fullscreen-pdf-modal"
    >
      {/* Header */}
      <div style={{
        backgroundColor: '#0d9488',
        color: 'white',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName || 'PDF Document'}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '8px',
              backgroundColor: '#0f766e',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Print"
            type="button"
          >
            <IoPrint style={{ fontSize: '20px', color: 'white' }} />
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: '8px',
              backgroundColor: '#0f766e',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Download"
            type="button"
          >
            <IoDownload style={{ fontSize: '20px', color: 'white' }} />
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: '#0f766e',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close"
            type="button"
          >
            <IoClose style={{ fontSize: '20px', color: 'white' }} />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div style={{
        flex: '1 1 auto',
        position: 'relative',
        backgroundColor: '#1f2937',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            zIndex: 10
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #374151',
              borderTopColor: '#14b8a6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>Loading PDF... Print dialog will open shortly.</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {pdfError ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{ color: '#f87171', fontSize: '18px', marginBottom: '8px' }}>Failed to load PDF</div>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>Please try downloading instead.</p>
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
              Download PDF
            </button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title={fileName || 'PDF Document'}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: isLoading ? 'none' : 'block'
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#f3f4f6',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: '#4b5563',
        flexShrink: 0
      }}>
        <span>Press ESC to close • Print dialog opens automatically</span>
        <button
          onClick={onClose}
          style={{
            padding: '6px 16px',
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

  return createPortal(modalContent, document.body);
};

FullScreenPDFModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  pdfUrl: PropTypes.string,
  fileName: PropTypes.string,
  autoPrint: PropTypes.bool
};

export default FullScreenPDFModal;
