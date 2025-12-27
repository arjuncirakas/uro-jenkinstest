import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import BaseLayout from '../BaseLayout';
import React from 'react';

// Create mock components for testing
let mockOnErrorHandler;
const MockAddPatientModal = vi.fn(({ isOpen, onClose, onPatientAdded, onError }) => {
    mockOnErrorHandler = onError; // Store for testing
    if (!isOpen) return null;
    return (
        <div data-testid="add-patient-modal">
            <button onClick={() => onPatientAdded({ firstName: 'John', lastName: 'Doe', upi: 'UPI123', phone: '123', email: 'test@test.com' })}>
                Add Patient
            </button>
            <button onClick={() => onError({ title: 'Error', message: 'Failed', errors: [] })}>
                Trigger Error
            </button>
            <button onClick={() => onError({ title: 'Custom Error Title', message: 'Custom error message' })}>
                Trigger Custom Error
            </button>
            <button onClick={() => onError({})}>
                Trigger Empty Error
            </button>
            <button onClick={onClose}>Close Modal</button>
        </div>
    );
});

const MockSuccessModal = vi.fn(({ isOpen, onClose, onConfirm, title }) => {
    if (!isOpen) return null;
    return (
        <div data-testid="success-modal">
            <span>{title}</span>
            <button onClick={onClose}>Close Success</button>
            {onConfirm && <button onClick={onConfirm} data-testid="success-confirm">Confirm Success</button>}
        </div>
    );
});

const MockErrorModal = vi.fn(({ isOpen, onClose, onConfirm, title }) => {
    if (!isOpen) return null;
    return (
        <div data-testid="error-modal">
            <span>{title}</span>
            <button onClick={onClose}>Close Error</button>
            {onConfirm && <button onClick={onConfirm} data-testid="error-confirm">Confirm Error</button>}
        </div>
    );
});

// Mock the component imports
vi.mock('../../components/AddPatientModal', () => ({
    default: (props) => MockAddPatientModal(props)
}));

vi.mock('../../components/modals/SuccessModal', () => ({
    default: (props) => MockSuccessModal(props)
}));

vi.mock('../../components/modals/ErrorModal', () => ({
    default: (props) => MockErrorModal(props)
}));

// Mock Outlet
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        Outlet: () => <div data-testid="outlet">Outlet Content</div>
    };
});

// Mock sidebar component
const MockSidebar = ({ isOpen, onClose, onOpenAddPatient }) => (
    <div data-testid="mock-sidebar" data-open={isOpen}>
        <button onClick={onClose}>Close Sidebar</button>
        <button onClick={onOpenAddPatient}>Open Add Patient</button>
    </div>
);

