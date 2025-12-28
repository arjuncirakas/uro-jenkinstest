import React, { useEffect, useRef } from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';

/**
 * FullScreenPDFModal - Directly triggers browser print dialog
 * 
 * No modal UI - just opens the print dialog (like Ctrl+P) with the PDF.
 * The iframe is kept hidden and persists until print is complete.
 */
const FullScreenPDFModal = ({ isOpen, onClose, pdfUrl, fileName }) => {
  const iframeRef = useRef(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (isOpen && pdfUrl && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;

      console.log('[FullScreenPDFModal] Opening print dialog for:', fileName);

      // Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
      iframe.src = pdfUrl;
      iframeRef.current = iframe;

      // Handle print when PDF loads
      iframe.onload = () => {
        console.log('[FullScreenPDFModal] PDF loaded, triggering print');

        // Give the PDF time to render inside the iframe
        setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
          } catch (error) {
            console.error('[FullScreenPDFModal] Print error:', error);
          }
        }, 500);
      };

      iframe.onerror = () => {
        console.error('[FullScreenPDFModal] Failed to load PDF');
        hasTriggeredRef.current = false;
        onClose();
      };

      // Add iframe to document
      document.body.appendChild(iframe);

      // Close the modal state immediately (no UI to show)
      // But keep the iframe alive for printing
      onClose();
    }

    // Reset when modal closes
    if (!isOpen) {
      hasTriggeredRef.current = false;
    }
  }, [isOpen, pdfUrl, fileName, onClose]);

  // Cleanup iframe after a delay when component unmounts
  // We delay cleanup to ensure print dialog has time to work
  useEffect(() => {
    return () => {
      // Cleanup after 60 seconds to give plenty of time for printing
      setTimeout(() => {
        if (iframeRef.current && iframeRef.current.parentNode) {
          document.body.removeChild(iframeRef.current);
          iframeRef.current = null;
        }
      }, 60000);
    };
  }, []);

  // No visible UI - just triggers print
  return null;
};

FullScreenPDFModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  pdfUrl: PropTypes.string,
  fileName: PropTypes.string,
  autoPrint: PropTypes.bool
};

export default FullScreenPDFModal;
