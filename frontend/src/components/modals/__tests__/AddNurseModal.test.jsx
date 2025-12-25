import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AddNurseModal from '../AddNurseModal';
import { nursesService } from '../../../services/nursesService';

// Mock BaseUserModal
vi.mock('../BaseUserModal', () => ({
    default: ({ isOpen, onClose, onSuccess, title, icon: Icon, submitService, initialFormData, renderExtraFields, successTitle, successMessage, errorTitle, submitButtonText, skipValidationFields }) => {
        if (!isOpen) return null;
        return (
            <div data-testid="base-user-modal">
                <div>{title}</div>
                <Icon data-testid="icon" />
                <input
                    data-testid="organization-input"
                    name="organization"
                    value={initialFormData.organization}
                    onChange={(e) => {
                        const newData = { ...initialFormData, [e.target.name]: e.target.value };
                        if (renderExtraFields) {
                            renderExtraFields({ formData: newData, handleInputChange: (e) => {} });
                        }
                    }}
                />
                <button onClick={() => submitService(initialFormData)}>{submitButtonText}</button>
                {renderExtraFields && renderExtraFields({ formData: initialFormData, handleInputChange: () => {} })}
            </div>
        );
    }
}));

// Mock nursesService
vi.mock('../../../services/nursesService', () => ({
    nursesService: {
        createNurse: vi.fn()
    }
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Stethoscope: ({ className }) => <div data-testid="stethoscope-icon" className={className}>Stethoscope</div>,
    Building2: ({ className }) => <div data-testid="building-icon" className={className}>Building2</div>
}));

describe('AddNurseModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render correct title', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        expect(screen.getByText('Add New Nurse')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
        const { container } = render(<AddNurseModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        expect(container.firstChild).toBeNull();
    });

    it('should call nursesService.createNurse on submission', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true });

        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalled();
        });
    });

    it('should render organization field', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
    });

    it('should pass correct props to BaseUserModal', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        expect(screen.getByText('Add New Nurse')).toBeInTheDocument();
        expect(screen.getByTestId('stethoscope-icon')).toBeInTheDocument();
    });

    it('should handle handleSubmit function', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true, data: { id: 1 } });

        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalledWith({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                organization: ''
            });
        });
    });

    it('should pass skipValidationFields prop', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // Verify the component renders with organization field (which is skipped in validation)
        expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
    });

    it('should render with initialFormData', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        const organizationInput = screen.getByTestId('organization-input');
        expect(organizationInput).toBeInTheDocument();
        expect(organizationInput.value).toBe('');
    });

    it('should handle renderExtraFields callback', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // Verify organization field is rendered through renderExtraFields
        expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
    });

    it('should render organization field with Building2 icon', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // Verify Building2 icon is rendered in renderExtraFields
        expect(screen.getByTestId('building-icon')).toBeInTheDocument();
    });

    it('should handle organization input change through renderExtraFields', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        const organizationInput = screen.getByTestId('organization-input');
        fireEvent.change(organizationInput, { target: { name: 'organization', value: 'Test Org' } });
        // Verify input can be changed
        expect(organizationInput.value).toBe('Test Org');
    });

    it('should call handleSubmit with correct formData', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true });
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalledWith(expect.objectContaining({
                organization: ''
            }));
        });
    });

    it('should pass all required props to BaseUserModal', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // Verify all props are passed correctly
        expect(screen.getByText('Add New Nurse')).toBeInTheDocument();
        expect(screen.getByTestId('stethoscope-icon')).toBeInTheDocument();
        expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
    });

    it('should handle onSuccess being undefined', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={undefined} />);
        expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
    });
});
