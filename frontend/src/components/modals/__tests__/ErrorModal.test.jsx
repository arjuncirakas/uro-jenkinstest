/**
 * Tests for ErrorModal.jsx
 * Ensures 100% coverage including all rendering paths and interactions
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorModal from '../ErrorModal';
import React from 'react';

describe('ErrorModal', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when isOpen is false', () => {
    render(
      <ErrorModal
        isOpen={false}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should render default title when title is not provided', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        message="Test error"
      />
    );
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should render default message when message is not provided', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Custom Error"
      />
    );
    expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument();
  });

  it('should render errors array when provided', () => {
    const errors = [
      { field: 'email', message: 'Email is required' },
      { field: 'password', message: 'Password must be at least 8 characters' }
    ];

    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Validation Error"
        errors={errors}
      />
    );

    expect(screen.getByText('Validation Errors')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('should render error field names with proper formatting', () => {
    const errors = [
      { field: 'firstName', message: 'First name is required' }
    ];

    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        errors={errors}
      />
    );

    expect(screen.getByText(/first name/i)).toBeInTheDocument();
  });

  it('should render message when errors array is empty', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Custom error message"
        errors={[]}
      />
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Validation Errors')).not.toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onConfirm when Try Again button is clicked and onConfirm is provided', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
        title="Error"
        message="Test error"
      />
    );

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Try Again button is clicked and onConfirm is not provided', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should auto-close after 8 seconds', async () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );

    expect(mockOnClose).not.toHaveBeenCalled();

    vi.advanceTimersByTime(8000);
    await vi.runAllTimersAsync();

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should clear timeout when modal closes', () => {
    const { rerender } = render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );

    rerender(
      <ErrorModal
        isOpen={false}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );

    vi.advanceTimersByTime(8000);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should clear timeout when component unmounts', () => {
    const { unmount } = render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );

    unmount();

    vi.advanceTimersByTime(8000);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should handle multiple errors correctly', () => {
    const errors = [
      { field: 'field1', message: 'Error 1' },
      { field: 'field2', message: 'Error 2' },
      { field: 'field3', message: 'Error 3' }
    ];

    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        errors={errors}
      />
    );

    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
    expect(screen.getByText('Error 3')).toBeInTheDocument();
  });

  it('should handle error field with camelCase formatting', () => {
    const errors = [
      { field: 'dateOfBirth', message: 'Date of birth is required' }
    ];

    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        errors={errors}
      />
    );

    expect(screen.getByText(/date of birth/i)).toBeInTheDocument();
  });

  it('should handle null errors array', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
        errors={null}
      />
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.queryByText('Validation Errors')).not.toBeInTheDocument();
  });

  it('should handle undefined errors', () => {
    render(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
        errors={undefined}
      />
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.queryByText('Validation Errors')).not.toBeInTheDocument();
  });

  it('should update when isOpen changes from false to true', () => {
    const { rerender } = render(
      <ErrorModal
        isOpen={false}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );

    expect(screen.queryByText('Error')).not.toBeInTheDocument();

    rerender(
      <ErrorModal
        isOpen={true}
        onClose={mockOnClose}
        title="Error"
        message="Test error"
      />
    );

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should handle onClose dependency change', () => {
    const firstOnClose = vi.fn();
    const { rerender } = render(
      <ErrorModal
        isOpen={true}
        onClose={firstOnClose}
        title="Error"
        message="Test error"
      />
    );

    const secondOnClose = vi.fn();
    rerender(
      <ErrorModal
        isOpen={true}
        onClose={secondOnClose}
        title="Error"
        message="Test error"
      />
    );

    vi.advanceTimersByTime(8000);
    expect(secondOnClose).toHaveBeenCalledTimes(1);
    expect(firstOnClose).not.toHaveBeenCalled();
  });
});




