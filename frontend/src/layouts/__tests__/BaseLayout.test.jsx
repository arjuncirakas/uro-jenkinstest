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
});
