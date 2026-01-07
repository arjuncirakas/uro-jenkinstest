import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
vi.mock('react-icons/io5', () => ({
  IoClose: () => <span data-testid="close-icon" />,
  IoDownload: () => <span data-testid="download-icon" />,
  IoPrint: () => <span data-testid="print-icon" />
}));

vi.mock('../../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn((callback) => {
    globalThis.__escapeKeyCallback = callback;
  })
}));

vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node) => node
  };
});

// NOW import component AFTER all mocks
import PDFViewerModal from '../PDFViewerModal';

describe('PDFViewerModal Component', () => {
  const mockOnClose = vi.fn();
  const mockPdfUrl = 'https://example.com/test.pdf';
  const mockFileName = 'test-document.pdf';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    globalThis.alert = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <PDFViewerModal
          isOpen={false}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should not render when pdfUrl is missing', () => {
      const { container } = render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={null}
          fileName={mockFileName}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true and pdfUrl is provided', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );
      expect(screen.getByText(mockFileName)).toBeInTheDocument();
    });

    it('should display default title when fileName is not provided', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
        />
      );
      expect(screen.getByText('PDF Viewer')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );
      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when header close button is clicked', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const closeButtons = screen.getAllByTitle('Close');
      fireEvent.click(closeButtons[0]);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should display ESC key hint in footer', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );
      expect(screen.getByText('Press ESC to close')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should have download button', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );
      expect(screen.getByTitle('Download')).toBeInTheDocument();
    });

    it('should have print button', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );
      expect(screen.getByTitle('Print')).toBeInTheDocument();
    });
  });

  describe('Iframe Events', () => {
    it('should hide loading state when iframe loads', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.load(iframe);

      expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
    });

    it('should display iframe with correct src', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      expect(iframe).toHaveAttribute('src', mockPdfUrl);
    });
  });

  describe('State Reset', () => {
    it('should reset state when modal opens', () => {
      const { rerender } = render(
        <PDFViewerModal
          isOpen={false}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      rerender(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
    });

    it('should reset state when pdfUrl changes', () => {
      const { rerender } = render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.load(iframe);

      expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();

      rerender(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl="https://example.com/different.pdf"
          fileName={mockFileName}
        />
      );

      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    it('should download PDF when download button is clicked', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const downloadButton = screen.getByTitle('Download');
      fireEvent.click(downloadButton);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should use default filename when fileName is not provided', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
        />
      );

      const downloadButton = screen.getByTitle('Download');
      fireEvent.click(downloadButton);

      expect(createElementSpy).toHaveBeenCalled();
    });

    it('should handle download error gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('Download failed');
      });
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const downloadButton = screen.getByTitle('Download');
      fireEvent.click(downloadButton);

      expect(consoleError).toHaveBeenCalled();
      expect(globalThis.alert).toHaveBeenCalledWith('Failed to download PDF. Please try again.');
      
      consoleError.mockRestore();
      createElementSpy.mockRestore();
    });
  });

  describe('Print Functionality', () => {
    it('should print PDF when print button is clicked', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.load(iframe);

      await waitFor(() => {
        expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
      });

      const printButton = screen.getByTitle('Print');
      fireEvent.click(printButton);

      await act(async () => {
        await vi.advanceTimersByTime(100);
      });

      expect(printSpy).toHaveBeenCalled();
      printSpy.mockRestore();
    });

    it('should use iframe contentWindow print when available', async () => {
      const mockContentWindow = {
        focus: vi.fn(),
        print: vi.fn()
      };
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true
      });

      fireEvent.load(iframe);

      await waitFor(() => {
        expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
      });

      const printButton = screen.getByTitle('Print');
      fireEvent.click(printButton);

      await act(async () => {
        await vi.advanceTimersByTime(100);
      });

      expect(mockContentWindow.focus).toHaveBeenCalled();
      expect(mockContentWindow.print).toHaveBeenCalled();
    });

    it('should fallback to window.print when iframe contentWindow is not available', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      Object.defineProperty(iframe, 'contentWindow', {
        value: null,
        writable: true
      });

      fireEvent.load(iframe);

      await waitFor(() => {
        expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
      });

      const printButton = screen.getByTitle('Print');
      fireEvent.click(printButton);

      expect(printSpy).toHaveBeenCalled();
      printSpy.mockRestore();
    });

    it('should handle print error and use fallback methods', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      const mockContentWindow = {
        focus: vi.fn(() => { throw new Error('Focus failed'); }),
        print: vi.fn(() => { throw new Error('Print failed'); })
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true
      });
      Object.defineProperty(iframe, 'contentDocument', {
        value: { execCommand: execCommandSpy },
        writable: true
      });

      fireEvent.load(iframe);

      await waitFor(() => {
        expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
      });

      const printButton = screen.getByTitle('Print');
      fireEvent.click(printButton);

      await act(async () => {
        await vi.advanceTimersByTime(100);
      });

      expect(consoleError).toHaveBeenCalled();
      expect(printSpy).toHaveBeenCalled();
      
      consoleError.mockRestore();
      printSpy.mockRestore();
      execCommandSpy.mockRestore();
    });

    it('should use contentDocument.execCommand as fallback', async () => {
      const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      const mockContentWindow = {
        focus: vi.fn(() => { throw new Error('Focus failed'); }),
        print: vi.fn(() => { throw new Error('Print failed'); })
      };
      Object.defineProperty(iframe, 'contentWindow', {
        value: mockContentWindow,
        writable: true
      });
      const mockContentDocument = {
        execCommand: execCommandSpy
      };
      Object.defineProperty(iframe, 'contentDocument', {
        value: mockContentDocument,
        writable: true
      });

      fireEvent.load(iframe);

      await waitFor(() => {
        expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
      });

      const printButton = screen.getByTitle('Print');
      fireEvent.click(printButton);

      await act(async () => {
        await vi.advanceTimersByTime(100);
      });

      expect(execCommandSpy).toHaveBeenCalledWith('print', false, null);
      
      consoleError.mockRestore();
      execCommandSpy.mockRestore();
    });
  });

  describe('Auto-Print Functionality', () => {
    it('should auto-print when autoPrint prop is true', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
          autoPrint={true}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.load(iframe);

      await act(async () => {
        await vi.advanceTimersByTime(500);
      });

      expect(printSpy).toHaveBeenCalled();
      printSpy.mockRestore();
    });

    it('should not auto-print when autoPrint prop is false', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
          autoPrint={false}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.load(iframe);

      await act(async () => {
        await vi.advanceTimersByTime(500);
      });

      expect(printSpy).not.toHaveBeenCalled();
      printSpy.mockRestore();
    });

    it('should only auto-print once even if iframe loads multiple times', async () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
          autoPrint={true}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.load(iframe);

      await act(async () => {
        await vi.advanceTimersByTime(500);
      });

      expect(printSpy).toHaveBeenCalledTimes(1);

      fireEvent.load(iframe);

      await act(async () => {
        await vi.advanceTimersByTime(500);
      });

      expect(printSpy).toHaveBeenCalledTimes(1);
      printSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when iframe fails to load', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.error(iframe);

      expect(screen.getByText('Failed to load PDF')).toBeInTheDocument();
      expect(screen.getByText(/The PDF could not be displayed/i)).toBeInTheDocument();
    });

    it('should show download button in error state', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.error(iframe);

      expect(screen.getByText('Try Downloading Instead')).toBeInTheDocument();
    });

    it('should allow download from error state', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.error(iframe);

      const downloadButton = screen.getByText('Try Downloading Instead');
      fireEvent.click(downloadButton);

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });

    it('should hide loading state when error occurs', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.error(iframe);

      expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
    });
  });

  describe('Escape Key Handling', () => {
    it('should call onClose when Escape key is pressed', () => {
      const { useEscapeKey } = require('../../utils/useEscapeKey');
      
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      if (globalThis.__escapeKeyCallback) {
        globalThis.__escapeKeyCallback();
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Footer Close Button', () => {
    it('should call onClose when footer close button is clicked', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const closeButtons = screen.getAllByText('Close');
      const footerCloseButton = closeButtons.find(btn => 
        btn.closest('.bg-gray-100') !== null
      );
      
      if (footerCloseButton) {
        fireEvent.click(footerCloseButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Iframe Visibility', () => {
    it('should hide iframe while loading', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      expect(iframe).toHaveClass('hidden');
    });

    it('should show iframe after loading', () => {
      render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.load(iframe);

      expect(iframe).toHaveClass('block');
      expect(iframe).not.toHaveClass('hidden');
    });
  });

  describe('State Reset on URL Change', () => {
    it('should reset loading state when pdfUrl changes', () => {
      const { rerender } = render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.load(iframe);

      expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();

      rerender(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl="https://example.com/different.pdf"
          fileName={mockFileName}
        />
      );

      expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
    });

    it('should reset error state when pdfUrl changes', () => {
      const { rerender } = render(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      const iframe = screen.getByTitle(mockFileName);
      fireEvent.error(iframe);

      expect(screen.getByText('Failed to load PDF')).toBeInTheDocument();

      rerender(
        <PDFViewerModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl="https://example.com/different.pdf"
          fileName={mockFileName}
        />
      );

      expect(screen.queryByText('Failed to load PDF')).not.toBeInTheDocument();
    });
  });
});