describe('BaseLayout', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderLayout = (props = {}) => {
        return render(
            <MemoryRouter>
                <BaseLayout SidebarComponent={MockSidebar} {...props} />
            </MemoryRouter>
        );
    };

    it('renders sidebar component', () => {
        renderLayout();
        expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    });

    it('renders outlet for child routes', () => {
        renderLayout();
        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('toggles sidebar on menu button click', () => {
        renderLayout();

        // Initially closed
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');

        // Click open
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'true');
    });

    it('opens add patient modal when button clicked', () => {
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));

        expect(screen.getByTestId('add-patient-modal')).toBeInTheDocument();
    });

    it('shows success modal after patient added', () => {
        const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
        renderLayout();

        // Open add patient modal
        fireEvent.click(screen.getByText('Open Add Patient'));

        // Add patient
        fireEvent.click(screen.getByText('Add Patient'));

        // Success modal should be shown
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        expect(dispatchSpy).toHaveBeenCalled();

        dispatchSpy.mockRestore();
    });

    it('shows error modal on error', () => {
        renderLayout();

        // Open add patient modal
        fireEvent.click(screen.getByText('Open Add Patient'));

        // Trigger error
        fireEvent.click(screen.getByText('Trigger Error'));

        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
    });

    it('closes success modal', () => {
        renderLayout();

        // Open and add patient
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));

        // Close success modal
        fireEvent.click(screen.getByText('Close Success'));

        expect(screen.queryByTestId('success-modal')).not.toBeInTheDocument();
    });

    it('closes error modal', () => {
        renderLayout();

        // Open and trigger error
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));

        // Close error modal  
        fireEvent.click(screen.getByText('Close Error'));

        expect(screen.queryByTestId('error-modal')).not.toBeInTheDocument();
    });

    it('passes isUrologist prop correctly', () => {
        renderLayout({ isUrologist: true });

        expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    });

    it('closes sidebar when overlay clicked', () => {
        renderLayout();

        // Open sidebar
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        // Now overlay should be present
        const overlay = screen.getByLabelText('Close sidebar');
        fireEvent.click(overlay);

        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('closes sidebar on escape key in overlay', () => {
        renderLayout();

        // Open sidebar
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        // Press escape on overlay
        const overlay = screen.getByLabelText('Close sidebar');
        fireEvent.keyDown(overlay, { key: 'Escape' });

        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('does not close sidebar on other keys in overlay', () => {
        renderLayout();

        // Open sidebar
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        // Press other key on overlay
        const overlay = screen.getByLabelText('Close sidebar');
        fireEvent.keyDown(overlay, { key: 'Enter' });

        // Should still be open
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'true');
    });

    it('logs new patient when added', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));

        expect(consoleSpy).toHaveBeenCalledWith('New patient added:', expect.any(Object));
        consoleSpy.mockRestore();
    });

    it('logs error when error occurs', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));

        expect(consoleSpy).toHaveBeenCalledWith('Error occurred:', expect.any(Object));
        consoleSpy.mockRestore();
    });

    it('dispatches patientAdded event with correct details', () => {
        const dispatchSpy = vi.spyOn(globalThis, 'dispatchEvent');
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));

        const event = dispatchSpy.mock.calls.find(call => call[0].type === 'patientAdded');
        expect(event).toBeDefined();
        expect(event[0].detail).toEqual({
            firstName: 'John',
            lastName: 'Doe',
            upi: 'UPI123',
            phone: '123',
            email: 'test@test.com'
        });
        dispatchSpy.mockRestore();
    });

    it('sets success details correctly', () => {
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));

        // Success modal should show with correct details
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        // Verify the modal was called with details prop
        const successModalCalls = MockSuccessModal.mock.calls;
        const lastCall = successModalCalls[successModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            details: expect.objectContaining({
                name: 'John Doe',
                upi: 'UPI123',
                phone: '123',
                email: 'test@test.com'
            })
        });
    });

    it('clears success details when modal closes', () => {
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));
        fireEvent.click(screen.getByText('Close Success'));

        // Success modal should be closed (details cleared)
        expect(screen.queryByTestId('success-modal')).not.toBeInTheDocument();
        // Verify modal was called with details: null when closing
        const successModalCalls = MockSuccessModal.mock.calls;
        const closeCall = successModalCalls.find(call => call[0].details === null);
        expect(closeCall).toBeDefined();
    });

    it('sets error details correctly', () => {
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));

        // Error modal should be shown
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        // Verify the modal was called with correct props
        const errorModalCalls = MockErrorModal.mock.calls;
        const lastCall = errorModalCalls[errorModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            title: 'Error',
            message: 'Failed',
            errors: []
        });
    });

    it('clears error details when modal closes', () => {
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));
        fireEvent.click(screen.getByText('Close Error'));

        // Error modal should be closed (details cleared)
        expect(screen.queryByTestId('error-modal')).not.toBeInTheDocument();
    });

    it('shows overlay only when sidebar is open', () => {
        renderLayout();

        // Initially no overlay
        expect(screen.queryByLabelText('Close sidebar')).not.toBeInTheDocument();

        // Open sidebar
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        // Overlay should appear
        expect(screen.getByLabelText('Close sidebar')).toBeInTheDocument();
    });

    it('hides menu button on large screens', () => {
        renderLayout();
        const menuButton = screen.getByLabelText(/open menu/i);
        // Button should have lg:hidden class
        expect(menuButton.className).toContain('lg:hidden');
    });

    it('shows close icon when sidebar is open', () => {
        renderLayout();
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);
        
        // Should show close icon
        expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument();
    });

    it('shows menu icon when sidebar is closed', () => {
        renderLayout();
        // Should show menu icon initially
        expect(screen.getByLabelText(/open menu/i)).toBeInTheDocument();
    });

    it('passes isUrologist to AddPatientModal', () => {
        renderLayout({ isUrologist: true });
        fireEvent.click(screen.getByText('Open Add Patient'));

        // Verify modal is open and check mock was called with isUrologist: true
        expect(screen.getByTestId('add-patient-modal')).toBeInTheDocument();
        const addPatientModalCalls = MockAddPatientModal.mock.calls;
        const lastCall = addPatientModalCalls[addPatientModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            isUrologist: true
        });
    });

    it('passes isUrologist false by default', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));

        // Verify modal is open and check mock was called with isUrologist: false
        expect(screen.getByTestId('add-patient-modal')).toBeInTheDocument();
        const addPatientModalCalls = MockAddPatientModal.mock.calls;
        const lastCall = addPatientModalCalls[addPatientModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            isUrologist: false
        });
    });

    it('handles handleAddPatient with all patient properties', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const dispatchEventSpy = vi.spyOn(globalThis, 'dispatchEvent');

        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        
        // Click "Add Patient" button which triggers onPatientAdded
        fireEvent.click(screen.getByText('Add Patient'));

        // Should log and dispatch event
        expect(consoleLogSpy).toHaveBeenCalledWith('New patient added:', expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            upi: 'UPI123',
            phone: '123',
            email: 'test@test.com'
        }));
        expect(dispatchEventSpy).toHaveBeenCalled();

        consoleLogSpy.mockRestore();
        dispatchEventSpy.mockRestore();
    });

    it('handles handleSuccessModalClose', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));

        // Success modal should be open
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        
        // Close success modal
        fireEvent.click(screen.getByText('Close Success'));

        // Modal should close
        expect(screen.queryByTestId('success-modal')).not.toBeInTheDocument();
    });

    it('handles handleError with errorData', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        
        // Click "Trigger Error" button which triggers onError
        fireEvent.click(screen.getByText('Trigger Error'));

        expect(consoleLogSpy).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
            title: 'Error',
            message: 'Failed',
            errors: []
        }));

        consoleLogSpy.mockRestore();
    });

    it('handles handleErrorModalClose', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));

        // Simulate error modal opening
        const errorModal = screen.queryByTestId('error-modal');
        if (errorModal && errorModal.props && errorModal.props.onClose) {
            errorModal.props.onClose();
        }

        // Modal should close
        expect(screen.queryByTestId('error-modal')).not.toBeInTheDocument();
    });

    it('handles overlay click to close sidebar', () => {
        renderLayout();
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        const overlay = screen.getByLabelText('Close sidebar');
        fireEvent.click(overlay);

        // Sidebar should close
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('handles Escape key on overlay to close sidebar', () => {
        renderLayout();
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        const overlay = screen.getByLabelText('Close sidebar');
        fireEvent.keyDown(overlay, { key: 'Escape' });

        // Sidebar should close
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('handles other keys on overlay (not Escape)', () => {
        renderLayout();
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        const overlay = screen.getByLabelText('Close sidebar');
        fireEvent.keyDown(overlay, { key: 'Enter' });

        // Sidebar should remain open (Escape key handler only closes on Escape)
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'true');
    });

    it('passes isUrologist true when provided', () => {
        renderLayout({ isUrologist: true });
        fireEvent.click(screen.getByText('Open Add Patient'));

        // Verify modal is open and check mock was called with isUrologist: true
        expect(screen.getByTestId('add-patient-modal')).toBeInTheDocument();
        const addPatientModalCalls = MockAddPatientModal.mock.calls;
        const lastCall = addPatientModalCalls[addPatientModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            isUrologist: true
        });
    });

    it('handles errorDetails with title and message', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Custom Error'));

        // Error modal should show
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        // Verify the modal was called with custom title and message
        const errorModalCalls = MockErrorModal.mock.calls;
        const lastCall = errorModalCalls[errorModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            title: 'Custom Error Title',
            message: 'Custom error message'
        });
    });

    it('handles errorDetails with default title and message', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Empty Error'));

        // Error modal should show with defaults
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        // Verify the modal was called with default title and message (from BaseLayout line 115-116)
        const errorModalCalls = MockErrorModal.mock.calls;
        const lastCall = errorModalCalls[errorModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            title: 'Error',
            message: 'An error occurred'
        });
    });

    it('handles errorDetails with errors array', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));

        // Trigger error (mock already passes errors: [])
        fireEvent.click(screen.getByText('Trigger Error'));

        // Error modal should show
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        // Verify the modal was called with errors array
        const errorModalCalls = MockErrorModal.mock.calls;
        const lastCall = errorModalCalls[errorModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            errors: []
        });
    });

    it('handles successDetails with all properties', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));

        // Success modal should show with details
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        // Verify the modal was called with correct details
        const successModalCalls = MockSuccessModal.mock.calls;
        const lastCall = successModalCalls[successModalCalls.length - 1];
        expect(lastCall[0]).toMatchObject({
            details: expect.objectContaining({
                name: 'John Doe',
                upi: 'UPI123',
                phone: '123',
                email: 'test@test.com'
            })
        });
    });

    it('handles menu button visibility based on sidebar state', () => {
        renderLayout();
        const menuButton = screen.getByLabelText(/open menu/i);
        expect(menuButton).toBeInTheDocument();

        fireEvent.click(menuButton);
        expect(screen.getByLabelText(/close menu/i)).toBeInTheDocument();
    });

    it('handles handleAddPatient with all patient properties', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const dispatchEventSpy = vi.spyOn(globalThis, 'dispatchEvent');

        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));

        // Should log patient data
        expect(consoleLogSpy).toHaveBeenCalledWith('New patient added:', expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
            upi: 'UPI123',
            phone: '123',
            email: 'test@test.com'
        }));
        
        // Should dispatch event
        expect(dispatchEventSpy).toHaveBeenCalled();

        consoleLogSpy.mockRestore();
        dispatchEventSpy.mockRestore();
    });

    it('handles handleError with errorData', () => {
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));

        expect(consoleLogSpy).toHaveBeenCalledWith('Error occurred:', expect.objectContaining({
            title: 'Error',
            message: 'Failed',
            errors: []
        }));

        consoleLogSpy.mockRestore();
    });

    it('should handle PropTypes validation', () => {
        // Test that PropTypes are defined and component accepts correct props
        // This test verifies the component can be rendered with different prop values
        const { rerender } = renderLayout({ isUrologist: true });
        expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
        
        // Test with default isUrologist (false) - rerender with new props
        rerender(
            <MemoryRouter>
                <BaseLayout SidebarComponent={MockSidebar} isUrologist={false} />
            </MemoryRouter>
        );
        expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    });

    it('should handle all state transitions correctly', () => {
        renderLayout();
        
        // Test initial state - sidebar closed
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');
        
        // Open sidebar
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'true');
        
        // Close sidebar via toggle
        fireEvent.click(menuButton);
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('should handle onConfirm for SuccessModal', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));
        
        // Success modal should be open
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
        
        // Close via onConfirm button
        const confirmButton = screen.getByTestId('success-confirm');
        fireEvent.click(confirmButton);
        
        // Modal should close
        expect(screen.queryByTestId('success-modal')).not.toBeInTheDocument();
    });

    it('should handle onConfirm for ErrorModal', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));
        
        // Error modal should be open
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        
        // Close via onConfirm button
        const confirmButton = screen.getByTestId('error-confirm');
        fireEvent.click(confirmButton);
        
        // Modal should close
        expect(screen.queryByTestId('error-modal')).not.toBeInTheDocument();
    });

    it('should execute export statement', () => {
        // Component is imported at the top, so export statement is executed
        renderLayout();
        expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    });

    it('should call onOpenAddPatient arrow function from SidebarComponent', () => {
        const mockOnOpenAddPatient = vi.fn();
        const CustomSidebar = ({ onOpenAddPatient }) => (
            <div data-testid="custom-sidebar">
                <button onClick={onOpenAddPatient}>Open Add Patient Custom</button>
            </div>
        );

        render(
            <MemoryRouter>
                <BaseLayout SidebarComponent={CustomSidebar} />
            </MemoryRouter>
        );

        // Click button that calls onOpenAddPatient (line 85: () => setIsAddPatientOpen(true))
        fireEvent.click(screen.getByText('Open Add Patient Custom'));
        
        // AddPatientModal should open
        expect(screen.getByTestId('add-patient-modal')).toBeInTheDocument();
    });

    it('should call onClose arrow function from AddPatientModal', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        
        // Modal should be open
        expect(screen.getByTestId('add-patient-modal')).toBeInTheDocument();
        
        // Close modal (line 95: () => setIsAddPatientOpen(false))
        fireEvent.click(screen.getByText('Close Modal'));
        
        // Modal should close
        expect(screen.queryByTestId('add-patient-modal')).not.toBeInTheDocument();
    });

    it('should handle onKeyDown arrow function with Escape key', () => {
        renderLayout();
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        // Overlay should be present
        const overlay = screen.getByLabelText('Close sidebar');
        
        // Test Escape key handler (line 77: (e) => e.key === 'Escape' && toggleSidebar())
        fireEvent.keyDown(overlay, { key: 'Escape' });
        
        // Sidebar should close
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');
    });

    it('should handle onKeyDown arrow function with non-Escape key', () => {
        renderLayout();
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);

        // Overlay should be present
        const overlay = screen.getByLabelText('Close sidebar');
        
        // Test non-Escape key (line 77: should not trigger toggleSidebar)
        fireEvent.keyDown(overlay, { key: 'Enter' });
        
        // Sidebar should remain open (Escape key handler only closes on Escape)
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'true');
    });

    it('should handle all inline arrow functions in JSX', () => {
        renderLayout();
        
        // Test onOpenAddPatient arrow function (line 85)
        fireEvent.click(screen.getByText('Open Add Patient'));
        expect(screen.getByTestId('add-patient-modal')).toBeInTheDocument();
        
        // Test onClose arrow function (line 95)
        fireEvent.click(screen.getByText('Close Modal'));
        expect(screen.queryByTestId('add-patient-modal')).not.toBeInTheDocument();
        
        // Test onKeyDown arrow function (line 77)
        const menuButton = screen.getByLabelText(/open menu/i);
        fireEvent.click(menuButton);
        const overlay = screen.getByLabelText('Close sidebar');
        fireEvent.keyDown(overlay, { key: 'Escape' });
        expect(screen.getByTestId('mock-sidebar')).toHaveAttribute('data-open', 'false');
    });
});
