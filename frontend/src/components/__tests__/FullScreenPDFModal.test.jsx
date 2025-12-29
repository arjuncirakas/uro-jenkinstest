/**
 * Tests for FullScreenPDFModal component
 * Ensures 100% coverage including all scenarios
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import FullScreenPDFModal from '../FullScreenPDFModal';
import React from 'react';

describe('FullScreenPDFModal', () => {
  let mockPrint;
  let mockAppendChild;
  let mockRemoveChild;
  let mockOnClose;
  let iframeInstances;

  beforeEach(() => {
    vi.useFakeTimers();
    mockPrint = vi.fn();
    mockOnClose = vi.fn();
    mockAppendChild = vi.fn();
    mockRemoveChild = vi.fn();
    iframeInstances = [];

    // Mock document.body
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;

    // Mock console methods
    global.console.log = vi.fn();
    global.console.error = vi.fn();

    // Mock iframe contentWindow
    global.HTMLIFrameElement = class {
      constructor() {
        this.style = {};
        this.src = '';
        this.onload = null;
        this.onerror = null;
        this.contentWindow = {
          focus: vi.fn(),
          print: mockPrint
        };
        this.parentNode = document.body;
        iframeInstances.push(this);
      }
    };

    // Mock createElement
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'iframe') {
        return new global.HTMLIFrameElement();
      }
      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return null (no visible UI)', () => {
    const { container } = render(
      <FullScreenPDFModal
        isOpen={false}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should create iframe when opened with pdfUrl', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );
    expect(document.createElement).toHaveBeenCalledWith('iframe');
    expect(mockAppendChild).toHaveBeenCalled();
    expect(iframeInstances.length).toBe(1);
    expect(iframeInstances[0].src).toBe('test.pdf');
    expect(console.log).toHaveBeenCalledWith('[FullScreenPDFModal] Opening print dialog for:', 'test.pdf');
  });

  it('should not create iframe when not open', () => {
    render(
      <FullScreenPDFModal
        isOpen={false}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
      />
    );
    expect(document.createElement).not.toHaveBeenCalled();
  });

  it('should not create iframe when pdfUrl is missing', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl={null}
      />
    );
    expect(document.createElement).not.toHaveBeenCalled();
  });

  it('should trigger print when iframe loads', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    // Get the iframe instance
    const iframeInstance = iframeInstances[0];
    expect(iframeInstance).toBeDefined();
    expect(iframeInstance.onload).toBeDefined();

    // Simulate iframe load
    if (iframeInstance.onload) {
      iframeInstance.onload();
    }

    expect(console.log).toHaveBeenCalledWith('[FullScreenPDFModal] PDF loaded, triggering print');

    // Advance timers to trigger setTimeout
    vi.advanceTimersByTime(500);

    expect(mockPrint).toHaveBeenCalled();
    expect(iframeInstance.contentWindow.focus).toHaveBeenCalled();
  });

  it('should call onClose when iframe errors', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    // Get the iframe instance
    const iframeInstance = iframeInstances[0];
    expect(iframeInstance).toBeDefined();
    expect(iframeInstance.onerror).toBeDefined();

    // Simulate iframe error
    if (iframeInstance.onerror) {
      iframeInstance.onerror();
    }

    expect(console.error).toHaveBeenCalledWith('[FullScreenPDFModal] Failed to load PDF');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose immediately after creating iframe', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );
    // onClose should be called after iframe is created
    expect(mockOnClose).toHaveBeenCalled();
    expect(iframeInstances.length).toBe(1);
  });

  it('should handle print error gracefully', () => {
    const mockContentWindow = {
      focus: vi.fn(),
      print: vi.fn(() => {
        throw new Error('Print failed');
      })
    };

    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    const iframeInstance = iframeInstances[0];
    iframeInstance.contentWindow = mockContentWindow;

    if (iframeInstance.onload) {
      iframeInstance.onload();
    }

    vi.advanceTimersByTime(500);

    expect(console.error).toHaveBeenCalledWith('[FullScreenPDFModal] Print error:', expect.any(Error));
  });

  it('should not trigger print multiple times', () => {
    const { rerender } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    const iframeInstance1 = iframeInstances[0];
    if (iframeInstance1.onload) {
      iframeInstance1.onload();
    }
    vi.advanceTimersByTime(500);

    // Rerender with same props - should not create new iframe
    rerender(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    // Should only be called once and only one iframe created
    expect(mockPrint).toHaveBeenCalledTimes(1);
    expect(iframeInstances.length).toBe(1);
  });

  it('should reset hasTriggeredRef when modal closes', () => {
    const { rerender } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    expect(iframeInstances.length).toBe(1);

    rerender(
      <FullScreenPDFModal
        isOpen={false}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    // Should be able to trigger again when reopened
    rerender(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    // Should create a new iframe when reopened
    expect(iframeInstances.length).toBe(2);
  });

  it('should cleanup iframe after delay on unmount', () => {
    const { unmount } = render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    const iframeInstance = iframeInstances[0];
    expect(iframeInstance).toBeDefined();

    unmount();

    // Advance timers to trigger cleanup
    vi.advanceTimersByTime(60000);

    expect(mockRemoveChild).toHaveBeenCalledWith(iframeInstance);
  });

  it('should handle missing contentWindow gracefully', () => {
    render(
      <FullScreenPDFModal
        isOpen={true}
        onClose={mockOnClose}
        pdfUrl="test.pdf"
        fileName="test.pdf"
      />
    );

    const iframeInstance = iframeInstances[0];
    iframeInstance.contentWindow = null;

    if (iframeInstance.onload) {
      iframeInstance.onload();
    }

    vi.advanceTimersByTime(500);

    // Should not throw error - print should not be called when contentWindow is null
    expect(mockPrint).not.toHaveBeenCalled();
  });
});
