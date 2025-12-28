import React, { useEffect, useRef } from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';

/**
 * FullScreenPDFModal - Directly triggers print dialog for PDF
 * 
 * This component skips the modal preview and directly opens the print dialog
 * since the browser's print preview shows the PDF correctly.
 */
const FullScreenPDFModal = ({ isOpen, onClose, pdfUrl, fileName, autoPrint = false }) => {
  const hasTriggeredRef = useRef(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen && pdfUrl && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;

      console.log('[FullScreenPDFModal] Triggering print for:', {
        pdfUrl: pdfUrl.substring(0, 50) + '...',
        fileName
      });

      // Create a hidden iframe to load the PDF and trigger print
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.src = pdfUrl;

      iframeRef.current = iframe;
      document.body.appendChild(iframe);

      // When iframe loads, trigger print
      iframe.onload = () => {
        try {
          // Give the PDF a moment to render inside the iframe
          setTimeout(() => {
            try {
              if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
              }
            } catch (error) {
              console.error('[FullScreenPDFModal] Error printing:', error);
              // Fallback: open PDF in new tab for manual printing
              window.open(pdfUrl, '_blank');
            }

            // Clean up and close after print dialog
            setTimeout(() => {
              if (iframe.parentNode) {
                document.body.removeChild(iframe);
              }
              hasTriggeredRef.current = false;
              onClose();
            }, 500);
          }, 500);
        } catch (error) {
          console.error('[FullScreenPDFModal] Error in onload:', error);
          onClose();
        }
      };

      iframe.onerror = () => {
        console.error('[FullScreenPDFModal] Error loading PDF');
        // Fallback: open PDF in new tab
        window.open(pdfUrl, '_blank');
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
        hasTriggeredRef.current = false;
        onClose();
      };
    }

    // Reset when modal closes
    if (!isOpen) {
      hasTriggeredRef.current = false;
    }

    // Cleanup on unmount
    return () => {
      if (iframeRef.current && iframeRef.current.parentNode) {
        document.body.removeChild(iframeRef.current);
      }
    };
  }, [isOpen, pdfUrl, fileName, onClose]);

  // This component doesn't render anything visible - just triggers print
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
