import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';

// ALL MOCKS MUST BE AT THE TOP - BEFORE COMPONENT IMPORTS
// (No external mocks needed for this component, but keeping structure consistent)

// NOW import component AFTER all mocks
import FullScreenPDFModal from '../FullScreenPDFModal';

describe('FullScreenPDFModal', () => {
  const mockOnClose = vi.fn();
  const mockPdfUrl = 'https://example.com/test.pdf';
  const mockFileName = 'test-document.pdf';

  let mockIframe;
  let originalCreateElement;
  let originalAppendChild;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Store original methods
    originalCreateElement = document.createElement;
    originalAppendChild = document.body.appendChild;
    
    // Create mock iframe
    mockIframe = {
      style: { cssText: '' },
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: document.body,
      remove: vi.fn()
    };
    
    // Mock document.createElement
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'iframe') {
        return mockIframe;
      }
      return originalCreateElement.call(document, tagName);
    });
    
    // Mock document.body.appendChild
    document.body.appendChild = vi.fn();
  });

  afterEach(() => {
    // Restore original methods
    document.createElement = originalCreateElement;
    document.body.appendChild = originalAppendChild;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    // Reset mock iframe
    mockIframe = {
      style: { cssText: '' },
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: document.body,
      remove: vi.fn()
    };
  });

  describe('Rendering', () => {
    it('should return null (no visible UI)', () => {
      const { container } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('PDF Loading and Printing', () => {
    it('should create iframe when modal opens with pdfUrl', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should not create iframe when isOpen is false', () => {
      render(
        <FullScreenPDFModal
          isOpen={false}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      expect(document.createElement).not.toHaveBeenCalledWith('iframe');
    });

    it('should not create iframe when pdfUrl is missing', () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={null}
          fileName={mockFileName}
        />
      );

      expect(document.createElement).not.toHaveBeenCalledWith('iframe');
    });

    it('should set iframe src to pdfUrl', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.src).toBe(mockPdfUrl);
      }, { timeout: 1000 });
    });

    it('should set iframe styles to hidden', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.style.cssText).toContain('position:fixed');
        expect(mockIframe.style.cssText).toContain('width:0');
        expect(mockIframe.style.cssText).toContain('height:0');
      }, { timeout: 1000 });
    });

    it('should append iframe to document body', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.body.appendChild).toHaveBeenCalledWith(mockIframe);
      }, { timeout: 1000 });
    });

    it('should call onClose immediately after creating iframe', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      }, { timeout: 1000 });
    });
  });

  describe('Print Dialog Trigger', () => {
    it('should trigger print when iframe loads', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.onload).toBeDefined();
      });

      // Simulate iframe load
      if (mockIframe.onload) {
        mockIframe.onload();
      }

      // Advance timers to trigger setTimeout
      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockIframe.contentWindow.focus).toHaveBeenCalled();
        expect(mockIframe.contentWindow.print).toHaveBeenCalled();
      });
    });

    it('should handle print error gracefully', async () => {
      // Set contentWindow to null to simulate error
      mockIframe.contentWindow = null;

      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.onload).toBeDefined();
      });

      if (mockIframe.onload) {
        mockIframe.onload();
      }

      vi.advanceTimersByTime(500);

      // Should not throw error
      await waitFor(() => {
        expect(console.error).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle iframe load error', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.onerror).toBeDefined();
      });

      // Simulate iframe error
      if (mockIframe.onerror) {
        mockIframe.onerror();
      }

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('[FullScreenPDFModal] Failed to load PDF');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('should reset hasTriggeredRef when modal closes', async () => {
      const { rerender } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      // Close modal
      rerender(
        <FullScreenPDFModal
          isOpen={false}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      // Reopen modal - should create new iframe
      rerender(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      });
    });

    it('should cleanup iframe on unmount', () => {
      const { unmount } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      unmount();

      // Advance timers to trigger cleanup timeout
      vi.advanceTimersByTime(60000);

      expect(mockIframe.remove).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing fileName', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={undefined}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should not trigger print multiple times for same modal open', async () => {
      const { rerender } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });

      // Rerender with same props - should not create new iframe
      rerender(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      // Should still be called only once (hasTriggeredRef prevents re-triggering)
      expect(document.createElement).toHaveBeenCalledTimes(1);
    });

    it('should reset hasTriggeredRef when pdfUrl changes', async () => {
      const { rerender } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledTimes(1);
      });

      vi.clearAllMocks();

      // Change pdfUrl
      rerender(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl="https://example.com/different.pdf"
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle iframe.contentWindow being null during print', async () => {
      mockIframe.contentWindow = null;

      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.onload).toBeDefined();
      });

      if (mockIframe.onload) {
        mockIframe.onload();
      }

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalled();
      });
    });

    it('should handle iframe.parentNode being null during cleanup', () => {
      mockIframe.parentNode = null;

      const { unmount } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      unmount();

      vi.advanceTimersByTime(60000);

      // Should not throw error even if parentNode is null
      expect(mockIframe.remove).not.toHaveBeenCalled();
    });

    it('should handle multiple rapid open/close cycles', async () => {
      const { rerender } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      // Close
      rerender(
        <FullScreenPDFModal
          isOpen={false}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      // Reopen immediately
      rerender(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      });
    });

    it('should handle print when contentWindow.print throws error', async () => {
      const printError = new Error('Print failed');
      mockIframe.contentWindow.print = vi.fn(() => {
        throw printError;
      });

      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.onload).toBeDefined();
      });

      if (mockIframe.onload) {
        mockIframe.onload();
      }

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('[FullScreenPDFModal] Print error:', printError);
      });
    });

    it('should handle print when contentWindow.focus throws error', async () => {
      const focusError = new Error('Focus failed');
      mockIframe.contentWindow.focus = vi.fn(() => {
        throw focusError;
      });

      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.onload).toBeDefined();
      });

      if (mockIframe.onload) {
        mockIframe.onload();
      }

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalled();
      });
    });

    it('should handle iframeRef.current being null during cleanup', () => {
      const { unmount } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      // Simulate iframeRef.current being null
      mockIframe.parentNode = null;

      unmount();

      vi.advanceTimersByTime(60000);

      // Should not throw error
      expect(mockIframe.remove).not.toHaveBeenCalled();
    });

    it('should log when opening print dialog', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('[FullScreenPDFModal] Opening print dialog for:', mockFileName);
      });
    });

    it('should log when PDF loads', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(mockIframe.onload).toBeDefined();
      });

      if (mockIframe.onload) {
        mockIframe.onload();
      }

      await waitFor(() => {
        expect(console.log).toHaveBeenCalledWith('[FullScreenPDFModal] PDF loaded, triggering print');
      });
    });

    it('should reset hasTriggeredRef when modal closes', async () => {
      const { rerender } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      // Close modal
      rerender(
        <FullScreenPDFModal
          isOpen={false}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      // Reopen - should create new iframe since hasTriggeredRef was reset
      rerender(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      });
    });

    it('should handle fileName being null', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={null}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      });
    });

    it('should handle fileName being empty string', async () => {
      render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName=""
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalled();
      });
    });

    it('should not create iframe when hasTriggeredRef is true', async () => {
      const { rerender } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      await waitFor(() => {
        expect(document.createElement).toHaveBeenCalledTimes(1);
      });

      vi.clearAllMocks();

      // Rerender with same props - should not create new iframe
      rerender(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      // Should not create new iframe
      expect(document.createElement).not.toHaveBeenCalled();
    });

    it('should handle cleanup timeout being cleared', () => {
      const { unmount } = render(
        <FullScreenPDFModal
          isOpen={true}
          onClose={mockOnClose}
          pdfUrl={mockPdfUrl}
          fileName={mockFileName}
        />
      );

      unmount();

      // Advance timers but not enough to trigger cleanup
      vi.advanceTimersByTime(30000);

      expect(mockIframe.remove).not.toHaveBeenCalled();

      // Advance to trigger cleanup
      vi.advanceTimersByTime(30000);

      expect(mockIframe.remove).toHaveBeenCalled();
    });
  });
});
