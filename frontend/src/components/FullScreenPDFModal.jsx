import React, { useEffect, useRef } from 'react'; // eslint-disable-line no-unused-vars
import PropTypes from 'prop-types';

/**
 * FullScreenPDFModal - Opens PDF in a new browser tab for full-screen viewing
 * 
 * This component opens the PDF in a new tab instead of a modal because:
 * 1. Browser PDFs viewers work best when they have the full tab
 * 2. No CSP issues with workers or external scripts
 * 3. User has full control over zoom, print, download via browser controls
 * 4. Works consistently across all browsers
 */
const FullScreenPDFModal = ({ isOpen, onClose, pdfUrl, fileName, autoPrint = false }) => {
  const hasOpenedRef = useRef(false);
  const windowRef = useRef(null);

  useEffect(() => {
    if (isOpen && pdfUrl && !hasOpenedRef.current) {
      hasOpenedRef.current = true;

      console.log('[FullScreenPDFModal] Opening PDF in new tab:', {
        pdfUrl: pdfUrl.substring(0, 50) + '...',
        fileName,
        autoPrint
      });

      // Open PDF in new tab
      const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      windowRef.current = newWindow;

      if (newWindow) {
        // Set the tab title if possible
        try {
          newWindow.document.title = fileName || 'PDF Document';
        } catch {
          // Cross-origin security may prevent this, which is fine
        }

        // If autoPrint is enabled, trigger print after the PDF loads
        if (autoPrint) {
          // Use a timeout to allow the PDF to load
          setTimeout(() => {
            try {
              if (newWindow && !newWindow.closed) {
                newWindow.print();
              }
            } catch (error) {
              console.log('[FullScreenPDFModal] Auto-print not available:', error);
            }
          }, 2000);
        }
      } else {
        // Popup was blocked, show a fallback
        console.warn('[FullScreenPDFModal] Popup blocked, providing fallback');
        alert('Please allow popups to view the PDF, or use the download option.');
      }

      // Close the modal state after opening
      // Small delay to ensure the window opened
      setTimeout(() => {
        onClose();
        hasOpenedRef.current = false;
      }, 100);
    }

    // Reset when modal closes
    if (!isOpen) {
      hasOpenedRef.current = false;
    }
  }, [isOpen, pdfUrl, fileName, autoPrint, onClose]);

  // This component doesn't render anything visible
  // The PDF opens in a new tab instead
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
