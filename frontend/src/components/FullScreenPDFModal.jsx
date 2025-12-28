import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { IoClose, IoDownload, IoPrint, IoChevronBack, IoChevronForward, IoAdd, IoRemove } from 'react-icons/io5';
import { useEscapeKey } from '../utils/useEscapeKey';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const FullScreenPDFModal = ({ isOpen, onClose, pdfUrl, fileName, autoPrint = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState('width'); // 'width', 'height', 'page'
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const hasPrintedRef = useRef(false);
  const renderTaskRef = useRef(null);

  // Close on Escape key
  useEscapeKey(() => {
    if (isOpen) {
      onClose();
    }
  });

  // Load PDF document
  useEffect(() => {
    if (!isOpen || !pdfUrl) {
      setPdfDocument(null);
      setCurrentPage(1);
      setTotalPages(0);
      return;
    }

    setIsLoading(true);
    setPdfError(false);
    hasPrintedRef.current = false;

    const loadPdf = async () => {
      try {
        console.log('[FullScreenPDFModal] Loading PDF:', pdfUrl.substring(0, 50) + '...');
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        console.log('[FullScreenPDFModal] PDF loaded, pages:', pdf.numPages);
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setIsLoading(false);

        // Auto-print if enabled
        if (autoPrint && !hasPrintedRef.current) {
          hasPrintedRef.current = true;
          setTimeout(() => {
            handlePrint();
          }, 1000);
        }
      } catch (error) {
        console.error('[FullScreenPDFModal] Error loading PDF:', error);
        setPdfError(true);
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isOpen, pdfUrl, autoPrint]);

  // Calculate scale to fit container
  const calculateScale = useCallback((page, containerWidth, containerHeight) => {
    const viewport = page.getViewport({ scale: 1 });

    if (fitMode === 'width') {
      return (containerWidth - 40) / viewport.width; // 40px for padding
    } else if (fitMode === 'height') {
      return (containerHeight - 40) / viewport.height;
    } else {
      // Fit entire page
      const scaleX = (containerWidth - 40) / viewport.width;
      const scaleY = (containerHeight - 40) / viewport.height;
      return Math.min(scaleX, scaleY);
    }
  }, [fitMode]);

  // Render current page
  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || !containerRef.current) return;

    const renderPage = async () => {
      try {
        // Cancel any ongoing render
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel().catch(() => { });
        }

        const page = await pdfDocument.getPage(currentPage);
        const container = containerRef.current;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate scale to fit
        const calculatedScale = calculateScale(page, containerWidth, containerHeight);
        setScale(calculatedScale);

        const viewport = page.getViewport({ scale: calculatedScale });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas dimensions
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Render PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        renderTaskRef.current = page.render(renderContext);
        await renderTaskRef.current.promise;

        console.log('[FullScreenPDFModal] Page rendered:', currentPage, 'at scale:', calculatedScale);
      } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('[FullScreenPDFModal] Error rendering page:', error);
        }
      }
    };

    renderPage();
  }, [pdfDocument, currentPage, fitMode, calculateScale]);

  // Re-render on window resize
  useEffect(() => {
    if (!pdfDocument) return;

    const handleResize = () => {
      // Trigger re-render by updating fit mode
      setFitMode(prev => prev);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDocument]);

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

  if (!isOpen || !pdfUrl) {
    return null;
  }

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = fileName || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    // Open PDF in new window for printing
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    } else {
      window.print();
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const zoomIn = () => {
    setFitMode('custom');
    setScale(prev => Math.min(prev * 1.25, 5));
  };

  const zoomOut = () => {
    setFitMode('custom');
    setScale(prev => Math.max(prev * 0.8, 0.25));
  };

  const fitToWidth = () => {
    setFitMode('width');
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
      {/* Header */}
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

        {/* Page navigation and zoom controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {totalPages > 1 && (
            <>
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                style={{
                  padding: '6px',
                  backgroundColor: currentPage <= 1 ? '#666' : '#0f766e',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                type="button"
              >
                <IoChevronBack style={{ fontSize: '18px', color: 'white' }} />
              </button>
              <span style={{ color: 'white', fontSize: '14px', minWidth: '80px', textAlign: 'center' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= totalPages}
                style={{
                  padding: '6px',
                  backgroundColor: currentPage >= totalPages ? '#666' : '#0f766e',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                type="button"
              >
                <IoChevronForward style={{ fontSize: '18px', color: 'white' }} />
              </button>
              <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 8px' }} />
            </>
          )}

          <button
            onClick={zoomOut}
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
            title="Zoom Out"
            type="button"
          >
            <IoRemove style={{ fontSize: '18px', color: 'white' }} />
          </button>
          <span style={{ color: 'white', fontSize: '12px', minWidth: '50px', textAlign: 'center' }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
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
            title="Zoom In"
            type="button"
          >
            <IoAdd style={{ fontSize: '18px', color: 'white' }} />
          </button>
          <button
            onClick={fitToWidth}
            style={{
              padding: '4px 8px',
              backgroundColor: fitMode === 'width' ? '#0f766e' : '#0d9488',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              color: 'white'
            }}
            title="Fit to Width"
            type="button"
          >
            Fit
          </button>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '0 8px' }} />

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

      {/* PDF Container */}
      <div
        ref={containerRef}
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          backgroundColor: '#374151',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '20px'
        }}
      >
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #1f2937',
              borderTopColor: '#14b8a6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <p style={{ color: 'white', fontSize: '14px', margin: 0 }}>Loading PDF...</p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {pdfError && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div style={{ color: '#f87171', fontSize: '18px', marginBottom: '8px' }}>Failed to load PDF</div>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>
              The PDF could not be displayed. Please try downloading it instead.
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
              Download PDF
            </button>
          </div>
        )}

        {!isLoading && !pdfError && (
          <canvas
            ref={canvasRef}
            style={{
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              backgroundColor: 'white'
            }}
          />
        )}
      </div>

      {/* Footer */}
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
        <span>Press ESC to close • Use scroll to navigate</span>
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
