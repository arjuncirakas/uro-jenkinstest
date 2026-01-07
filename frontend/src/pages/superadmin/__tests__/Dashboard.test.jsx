import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock modals
const mockAddNurseModal = vi.fn();
const mockAddGPModal = vi.fn();
const mockAddUrologistModal = vi.fn();

vi.mock('../../../components/modals/AddNurseModal', () => ({
    default: ({ isOpen, onClose, onSuccess }) => (
        isOpen ? (
            <div data-testid="add-nurse-modal">
                <button onClick={onClose}>Close</button>
                <button onClick={onSuccess}>Success</button>
            </div>
        ) : null
    )
}));

vi.mock('../../../components/modals/AddGPModal', () => ({
    default: ({ isOpen, onClose, onSuccess }) => (
        isOpen ? (
            <div data-testid="add-gp-modal">
                <button onClick={onClose}>Close</button>
                <button onClick={onSuccess}>Success</button>
            </div>
        ) : null
    )
}));

vi.mock('../../../components/modals/AddUrologistModal', () => ({
    default: ({ isOpen, onClose, onSuccess }) => (
        isOpen ? (
            <div data-testid="add-urologist-modal">
                <button onClick={onClose}>Close</button>
                <button onClick={onSuccess}>Success</button>
            </div>
        ) : null
    )
}));

import Dashboard from '../Dashboard';

