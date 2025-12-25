import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import BaseLayout from '../BaseLayout';
import React from 'react';

// Create mock components for testing
const MockAddPatientModal = vi.fn(({ isOpen, onClose, onPatientAdded, onError }) => {
    if (!isOpen) return null;
    return (
        <div data-testid="add-patient-modal">
            <button onClick={() => onPatientAdded({ firstName: 'John', lastName: 'Doe', upi: 'UPI123', phone: '123', email: 'test@test.com' })}>
                Add Patient
            </button>
            <button onClick={() => onError({ title: 'Error', message: 'Failed', errors: [] })}>
                Trigger Error
            </button>
            <button onClick={onClose}>Close Modal</button>
        </div>
    );
});

const MockSuccessModal = vi.fn(({ isOpen, onClose, title }) => {
    if (!isOpen) return null;
    return (
        <div data-testid="success-modal">
            <span>{title}</span>
            <button onClick={onClose}>Close Success</button>
        </div>
    );
});

const MockErrorModal = vi.fn(({ isOpen, onClose, title }) => {
    if (!isOpen) return null;
    return (
        <div data-testid="error-modal">
            <span>{title}</span>
            <button onClick={onClose}>Close Error</button>
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
        expect(MockSuccessModal).toHaveBeenCalledWith(
            expect.objectContaining({
                details: expect.objectContaining({
                    name: 'John Doe',
                    upi: 'UPI123',
                    phone: '123',
                    email: 'test@test.com'
                })
            }),
            expect.any(Object)
        );
    });

    it('clears success details when modal closes', () => {
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Patient'));
        fireEvent.click(screen.getByText('Close Success'));

        // Success details should be cleared
        expect(MockSuccessModal).toHaveBeenCalledWith(
            expect.objectContaining({
                details: null
            }),
            expect.any(Object)
        );
    });

    it('sets error details correctly', () => {
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));

        expect(MockErrorModal).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Error',
                message: 'Failed',
                errors: []
            }),
            expect.any(Object)
        );
    });

    it('handles error details with default values', async () => {
        const errorModalModule = await import('../../components/modals/ErrorModal');
        const MockErrorModalWithDefaults = vi.fn(({ isOpen, onClose, title, message, errors }) => {
            if (!isOpen) return null;
            return (
                <div data-testid="error-modal">
                    <span>{title}</span>
                    <span>{message}</span>
                    <span>{errors?.length || 0}</span>
                    <button onClick={onClose}>Close Error</button>
                </div>
            );
        });

        vi.mocked(errorModalModule.default).mockImplementation(MockErrorModalWithDefaults);

        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));

        // Should use default values if errorDetails is incomplete
        expect(MockErrorModalWithDefaults).toHaveBeenCalled();
    });

    it('clears error details when modal closes', () => {
        renderLayout();

        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Trigger Error'));
        fireEvent.click(screen.getByText('Close Error'));

        // Error details should be cleared
        expect(MockErrorModal).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Error',
                message: 'An error occurred',
                errors: []
            }),
            expect.any(Object)
        );
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

        expect(MockAddPatientModal).toHaveBeenCalledWith(
            expect.objectContaining({
                isUrologist: true
            }),
            expect.any(Object)
        );
    });

    it('passes isUrologist false by default', () => {
        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));

        expect(MockAddPatientModal).toHaveBeenCalledWith(
            expect.objectContaining({
                isUrologist: false
            }),
            expect.any(Object)
        );
    });

    it('handles patient with missing fields', async () => {
        const addPatientModalModule = await import('../../components/AddPatientModal');
        const MockAddPatientModalPartial = vi.fn(({ isOpen, onPatientAdded }) => {
            if (!isOpen) return null;
            return (
                <div>
                    <button onClick={() => onPatientAdded({ firstName: 'John' })}>Add Partial</button>
                </div>
            );
        });

        vi.mocked(addPatientModalModule.default).mockImplementation(MockAddPatientModalPartial);

        renderLayout();
        fireEvent.click(screen.getByText('Open Add Patient'));
        fireEvent.click(screen.getByText('Add Partial'));

        // Should handle missing fields gracefully
        expect(screen.getByTestId('success-modal')).toBeInTheDocument();
    });
});
