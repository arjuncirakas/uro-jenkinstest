import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NotificationToast from '../NotificationToast';

// Mock react-icons
vi.mock('react-icons/fi', () => ({
    FiCheckCircle: () => <span data-testid="check-icon" />,
    FiXCircle: () => <span data-testid="x-icon" />,
    FiX: () => <span data-testid="close-icon" />
}));

describe('NotificationToast Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Rendering', () => {
        it('should not render when isOpen is false', () => {
            const onClose = vi.fn();
            const { container } = render(
                <NotificationToast isOpen={false} onClose={onClose} message="Test" />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render when isOpen is true', () => {
            const onClose = vi.fn();
            render(
                <NotificationToast isOpen={true} onClose={onClose} message="Test message" />
            );
            expect(screen.getByText('Test message')).toBeInTheDocument();
        });

        it('should render success toast with correct styling', () => {
            const onClose = vi.fn();
            render(
                <NotificationToast
                    isOpen={true}
                    onClose={onClose}
                    message="Success!"
                    type="success"
                />
            );
            expect(screen.getByText('Success!')).toBeInTheDocument();
            expect(screen.getByTestId('check-icon')).toBeInTheDocument();
        });

        it('should render error toast with correct styling', () => {
            const onClose = vi.fn();
            render(
                <NotificationToast
                    isOpen={true}
                    onClose={onClose}
                    message="Error occurred!"
                    type="error"
                />
            );
            expect(screen.getByText('Error occurred!')).toBeInTheDocument();
            expect(screen.getByTestId('x-icon')).toBeInTheDocument();
        });

        it('should default to success type', () => {
            const onClose = vi.fn();
            render(
                <NotificationToast
                    isOpen={true}
                    onClose={onClose}
                    message="Default type"
                />
            );
            expect(screen.getByTestId('check-icon')).toBeInTheDocument();
        });
    });

    describe('Auto-close functionality', () => {
        it('should auto-close after default duration (3000ms)', () => {
            const onClose = vi.fn();
            render(
                <NotificationToast isOpen={true} onClose={onClose} message="Test" />
            );

            expect(onClose).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(3000);
            });

            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should auto-close after custom duration', () => {
            const onClose = vi.fn();
            render(
                <NotificationToast
                    isOpen={true}
                    onClose={onClose}
                    message="Test"
                    duration={5000}
                />
            );

            act(() => {
                vi.advanceTimersByTime(4000);
            });
            expect(onClose).not.toHaveBeenCalled();

            act(() => {
                vi.advanceTimersByTime(1000);
            });
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should not auto-close when duration is 0', () => {
            const onClose = vi.fn();
            render(
                <NotificationToast
                    isOpen={true}
                    onClose={onClose}
                    message="Test"
                    duration={0}
                />
            );

            act(() => {
                vi.advanceTimersByTime(10000);
            });

            expect(onClose).not.toHaveBeenCalled();
        });

        it('should clear timeout on unmount', () => {
            const onClose = vi.fn();
            const { unmount } = render(
                <NotificationToast isOpen={true} onClose={onClose} message="Test" />
            );

            unmount();

            act(() => {
                vi.advanceTimersByTime(5000);
            });

            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('Manual close', () => {
        it('should call onClose when close button is clicked', () => {
            const onClose = vi.fn();
            render(
                <NotificationToast isOpen={true} onClose={onClose} message="Test" />
            );

            const closeButton = screen.getByRole('button');
            fireEvent.click(closeButton);

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Styling variations', () => {
        it('should apply success colors for success type', () => {
            const onClose = vi.fn();
            const { container } = render(
                <NotificationToast
                    isOpen={true}
                    onClose={onClose}
                    message="Success"
                    type="success"
                />
            );

            // Check that success class is applied
            const toastContainer = container.querySelector('.bg-green-50');
            expect(toastContainer).toBeInTheDocument();
        });

        it('should apply error colors for error type', () => {
            const onClose = vi.fn();
            const { container } = render(
                <NotificationToast
                    isOpen={true}
                    onClose={onClose}
                    message="Error"
                    type="error"
                />
            );

            // Check that error class is applied
            const toastContainer = container.querySelector('.bg-red-50');
            expect(toastContainer).toBeInTheDocument();
        });
    });
});
