/**
 * Tests for UploadResultButton component
 * Ensures 100% coverage including all rendering scenarios and interactions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadResultButton from '../UploadResultButton';
import React from 'react';

describe('UploadResultButton', () => {
  const mockRequest = {
    id: 1,
    investigationName: 'MRI',
    status: 'pending'
  };

  const defaultProps = {
    request: mockRequest,
    investigationName: 'MRI',
    onUploadClick: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render upload button for non-PSA test', () => {
      render(<UploadResultButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Upload MRI Result');
    });

    it('should render add value button for PSA test', () => {
      render(
        <UploadResultButton
          {...defaultProps}
          investigationName="PSA"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Add Value');
    });

    it('should render add value button for PSA TOTAL test', () => {
      render(
        <UploadResultButton
          {...defaultProps}
          investigationName="PSA TOTAL"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Add Value');
    });

    it('should render add value button for PSA FREE test', () => {
      render(
        <UploadResultButton
          {...defaultProps}
          investigationName="PSA FREE"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Add Value');
    });
  });

  describe('Not Required Status', () => {
    it('should not render button when status is not_required', () => {
      const notRequiredRequest = {
        ...mockRequest,
        status: 'not_required'
      };
      
      const { container } = render(
        <UploadResultButton
          request={notRequiredRequest}
          investigationName="MRI"
          onUploadClick={vi.fn()}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should not render button when status is NOT_REQUIRED (uppercase)', () => {
      const notRequiredRequest = {
        ...mockRequest,
        status: 'NOT_REQUIRED'
      };
      
      const { container } = render(
        <UploadResultButton
          request={notRequiredRequest}
          investigationName="MRI"
          onUploadClick={vi.fn()}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Click Handler', () => {
    it('should call onUploadClick when button is clicked', () => {
      const onUploadClick = vi.fn();
      render(
        <UploadResultButton
          {...defaultProps}
          onUploadClick={onUploadClick}
        />
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(onUploadClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('should have correct classes for button', () => {
      render(<UploadResultButton {...defaultProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass(
        'px-2.5',
        'py-1.5',
        'bg-teal-600',
        'text-white',
        'text-xs',
        'font-medium',
        'rounded-md',
        'hover:bg-teal-700',
        'transition-colors',
        'flex',
        'items-center',
        'gap-1.5'
      );
    });
  });
});