describe('Superadmin Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the dashboard', () => {
            render(<Dashboard />);
            expect(screen.getByText('Superadmin Dashboard')).toBeInTheDocument();
        });

        it('should render header with title and description', () => {
            render(<Dashboard />);
            expect(screen.getByText('Superadmin Dashboard')).toBeInTheDocument();
            expect(screen.getByText(/Add new medical professionals to the system/i)).toBeInTheDocument();
        });

        it('should render three action buttons', () => {
            render(<Dashboard />);
            expect(screen.getByText('Nurses')).toBeInTheDocument();
            expect(screen.getByText("GP's")).toBeInTheDocument();
            expect(screen.getByText('Urologists')).toBeInTheDocument();
        });

        it('should render button descriptions', () => {
            render(<Dashboard />);
            expect(screen.getByText(/Add a new nurse to the users table/i)).toBeInTheDocument();
            expect(screen.getByText(/Add a new General Practitioner to the users table/i)).toBeInTheDocument();
            expect(screen.getByText(/Add a new urologist to the doctors table/i)).toBeInTheDocument();
        });
    });

    describe('Nurse Modal', () => {
        it('should open nurse modal when Nurses button is clicked', () => {
            render(<Dashboard />);
            const nurseButton = screen.getByText('Nurses').closest('button');
            fireEvent.click(nurseButton);
            expect(screen.getByTestId('add-nurse-modal')).toBeInTheDocument();
        });

        it('should close nurse modal when close button is clicked', () => {
            render(<Dashboard />);
            const nurseButton = screen.getByText('Nurses').closest('button');
            fireEvent.click(nurseButton);
            
            const closeButton = screen.getByText('Close');
            fireEvent.click(closeButton);
            
            expect(screen.queryByTestId('add-nurse-modal')).not.toBeInTheDocument();
        });

        it('should close nurse modal on success', () => {
            render(<Dashboard />);
            const nurseButton = screen.getByText('Nurses').closest('button');
            fireEvent.click(nurseButton);
            
            const successButton = screen.getAllByText('Success')[0];
            fireEvent.click(successButton);
            
            expect(screen.queryByTestId('add-nurse-modal')).not.toBeInTheDocument();
        });

        it('should not show nurse modal initially', () => {
            render(<Dashboard />);
            expect(screen.queryByTestId('add-nurse-modal')).not.toBeInTheDocument();
        });
    });

    describe('GP Modal', () => {
        it('should open GP modal when GP button is clicked', () => {
            render(<Dashboard />);
            const gpButton = screen.getByText("GP's").closest('button');
            fireEvent.click(gpButton);
            expect(screen.getByTestId('add-gp-modal')).toBeInTheDocument();
        });

        it('should close GP modal when close button is clicked', () => {
            render(<Dashboard />);
            const gpButton = screen.getByText("GP's").closest('button');
            fireEvent.click(gpButton);
            
            const closeButtons = screen.getAllByText('Close');
            const gpModalClose = closeButtons.find(btn => 
                btn.closest('[data-testid="add-gp-modal"]')
            );
            fireEvent.click(gpModalClose);
            
            expect(screen.queryByTestId('add-gp-modal')).not.toBeInTheDocument();
        });

        it('should close GP modal on success', () => {
            render(<Dashboard />);
            const gpButton = screen.getByText("GP's").closest('button');
            fireEvent.click(gpButton);
            
            const successButtons = screen.getAllByText('Success');
            const gpSuccess = successButtons.find(btn => 
                btn.closest('[data-testid="add-gp-modal"]')
            );
            fireEvent.click(gpSuccess);
            
            expect(screen.queryByTestId('add-gp-modal')).not.toBeInTheDocument();
        });

        it('should not show GP modal initially', () => {
            render(<Dashboard />);
            expect(screen.queryByTestId('add-gp-modal')).not.toBeInTheDocument();
        });
    });

    describe('Urologist Modal', () => {
        it('should open urologist modal when Urologists button is clicked', () => {
            render(<Dashboard />);
            const urologistButton = screen.getByText('Urologists').closest('button');
            fireEvent.click(urologistButton);
            expect(screen.getByTestId('add-urologist-modal')).toBeInTheDocument();
        });

        it('should close urologist modal when close button is clicked', () => {
            render(<Dashboard />);
            const urologistButton = screen.getByText('Urologists').closest('button');
            fireEvent.click(urologistButton);
            
            const closeButtons = screen.getAllByText('Close');
            const urologistModalClose = closeButtons.find(btn => 
                btn.closest('[data-testid="add-urologist-modal"]')
            );
            fireEvent.click(urologistModalClose);
            
            expect(screen.queryByTestId('add-urologist-modal')).not.toBeInTheDocument();
        });

        it('should close urologist modal on success', () => {
            render(<Dashboard />);
            const urologistButton = screen.getByText('Urologists').closest('button');
            fireEvent.click(urologistButton);
            
            const successButtons = screen.getAllByText('Success');
            const urologistSuccess = successButtons.find(btn => 
                btn.closest('[data-testid="add-urologist-modal"]')
            );
            fireEvent.click(urologistSuccess);
            
            expect(screen.queryByTestId('add-urologist-modal')).not.toBeInTheDocument();
        });

        it('should not show urologist modal initially', () => {
            render(<Dashboard />);
            expect(screen.queryByTestId('add-urologist-modal')).not.toBeInTheDocument();
        });
    });

    describe('Multiple Modals', () => {
        it('should allow opening and closing different modals independently', () => {
            render(<Dashboard />);
            
            // Open nurse modal
            const nurseButton = screen.getByText('Nurses').closest('button');
            fireEvent.click(nurseButton);
            expect(screen.getByTestId('add-nurse-modal')).toBeInTheDocument();
            
            // Close nurse modal
            const closeButtons = screen.getAllByText('Close');
            fireEvent.click(closeButtons[0]);
            expect(screen.queryByTestId('add-nurse-modal')).not.toBeInTheDocument();
            
            // Open GP modal
            const gpButton = screen.getByText("GP's").closest('button');
            fireEvent.click(gpButton);
            expect(screen.getByTestId('add-gp-modal')).toBeInTheDocument();
        });

        it('should handle opening one modal after another', () => {
            render(<Dashboard />);
            
            // Open nurse modal
            const nurseButton = screen.getByText('Nurses').closest('button');
            fireEvent.click(nurseButton);
            expect(screen.getByTestId('add-nurse-modal')).toBeInTheDocument();
            
            // Open GP modal (nurse modal should close)
            const gpButton = screen.getByText("GP's").closest('button');
            fireEvent.click(gpButton);
            expect(screen.getByTestId('add-gp-modal')).toBeInTheDocument();
        });
    });

    describe('Button Interactions', () => {
        it('should have clickable buttons', () => {
            render(<Dashboard />);
            const buttons = screen.getAllByRole('button');
            const actionButtons = buttons.filter(btn => 
                btn.textContent?.includes('Nurses') || 
                btn.textContent?.includes("GP's") || 
                btn.textContent?.includes('Urologists')
            );
            expect(actionButtons.length).toBe(3);
            actionButtons.forEach(button => {
                expect(button).not.toBeDisabled();
            });
        });

        it('should have proper button structure with icons and text', () => {
            render(<Dashboard />);
            const nurseButton = screen.getByText('Nurses').closest('button');
            expect(nurseButton).toBeInTheDocument();
            expect(nurseButton.querySelector('svg')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<Dashboard />);
            const heading = screen.getByRole('heading', { name: /Superadmin Dashboard/i });
            expect(heading).toBeInTheDocument();
        });

        it('should have descriptive text for each button', () => {
            render(<Dashboard />);
            expect(screen.getByText(/Add a new nurse to the users table/i)).toBeInTheDocument();
            expect(screen.getByText(/Add a new General Practitioner to the users table/i)).toBeInTheDocument();
            expect(screen.getByText(/Add a new urologist to the doctors table/i)).toBeInTheDocument();
        });
    });

    describe('State Management', () => {
        it('should maintain modal state correctly', () => {
            render(<Dashboard />);
            
            // Initially no modals open
            expect(screen.queryByTestId('add-nurse-modal')).not.toBeInTheDocument();
            expect(screen.queryByTestId('add-gp-modal')).not.toBeInTheDocument();
            expect(screen.queryByTestId('add-urologist-modal')).not.toBeInTheDocument();
            
            // Open nurse modal
            const nurseButton = screen.getByText('Nurses').closest('button');
            fireEvent.click(nurseButton);
            expect(screen.getByTestId('add-nurse-modal')).toBeInTheDocument();
            
            // Close nurse modal
            const closeButton = screen.getByText('Close');
            fireEvent.click(closeButton);
            expect(screen.queryByTestId('add-nurse-modal')).not.toBeInTheDocument();
        });

        it('should handle success callbacks correctly', () => {
            render(<Dashboard />);
            
            // Open nurse modal and trigger success
            const nurseButton = screen.getByText('Nurses').closest('button');
            fireEvent.click(nurseButton);
            
            const successButtons = screen.getAllByText('Success');
            fireEvent.click(successButtons[0]);
            
            // Modal should close
            expect(screen.queryByTestId('add-nurse-modal')).not.toBeInTheDocument();
        });
    });
});

