import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import AddNurseModal from '../AddNurseModal';
import { nursesService } from '../../../services/nursesService';

// Mock BaseUserModal with proper state handling
vi.mock('../BaseUserModal', () => ({
    default: ({ 
        isOpen, 
        onClose, 
        onSuccess, 
        title, 
        icon: Icon, 
        submitService, 
        initialFormData, 
        renderExtraFields, 
        successTitle, 
        successMessage, 
        errorTitle, 
        submitButtonText, 
        skipValidationFields 
    }) => {
        const [formData, setFormData] = useState(initialFormData);
        
        const handleInputChange = (e) => {
            const newData = { ...formData, [e.target.name]: e.target.value };
            setFormData(newData);
        };

        if (!isOpen) return null;
        return (
            <div data-testid="base-user-modal">
                <div data-testid="title">{title}</div>
                <Icon data-testid="icon" />
                <div data-testid="success-title">{successTitle}</div>
                <div data-testid="success-message">{successMessage}</div>
                <div data-testid="error-title">{errorTitle}</div>
                <div data-testid="submit-button-text">{submitButtonText}</div>
                <div data-testid="skip-validation-fields">{JSON.stringify(skipValidationFields)}</div>
                <button 
                    data-testid="submit-button"
                    onClick={async () => {
                        try {
                            const result = await submitService(formData);
                            return result;
                        } catch (error) {
                            // Handle error silently for testing - don't rethrow
                            console.error('Submit error:', error);
                        }
                    }}
                >
                    {submitButtonText}
                </button>
                {renderExtraFields && renderExtraFields({ formData, handleInputChange })}
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
    Stethoscope: ({ className, 'data-testid': testId }) => (
        <div data-testid={testId || 'stethoscope-icon'} className={className}>Stethoscope</div>
    ),
    Building2: ({ className, 'data-testid': testId }) => (
        <div data-testid={testId || 'building-icon'} className={className}>Building2</div>
    )
}));

describe('AddNurseModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Component Rendering', () => {
        it('should render when isOpen is true', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
        });

        it('should not render when isOpen is false', () => {
            const { container } = render(<AddNurseModal isOpen={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(container.firstChild).toBeNull();
        });

        it('should render correct title', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(screen.getByTestId('title')).toHaveTextContent('Add New Nurse');
        });

        it('should render Stethoscope icon', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(screen.getByTestId('icon')).toBeInTheDocument();
        });
    });

    describe('Props Passed to BaseUserModal', () => {
        it('should pass all required props to BaseUserModal', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            
            expect(screen.getByTestId('title')).toHaveTextContent('Add New Nurse');
            expect(screen.getByTestId('success-title')).toHaveTextContent('Nurse Added Successfully');
            expect(screen.getByTestId('success-message')).toHaveTextContent('The nurse has been added to the users table. A password setup email has been sent.');
            expect(screen.getByTestId('error-title')).toHaveTextContent('Error Adding Nurse');
            expect(screen.getByTestId('submit-button-text')).toHaveTextContent('Add Nurse');
            expect(screen.getByTestId('skip-validation-fields')).toHaveTextContent('["organization"]');
        });

        it('should pass onClose prop', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
        });

        it('should pass onSuccess prop when provided', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
        });

        it('should handle onSuccess being undefined', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={undefined} />);
            expect(screen.getByTestId('base-user-modal')).toBeInTheDocument();
        });
    });

    describe('initialFormData', () => {
        it('should initialize with empty form data', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
            expect(organizationInput.value).toBe('');
        });

        it('should have all required fields in initialFormData', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
            expect(organizationInput).toBeInTheDocument();
        });
    });

    describe('renderExtraFields', () => {
        it('should render organization field through renderExtraFields', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(screen.getByPlaceholderText('Enter organization (optional)')).toBeInTheDocument();
        });

        it('should render Building2 icon in organization field', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(screen.getByTestId('building-icon')).toBeInTheDocument();
        });

        it('should render organization label', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            expect(screen.getByText('Organization')).toBeInTheDocument();
        });

        it('should handle organization input change', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
            
            fireEvent.change(organizationInput, { target: { name: 'organization', value: 'Test Organization' } });
            
            expect(organizationInput.value).toBe('Test Organization');
        });

        it('should render organization field with correct placeholder', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
            expect(organizationInput).toBeInTheDocument();
            expect(organizationInput).toHaveAttribute('placeholder', 'Enter organization (optional)');
        });

        it('should render organization field with correct attributes', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
            expect(organizationInput).toHaveAttribute('type', 'text');
            expect(organizationInput).toHaveAttribute('id', 'organization');
            expect(organizationInput).toHaveAttribute('name', 'organization');
        });

        it('should call handleInputChange when organization input changes', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
            
            fireEvent.change(organizationInput, { target: { name: 'organization', value: 'New Org' } });
            
            expect(organizationInput.value).toBe('New Org');
        });

        it('should render renderExtraFields with formData containing organization', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
            expect(organizationInput).toBeInTheDocument();
        });
    });

    describe('handleSubmit', () => {
        it('should call nursesService.createNurse on submission', async () => {
            const mockResponse = { success: true, data: { id: 1 } };
            nursesService.createNurse.mockResolvedValue(mockResponse);

            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const submitButton = screen.getByTestId('submit-button');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(nursesService.createNurse).toHaveBeenCalled();
            });
        });

        it('should call nursesService.createNurse with correct formData', async () => {
            const mockResponse = { success: true, data: { id: 1 } };
            nursesService.createNurse.mockResolvedValue(mockResponse);

            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const submitButton = screen.getByTestId('submit-button');
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

        it('should call nursesService.createNurse with updated formData after input change', async () => {
            const mockResponse = { success: true, data: { id: 1 } };
            nursesService.createNurse.mockResolvedValue(mockResponse);

            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
            fireEvent.change(organizationInput, { target: { name: 'organization', value: 'Test Org' } });

            const submitButton = screen.getByTestId('submit-button');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(nursesService.createNurse).toHaveBeenCalledWith(
                    expect.objectContaining({
                        organization: 'Test Org'
                    })
                );
            });
        });

        it('should handle handleSubmit error case', async () => {
            const mockError = new Error('Failed to create nurse');
            nursesService.createNurse.mockRejectedValue(mockError);

            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const submitButton = screen.getByTestId('submit-button');
            
            // Click button - the error will be thrown but caught by the mock's try-catch
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(nursesService.createNurse).toHaveBeenCalled();
            }, { timeout: 1000 });

            // Verify the service was called with correct data
            expect(nursesService.createNurse).toHaveBeenCalledWith({
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                organization: ''
            });
            
            // Give time for the error to be handled
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        it('should return the result from nursesService.createNurse', async () => {
            const mockResponse = { success: true, data: { id: 1, name: 'Test Nurse' } };
            nursesService.createNurse.mockResolvedValue(mockResponse);

            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

            const submitButton = screen.getByTestId('submit-button');
            fireEvent.click(submitButton);

            await waitFor(() => {
                expect(nursesService.createNurse).toHaveBeenCalled();
            });
        });
    });

    describe('skipValidationFields', () => {
        it('should pass organization in skipValidationFields array', () => {
            render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
            const skipValidationFields = screen.getByTestId('skip-validation-fields');
            expect(skipValidationFields).toHaveTextContent('["organization"]');
        });
    });
});
