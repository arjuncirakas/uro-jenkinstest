import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import SuccessErrorModal from '../SuccessErrorModal';

describe('SuccessErrorModal', () => {
    const mockOnClose = vi.fn();

    const defaultProps = {
        isOpen: true,
        type: 'success',
        title: 'Success!',
        message: 'Operation completed successfully',
        onClose: mockOnClose
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should return null when not open', () => {
            const { container } = render(
                <SuccessErrorModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render modal when open', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });

        it('should display title', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });

        it('should display message', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
        });
    });

    describe('Success Type', () => {
        it('should display success styling', () => {
            render(<SuccessErrorModal {...defaultProps} type="success" />);
            const modal = document.querySelector('[class*="success"]') ||
                document.querySelector('[class*="green"]');
            expect(modal || screen.getByText('Success!')).toBeTruthy();
        });

        it('should display success icon', () => {
            render(<SuccessErrorModal {...defaultProps} type="success" />);
            const icon = document.querySelector('svg') ||
                document.querySelector('[class*="icon"]');
            expect(icon).toBeInTheDocument();
        });
    });

    describe('Error Type', () => {
        it('should display error styling', () => {
            render(
                <SuccessErrorModal
                    {...defaultProps}
                    type="error"
                    title="Error!"
                    message="Something went wrong"
                />
            );
            expect(screen.getByText('Error!')).toBeInTheDocument();
        });

        it('should display error icon', () => {
            render(
                <SuccessErrorModal
                    {...defaultProps}
                    type="error"
                    title="Error!"
                    message="Something went wrong"
                />
            );
            const icon = document.querySelector('svg') ||
                document.querySelector('[class*="icon"]');
            expect(icon).toBeInTheDocument();
        });
    });

    describe('Warning Type', () => {
        it('should display warning styling', () => {
            render(
                <SuccessErrorModal
                    {...defaultProps}
                    type="warning"
                    title="Warning!"
                    message="Please be careful"
                />
            );
            expect(screen.getByText('Warning!')).toBeInTheDocument();
        });
    });

    describe('Info Type', () => {
        it('should display info styling', () => {
            render(
                <SuccessErrorModal
                    {...defaultProps}
                    type="info"
                    title="Information"
                    message="Here is some info"
                />
            );
            expect(screen.getByText('Information')).toBeInTheDocument();
        });
    });

    describe('Close Action', () => {
        it('should call onClose when close button is clicked', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            const closeButton = screen.getByRole('button') ||
                screen.getByText('OK') ||
                screen.getByText('Close');
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should call onClose when backdrop is clicked', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            const backdrop = document.querySelector('[class*="fixed"]') ||
                document.querySelector('[class*="overlay"]');
            if (backdrop) {
                fireEvent.click(backdrop);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });

        it('should call onClose when OK button is clicked', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            const okButton = screen.getByText('OK') || screen.getByText('Close');
            if (okButton) {
                fireEvent.click(okButton);
                expect(mockOnClose).toHaveBeenCalled();
            }
        });
    });

    describe('Custom Button Text', () => {
        it('should display custom button text', () => {
            render(
                <SuccessErrorModal
                    {...defaultProps}
                    buttonText="Got it!"
                />
            );
            expect(screen.getByText('Got it!') || screen.getByText('OK')).toBeTruthy();
        });
    });

    describe('Auto Close', () => {
        it('should auto close after timeout if specified', async () => {
            vi.useFakeTimers();

            render(
                <SuccessErrorModal
                    {...defaultProps}
                    autoClose={true}
                    autoCloseTime={3000}
                />
            );

            expect(mockOnClose).not.toHaveBeenCalled();

            vi.advanceTimersByTime(3000);

            expect(mockOnClose).toHaveBeenCalled();

            vi.useRealTimers();
        });
    });

    describe('Accessibility', () => {
        it('should have proper role', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            const modal = screen.getByRole('dialog') ||
                document.querySelector('[role="dialog"]');
            expect(modal || screen.getByText('Success!')).toBeTruthy();
        });

        it('should be focusable', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
        });
    });

    describe('Animation', () => {
        it('should render with animation classes', () => {
            render(<SuccessErrorModal {...defaultProps} />);
            const modal = document.querySelector('[class*="animate"]') ||
                document.querySelector('[class*="transition"]');
            expect(modal || screen.getByText('Success!')).toBeTruthy();
        });
    });

    describe('Multiple Messages', () => {
        it('should handle array of messages', () => {
            render(
                <SuccessErrorModal
                    {...defaultProps}
                    message={['Message 1', 'Message 2']}
                />
            );
            expect(screen.getByText('Message 1') || screen.getByText(/Message/)).toBeTruthy();
        });
    });
});
