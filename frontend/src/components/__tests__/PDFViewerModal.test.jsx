/**
 * Tests for PDFViewerModal.jsx
 * Ensures 100% coverage including all rendering paths, interactions, and edge cases
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PDFViewerModal from '../PDFViewerModal';
import React from 'react';

// Mock useEscapeKey
vi.mock('../utils/useEscapeKey', () => ({
  useEscapeKey: vi.fn((callback) => {
    // Simulate escape key behavior
    if (typeof callback === 'function') {
      // Store callback for testing
      window.__escapeKeyCallback = callback;
    }
  })
}));

// Mock createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (element, target) => element
  };
});

describe('PDFViewerModal', () => {
  const mockOnClose = vi.fn();
  const mockPdfUrl = 'https://example.com/test.pdf';
  const mockFileName = 'test.pdf';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock window methods
    global.window.print = vi.fn();
    global.console.error = vi.fn();
    global.console.log = vi.fn();
    global.alert = vi.fn();
    
    // Mock document methods
    global.document.createElement = vi.fn((tag) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          style: { display: '' },
          click: vi.fn(),
          remove: vi.fn()
        };
      }
      return {};
    });
    
    global.document.body = {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete window.__escapeKeyCallback;
  });

  it('should not render when isOpen is false', () => {
    render(
      <PDFViewerModal
        isOpen={false}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    expect(screen.queryByText('PDF Viewer')).not.toBeInTheDocument();
  });

  it('should not render when pdfUrl is missing', () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={null}
        fileName={mockFileName}
      />
    );
    expect(screen.queryByText('PDF Viewer')).not.toBeInTheDocument();
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

  it('should render default fileName when fileName is not provided', () => {
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
    
    rerender(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="https://example.com/new.pdf"
        fileName={mockFileName}
      />
    );
    
    expect(screen.getByText('Loading PDF...')).toBeInTheDocument();
  });

  it('should handle iframe load event', async () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const iframe = screen.getByTitle('PDF Document');
    fireEvent.load(iframe);
    
    await waitFor(() => {
      expect(screen.queryByText('Loading PDF...')).not.toBeInTheDocument();
    });
  });

  it('should handle iframe error event', async () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const iframe = screen.getByTitle('PDF Document');
    fireEvent.error(iframe);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load PDF')).toBeInTheDocument();
    });
  });

  it('should handle download button click', () => {
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
    
    expect(global.document.createElement).toHaveBeenCalledWith('a');
    expect(global.document.body.appendChild).toHaveBeenCalled();
  });

  it('should handle download with default fileName', () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
      />
    );
    
    const downloadButton = screen.getByTitle('Download');
    fireEvent.click(downloadButton);
    
    expect(global.document.createElement).toHaveBeenCalledWith('a');
  });

  it('should handle download error', () => {
    const createElementSpy = vi.spyOn(global.document, 'createElement');
    createElementSpy.mockImplementation(() => {
      throw new Error('Download error');
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
    
    expect(global.console.error).toHaveBeenCalledWith('Error downloading PDF:', expect.any(Error));
    expect(global.alert).toHaveBeenCalledWith('Failed to download PDF. Please try again.');
    
    createElementSpy.mockRestore();
  });

  it('should handle print button click with contentWindow', async () => {
    const mockContentWindow = {
      focus: vi.fn(),
      print: vi.fn()
    };
    
    const mockIframe = {
      contentWindow: mockContentWindow
    };
    
    // Mock iframe ref
    React.useRef = vi.fn(() => ({ current: mockIframe }));
    
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const printButton = screen.getByTitle('Print');
    fireEvent.click(printButton);
    
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    
    expect(mockContentWindow.focus).toHaveBeenCalled();
    expect(mockContentWindow.print).toHaveBeenCalled();
  });

  it('should handle print with fallback to window.print when contentWindow is null', () => {
    const mockIframe = {
      contentWindow: null
    };
    
    React.useRef = vi.fn(() => ({ current: mockIframe }));
    
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const printButton = screen.getByTitle('Print');
    fireEvent.click(printButton);
    
    expect(global.window.print).toHaveBeenCalled();
  });

  it('should handle print error and try fallback methods', async () => {
    const mockContentWindow = {
      focus: vi.fn(() => {
        throw new Error('Focus error');
      }),
      print: vi.fn()
    };
    
    const mockContentDocument = {
      execCommand: vi.fn()
    };
    
    const mockIframe = {
      contentWindow: mockContentWindow,
      contentDocument: mockContentDocument
    };
    
    React.useRef = vi.fn(() => ({ current: mockIframe }));
    
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const printButton = screen.getByTitle('Print');
    fireEvent.click(printButton);
    
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    
    expect(global.console.error).toHaveBeenCalledWith('Error printing PDF:', expect.any(Error));
    expect(mockContentDocument.execCommand).toHaveBeenCalledWith('print', false, null);
  });

  it('should handle print error with contentWindow fallback', async () => {
    const mockContentWindow = {
      focus: vi.fn(() => {
        throw new Error('Focus error');
      }),
      print: vi.fn()
    };
    
    const mockIframe = {
      contentWindow: mockContentWindow,
      contentDocument: null
    };
    
    React.useRef = vi.fn(() => ({ current: mockIframe }));
    
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const printButton = screen.getByTitle('Print');
    fireEvent.click(printButton);
    
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    
    expect(mockContentWindow.print).toHaveBeenCalled();
  });

  it('should handle print error with final fallback to window.print', async () => {
    const mockIframe = {
      contentWindow: null,
      contentDocument: null
    };
    
    React.useRef = vi.fn(() => ({ current: mockIframe }));
    
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const printButton = screen.getByTitle('Print');
    fireEvent.click(printButton);
    
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    
    expect(global.window.print).toHaveBeenCalled();
  });

  it('should auto-print when autoPrint is true', async () => {
    const mockContentWindow = {
      focus: vi.fn(),
      print: vi.fn()
    };
    
    const mockIframe = {
      contentWindow: mockContentWindow
    };
    
    React.useRef = vi.fn(() => ({ current: mockIframe }));
    
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
        autoPrint={true}
      />
    );
    
    const iframe = screen.getByTitle('PDF Document');
    fireEvent.load(iframe);
    
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();
    
    expect(mockContentWindow.focus).toHaveBeenCalled();
    expect(mockContentWindow.print).toHaveBeenCalled();
  });

  it('should not auto-print multiple times', async () => {
    const mockContentWindow = {
      focus: vi.fn(),
      print: vi.fn()
    };
    
    const mockIframe = {
      contentWindow: mockContentWindow
    };
    
    React.useRef = vi.fn(() => ({ current: mockIframe }));
    
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
        autoPrint={true}
      />
    );
    
    const iframe = screen.getByTitle('PDF Document');
    fireEvent.load(iframe);
    
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();
    
    // Trigger load again
    fireEvent.load(iframe);
    
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();
    
    // Should only print once
    expect(mockContentWindow.print).toHaveBeenCalledTimes(1);
  });

  it('should handle close button click', () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const closeButtons = screen.getAllByText('Close');
    fireEvent.click(closeButtons[0]);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show error state with download option', () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const iframe = screen.getByTitle('PDF Document');
    fireEvent.error(iframe);
    
    expect(screen.getByText('Failed to load PDF')).toBeInTheDocument();
    expect(screen.getByText('Try Downloading Instead')).toBeInTheDocument();
  });

  it('should handle download from error state', () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const iframe = screen.getByTitle('PDF Document');
    fireEvent.error(iframe);
    
    const downloadButton = screen.getByText('Try Downloading Instead');
    fireEvent.click(downloadButton);
    
    expect(global.document.createElement).toHaveBeenCalledWith('a');
  });

  it('should hide iframe when loading', () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const iframe = screen.getByTitle('PDF Document');
    expect(iframe.className).toContain('hidden');
  });

  it('should show iframe when loaded', async () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const iframe = screen.getByTitle('PDF Document');
    fireEvent.load(iframe);
    
    await waitFor(() => {
      expect(iframe.className).toContain('block');
    });
  });

  it('should handle escape key press', () => {
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    if (window.__escapeKeyCallback) {
      window.__escapeKeyCallback();
    }
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle print fallback error', async () => {
    const mockContentWindow = {
      focus: vi.fn(() => {
        throw new Error('Focus error');
      }),
      print: vi.fn(() => {
        throw new Error('Print error');
      })
    };
    
    const mockIframe = {
      contentWindow: mockContentWindow,
      contentDocument: null
    };
    
    React.useRef = vi.fn(() => ({ current: mockIframe }));
    
    render(
      <PDFViewerModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const printButton = screen.getByTitle('Print');
    fireEvent.click(printButton);
    
    vi.advanceTimersByTime(100);
    await vi.runAllTimersAsync();
    
    expect(global.console.error).toHaveBeenCalledWith('Fallback print error:', expect.any(Error));
    expect(global.window.print).toHaveBeenCalled();
  });
});




