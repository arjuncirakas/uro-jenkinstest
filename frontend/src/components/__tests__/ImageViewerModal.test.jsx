import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock useEscapeKey hook
const mockUseEscapeKey = vi.fn();
vi.mock('../utils/useEscapeKey', () => ({
  useEscapeKey: (callback) => mockUseEscapeKey(callback)
}));

import ImageViewerModal from '../ImageViewerModal';

describe('ImageViewerModal', () => {
  const mockOnClose = vi.fn();
  const mockImageUrl = 'https://example.com/image.jpg';
  const mockFileName = 'test-image.jpg';

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEscapeKey.mockImplementation((callback) => {
      // Store callback for testing
      global.escapeKeyCallback = callback;
    });
  });

  afterEach(() => {
    delete global.escapeKeyCallback;
  });

  describe('Rendering', () => {
    it('should return null when not open', () => {
      const { container } = render(
        <ImageViewerModal
          isOpen={false}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should return null when imageUrl is missing', () => {
      const { container } = render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={null}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when open with imageUrl', () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
          fileName={mockFileName}
        />
      );
      expect(screen.getByText(mockFileName)).toBeInTheDocument();
    });

    it('should display default title when fileName is not provided', () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText('Image Viewer')).toBeInTheDocument();
    });
  });

  describe('Image Loading', () => {
    it('should show loading state initially', () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    it('should hide loading when image loads', async () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const img = screen.getByAltText('Image');
      fireEvent.load(img);

      await waitFor(() => {
        expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
      });
    });

    it('should show error state when image fails to load', async () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const img = screen.getByAltText('Image');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });
  });

  describe('Zoom Functionality', () => {
    it('should toggle zoom when zoom button is clicked', () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const zoomButton = screen.getByTitle('Zoom in');
      fireEvent.click(zoomButton);

      expect(screen.getByTitle('Fit to screen')).toBeInTheDocument();
    });

    it('should toggle zoom when image is clicked', async () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const img = screen.getByAltText('Image');
      fireEvent.load(img);

      await waitFor(() => {
        expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
      });

      fireEvent.click(img);
      expect(screen.getByTitle('Fit to screen')).toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    it('should download image when download button is clicked', () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
          fileName={mockFileName}
        />
      );

      const downloadButton = screen.getByTitle('Download');
      fireEvent.click(downloadButton);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should handle download error gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

      // Mock createElement to throw error
      const originalCreateElement = document.createElement;
      document.createElement = vi.fn(() => {
        throw new Error('Download failed');
      });

      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const downloadButton = screen.getByTitle('Download');
      fireEvent.click(downloadButton);

      expect(consoleError).toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalled();

      document.createElement = originalCreateElement;
      consoleError.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const closeButton = screen.getByTitle('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when footer close button is clicked', () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const footerCloseButton = screen.getByText('Close');
      fireEvent.click(footerCloseButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close on Escape key', () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      // Trigger escape key callback
      if (global.escapeKeyCallback) {
        global.escapeKeyCallback();
      }

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should reset state when modal opens', () => {
      const { rerender } = render(
        <ImageViewerModal
          isOpen={false}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      rerender(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    it('should reset state when imageUrl changes', () => {
      const { rerender } = render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl="image1.jpg"
        />
      );

      rerender(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl="image2.jpg"
        />
      );

      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show download button in error state', async () => {
      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const img = screen.getByAltText('Image');
      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.getByText('Try Downloading Instead')).toBeInTheDocument();
      });
    });

    it('should handle download from error state', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');

      render(
        <ImageViewerModal
          isOpen={true}
          onClose={mockOnClose}
          imageUrl={mockImageUrl}
        />
      );

      const img = screen.getByAltText('Image');
      fireEvent.error(img);

      await waitFor(() => {
        const downloadButton = screen.getByText('Try Downloading Instead');
        fireEvent.click(downloadButton);
      });

      expect(createElementSpy).toHaveBeenCalledWith('a');
    });
  });
});
























