/**
 * Tests for SessionTimeoutWarning.jsx
 * Ensures 100% coverage including all rendering paths and interactions
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SessionTimeoutWarning from '../SessionTimeoutWarning';
import sessionTimeoutService from '../../../services/sessionTimeoutService';
import React from 'react';

// Mock sessionTimeoutService
vi.mock('../../../services/sessionTimeoutService', () => ({
  default: {
    getMinutesRemaining: vi.fn(() => 5),
    extendSession: vi.fn()
  }
}));

describe('SessionTimeoutWarning', () => {
  const mockOnExtendSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when isOpen is false', () => {
    render(
      <SessionTimeoutWarning
        isOpen={false}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.queryByText('Session Timeout Warning')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText('Session Timeout Warning')).toBeInTheDocument();
    expect(screen.getByText('Your session will expire soon')).toBeInTheDocument();
  });

  it('should display inactivity message', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText(/For security and compliance with HIPAA\/GDPR regulations/i)).toBeInTheDocument();
  });

  it('should display time remaining', () => {
    sessionTimeoutService.getMinutesRemaining.mockReturnValue(5);
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText('5 minutes')).toBeInTheDocument();
  });

  it('should display singular "minute" when time remaining is 1', () => {
    sessionTimeoutService.getMinutesRemaining.mockReturnValue(1);
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText('1 minute')).toBeInTheDocument();
    expect(screen.queryByText('1 minutes')).not.toBeInTheDocument();
  });

  it('should display plural "minutes" when time remaining is not 1', () => {
    sessionTimeoutService.getMinutesRemaining.mockReturnValue(3);
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText('3 minutes')).toBeInTheDocument();
  });

  it('should update countdown timer every second', () => {
    sessionTimeoutService.getMinutesRemaining.mockReturnValue(5);
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    expect(screen.getByText('5 minutes')).toBeInTheDocument();

    // Update mock to return different value
    sessionTimeoutService.getMinutesRemaining.mockReturnValue(4);
    vi.advanceTimersByTime(1000);
    vi.runAllTimers();

    expect(screen.getByText('4 minutes')).toBeInTheDocument();
  });

  it('should call extendSession and onExtendSession when Continue Session button is clicked', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    const continueButton = screen.getByText('Continue Session');
    fireEvent.click(continueButton);

    expect(sessionTimeoutService.extendSession).toHaveBeenCalledTimes(1);
    expect(mockOnExtendSession).toHaveBeenCalledTimes(1);
  });

  it('should call extendSession and onExtendSession when close button (X) is clicked', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);

    expect(sessionTimeoutService.extendSession).toHaveBeenCalledTimes(1);
    expect(mockOnExtendSession).toHaveBeenCalledTimes(1);
  });

  it('should handle onExtendSession being undefined', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={undefined}
      />
    );

    const continueButton = screen.getByText('Continue Session');
    fireEvent.click(continueButton);

    expect(sessionTimeoutService.extendSession).toHaveBeenCalledTimes(1);
    // Should not throw error when onExtendSession is undefined
  });

  it('should clear interval when modal closes', () => {
    const { rerender } = render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    rerender(
      <SessionTimeoutWarning
        isOpen={false}
        onExtendSession={mockOnExtendSession}
      />
    );

    // Advance time - getMinutesRemaining should not be called after modal closes
    const initialCallCount = sessionTimeoutService.getMinutesRemaining.mock.calls.length;
    vi.advanceTimersByTime(2000);
    vi.runAllTimers();

    // Call count should not increase after modal closes
    expect(sessionTimeoutService.getMinutesRemaining.mock.calls.length).toBe(initialCallCount);
  });

  it('should clear interval when component unmounts', () => {
    const { unmount } = render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    unmount();

    // Advance time - getMinutesRemaining should not be called after unmount
    const initialCallCount = sessionTimeoutService.getMinutesRemaining.mock.calls.length;
    vi.advanceTimersByTime(2000);
    vi.runAllTimers();

    expect(sessionTimeoutService.getMinutesRemaining.mock.calls.length).toBe(initialCallCount);
  });

  it('should update when isOpen changes from false to true', () => {
    const { rerender } = render(
      <SessionTimeoutWarning
        isOpen={false}
        onExtendSession={mockOnExtendSession}
      />
    );

    expect(screen.queryByText('Session Timeout Warning')).not.toBeInTheDocument();

    rerender(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    expect(screen.getByText('Session Timeout Warning')).toBeInTheDocument();
  });

  it('should update when isOpen changes from true to false', () => {
    const { rerender } = render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    expect(screen.getByText('Session Timeout Warning')).toBeInTheDocument();

    rerender(
      <SessionTimeoutWarning
        isOpen={false}
        onExtendSession={mockOnExtendSession}
      />
    );

    expect(screen.queryByText('Session Timeout Warning')).not.toBeInTheDocument();
  });

  it('should display "Inactivity Detected" text', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText('Inactivity Detected')).toBeInTheDocument();
  });

  it('should display "Time remaining:" label', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText('Time remaining:')).toBeInTheDocument();
  });

  it('should display helper text about extending session', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText(/Click to extend your session and continue working/i)).toBeInTheDocument();
  });

  it('should handle rapid countdown updates', () => {
    sessionTimeoutService.getMinutesRemaining.mockReturnValue(5);
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    // Simulate rapid countdown
    for (let i = 4; i >= 1; i--) {
      sessionTimeoutService.getMinutesRemaining.mockReturnValue(i);
      vi.advanceTimersByTime(1000);
      vi.runAllTimers();
    }

    expect(screen.getByText('1 minute')).toBeInTheDocument();
  });

  it('should handle onExtendSession dependency change', () => {
    const firstOnExtendSession = vi.fn();
    const { rerender } = render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={firstOnExtendSession}
      />
    );

    const secondOnExtendSession = vi.fn();
    rerender(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={secondOnExtendSession}
      />
    );

    const continueButton = screen.getByText('Continue Session');
    fireEvent.click(continueButton);

    expect(secondOnExtendSession).toHaveBeenCalledTimes(1);
    expect(firstOnExtendSession).not.toHaveBeenCalled();
  });

  it('should handle edge case of 0 minutes remaining', () => {
    sessionTimeoutService.getMinutesRemaining.mockReturnValue(0);
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText('0 minutes')).toBeInTheDocument();
  });

  it('should handle large time values', () => {
    sessionTimeoutService.getMinutesRemaining.mockReturnValue(30);
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' });
    expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
  });

  it('should render all required UI elements', () => {
    render(
      <SessionTimeoutWarning
        isOpen={true}
        onExtendSession={mockOnExtendSession}
      />
    );

    expect(screen.getByText('Session Timeout Warning')).toBeInTheDocument();
    expect(screen.getByText('Your session will expire soon')).toBeInTheDocument();
    expect(screen.getByText('Inactivity Detected')).toBeInTheDocument();
    expect(screen.getByText('Time remaining:')).toBeInTheDocument();
    expect(screen.getByText('Continue Session')).toBeInTheDocument();
  });
});
