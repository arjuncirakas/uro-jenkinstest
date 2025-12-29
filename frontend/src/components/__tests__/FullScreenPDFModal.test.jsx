/**
 * Tests for FullScreenPDFModal.jsx
 * Ensures 100% coverage including all useEffect paths, iframe creation, and cleanup
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import FullScreenPDFModal from '../FullScreenPDFModal';
import React from 'react';

describe('FullScreenPDFModal', () => {
  const mockOnClose = vi.fn();
  const mockPdfUrl = 'https://example.com/test.pdf';
  const mockFileName = 'test.pdf';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock document methods
    global.document.createElement = vi.fn((tag) => {
      const element = {
        tagName: tag.toUpperCase(),
        style: {},
        src: '',
        onload: null,
        onerror: null,
        contentWindow: {
          focus: vi.fn(),
          print: vi.fn()
        },
        parentNode: null
      };
      return element;
    });
    
    global.document.body = {
      appendChild: vi.fn(),
      removeChild: vi.fn()
    };
    
    global.console.log = vi.fn();
    global.console.error = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

  it('should not create iframe when isOpen is false', () => {
    render(
      <FullScreenPDFModal
        isOpen={false}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    expect(global.document.createElement).not.toHaveBeenCalled();
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
    
    expect(global.document.createElement).not.toHaveBeenCalled();
  });

  it('should create iframe when isOpen is true and pdfUrl is provided', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    expect(global.document.createElement).toHaveBeenCalledWith('iframe');
    expect(global.document.body.appendChild).toHaveBeenCalled();
  });

  it('should set iframe styles correctly', () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: null
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    expect(mockIframe.style.cssText).toBe('position:fixed;right:0;bottom:0;width:0;height:0;border:0;');
    expect(mockIframe.src).toBe(mockPdfUrl);
  });

  it('should log when opening print dialog', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    expect(global.console.log).toHaveBeenCalledWith(
      '[FullScreenPDFModal] Opening print dialog for:',
      mockFileName
    );
  });

  it('should trigger print when iframe loads', async () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: null
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Trigger onload
    if (mockIframe.onload) {
      mockIframe.onload();
    }
    
    // Advance timers to trigger setTimeout
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();
    
    expect(mockIframe.contentWindow.focus).toHaveBeenCalled();
    expect(mockIframe.contentWindow.print).toHaveBeenCalled();
    expect(global.console.log).toHaveBeenCalledWith(
      '[FullScreenPDFModal] PDF loaded, triggering print'
    );
  });

  it('should handle print error gracefully', async () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: null, // Simulate error case
      parentNode: null
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Trigger onload
    if (mockIframe.onload) {
      mockIframe.onload();
    }
    
    // Advance timers
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();
    
    // Should not throw, error should be caught
    expect(global.console.error).not.toHaveBeenCalled();
  });

  it('should handle iframe onerror event', () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: null
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Trigger onerror
    if (mockIframe.onerror) {
      mockIframe.onerror();
    }
    
    expect(global.console.error).toHaveBeenCalledWith(
      '[FullScreenPDFModal] Failed to load PDF'
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose immediately after creating iframe', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not trigger print multiple times with hasTriggeredRef', () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: null
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    const { rerender } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Rerender with same props - should not create new iframe
    rerender(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Should only create iframe once
    expect(global.document.createElement).toHaveBeenCalledTimes(1);
  });

  it('should reset hasTriggeredRef when modal closes', () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: null
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    const { rerender } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
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
    
    // Should create iframe again
    expect(global.document.createElement).toHaveBeenCalledTimes(2);
  });

  it('should cleanup iframe after 60 seconds on unmount', async () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: {
        removeChild: vi.fn()
      }
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    const { unmount } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Store iframe reference
    const iframeRef = mockIframe;
    
    unmount();
    
    // Advance timers by 60 seconds
    vi.advanceTimersByTime(60000);
    await vi.runAllTimersAsync();
    
    expect(global.document.body.removeChild).toHaveBeenCalled();
  });

  it('should not cleanup iframe if parentNode is null', async () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(),
        print: vi.fn()
      },
      parentNode: null
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    const { unmount } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    unmount();
    
    // Advance timers by 60 seconds
    vi.advanceTimersByTime(60000);
    await vi.runAllTimersAsync();
    
    // Should not call removeChild if parentNode is null
    expect(global.document.body.removeChild).not.toHaveBeenCalled();
  });

  it('should handle print exception in try-catch', async () => {
    const mockIframe = {
      tagName: 'IFRAME',
      style: {},
      src: '',
      onload: null,
      onerror: null,
      contentWindow: {
        focus: vi.fn(() => {
          throw new Error('Focus error');
        }),
        print: vi.fn()
      },
      parentNode: null
    };
    
    global.document.createElement = vi.fn(() => mockIframe);
    
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Trigger onload
    if (mockIframe.onload) {
      mockIframe.onload();
    }
    
    // Advance timers
    vi.advanceTimersByTime(500);
    await vi.runAllTimersAsync();
    
    expect(global.console.error).toHaveBeenCalledWith(
      '[FullScreenPDFModal] Print error:',
      expect.any(Error)
    );
  });

  it('should handle empty fileName', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName=""
      />
    );
    
    expect(global.console.log).toHaveBeenCalledWith(
      '[FullScreenPDFModal] Opening print dialog for:',
      ''
    );
  });

  it('should handle undefined fileName', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={undefined}
      />
    );
    
    expect(global.console.log).toHaveBeenCalledWith(
      '[FullScreenPDFModal] Opening print dialog for:',
      undefined
    );
  });

  it('should handle pdfUrl change', () => {
    const { rerender } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const newPdfUrl = 'https://example.com/new.pdf';
    rerender(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={newPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Should create new iframe with new URL
    expect(global.document.createElement).toHaveBeenCalledTimes(2);
  });

  it('should handle fileName change', () => {
    const { rerender } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const newFileName = 'new-file.pdf';
    rerender(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={mockPdfUrl}
        fileName={newFileName}
      />
    );
    
    expect(global.console.log).toHaveBeenCalledWith(
      '[FullScreenPDFModal] Opening print dialog for:',
      newFileName
    );
  });

  it('should handle onClose dependency change', () => {
    const firstOnClose = vi.fn();
    const { rerender } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={firstOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    const secondOnClose = vi.fn();
    rerender(
      <FullScreenPDFModal
        isOpen={true}
        onClose={secondOnClose}
        pdfUrl={mockPdfUrl}
        fileName={mockFileName}
      />
    );
    
    // Should call the new onClose
    expect(secondOnClose).toHaveBeenCalled();
  });
});


