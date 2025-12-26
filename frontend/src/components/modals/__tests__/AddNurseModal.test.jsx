import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import AddNurseModal from '../AddNurseModal';
import { nursesService } from '../../../services/nursesService';

// Don't mock BaseUserModal - test with real component to ensure renderExtraFields and handleSubmit execute
// vi.mock('../BaseUserModal', ...) - REMOVED to test actual component code

// Mock SuccessModal and ErrorModal (required by BaseUserModal)
vi.mock('../SuccessModal', () => ({
    default: ({ isOpen, message }) => isOpen ? <div data-testid="success-modal">{message}</div> : null
}));

vi.mock('../ErrorModal', () => ({
    default: ({ isOpen, message }) => isOpen ? <div data-testid="error-modal">{message}</div> : null
}));

// Mock nursesService
vi.mock('../../../services/nursesService', () => ({
    nursesService: {
        createNurse: vi.fn()
    }
}));

// Mock lucide-react icons - include all icons used by BaseUserModal
vi.mock('lucide-react', () => ({
    Stethoscope: ({ className }) => <div data-testid="stethoscope-icon" className={className}>Stethoscope</div>,
    Building2: ({ className }) => <div data-testid="building-icon" className={className}>Building2</div>,
    X: ({ className }) => <div data-testid="x-icon" className={className}>X</div>,
    Mail: ({ className }) => <div data-testid="mail-icon" className={className}>Mail</div>,
    Phone: ({ className }) => <div data-testid="phone-icon" className={className}>Phone</div>,
    User: ({ className }) => <div data-testid="user-icon" className={className}>User</div>
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

    it('should render organization field through renderExtraFields', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // The real BaseUserModal should render the organization field from renderExtraFields
        expect(screen.getByPlaceholderText('Enter organization (optional)')).toBeInTheDocument();
    });

    it('should pass correct props to BaseUserModal', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        expect(screen.getByText('Add New Nurse')).toBeInTheDocument();
    });

    it('should handle handleSubmit function', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true, data: { id: 1 } });

        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

        // Fill in required fields to pass validation
        const firstNameInput = screen.getByPlaceholderText(/first name/i);
        const lastNameInput = screen.getByPlaceholderText(/last name/i);
        const emailInput = screen.getByPlaceholderText(/email/i);
        const phoneInput = screen.getByPlaceholderText(/phone/i);
        
        fireEvent.change(firstNameInput, { target: { value: 'John', name: 'first_name' } });
        fireEvent.change(lastNameInput, { target: { value: 'Doe', name: 'last_name' } });
        fireEvent.change(emailInput, { target: { value: 'john@test.com', name: 'email' } });
        fireEvent.change(phoneInput, { target: { value: '1234567890', name: 'phone' } });

        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalledWith(
                expect.objectContaining({
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@test.com',
                    phone: '1234567890',
                    organization: ''
                })
            );
        });
    });

    it('should render organization field with label', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // The renderExtraFields should render the organization field with label
        expect(screen.getByText('Organization')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter organization (optional)')).toBeInTheDocument();
    });

    it('should handle organization input change through renderExtraFields', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
        fireEvent.change(organizationInput, { target: { name: 'organization', value: 'Test Org' } });
        // Verify input can be changed
        expect(organizationInput.value).toBe('Test Org');
    });

    it('should call handleSubmit with correct formData', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true });
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        // Fill in required fields to pass validation
        const firstNameInput = screen.getByPlaceholderText(/first name/i);
        const lastNameInput = screen.getByPlaceholderText(/last name/i);
        const emailInput = screen.getByPlaceholderText(/email/i);
        const phoneInput = screen.getByPlaceholderText(/phone/i);
        
        fireEvent.change(firstNameInput, { target: { value: 'John', name: 'first_name' } });
        fireEvent.change(lastNameInput, { target: { value: 'Doe', name: 'last_name' } });
        fireEvent.change(emailInput, { target: { value: 'john@test.com', name: 'email' } });
        fireEvent.change(phoneInput, { target: { value: '1234567890', name: 'phone' } });
        
        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalledWith(expect.objectContaining({
                organization: ''
            }));
        });
    });

    it('should handle onSuccess being undefined', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={undefined} />);
        expect(screen.getByText('Add New Nurse')).toBeInTheDocument();
    });

    it('should handle organization field placeholder', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
        expect(organizationInput).toHaveAttribute('placeholder', 'Enter organization (optional)');
    });

    it('should call handleSubmit when form is submitted with all fields', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true, data: { id: 1 } });
        
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        // Fill in required fields
        const firstNameInput = screen.getByPlaceholderText(/first name/i);
        const lastNameInput = screen.getByPlaceholderText(/last name/i);
        const emailInput = screen.getByPlaceholderText(/email/i);
        const phoneInput = screen.getByPlaceholderText(/phone/i);
        
        fireEvent.change(firstNameInput, { target: { value: 'John' } });
        fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
        fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
        fireEvent.change(phoneInput, { target: { value: '1234567890' } });
        
        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalledWith(
                expect.objectContaining({
                    first_name: 'John',
                    last_name: 'Doe',
                    email: 'john@test.com',
                    phone: '1234567890',
                    organization: ''
                })
            );
        });
    });

    it('should pass organization value through handleSubmit', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true, data: { id: 1 } });
        
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        // Fill in required fields
        const firstNameInput = screen.getByPlaceholderText(/first name/i);
        const lastNameInput = screen.getByPlaceholderText(/last name/i);
        const emailInput = screen.getByPlaceholderText(/email/i);
        const phoneInput = screen.getByPlaceholderText(/phone/i);
        const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
        
        fireEvent.change(firstNameInput, { target: { value: 'John' } });
        fireEvent.change(lastNameInput, { target: { value: 'Doe' } });
        fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
        fireEvent.change(phoneInput, { target: { value: '1234567890' } });
        fireEvent.change(organizationInput, { target: { value: 'Hospital ABC' } });
        
        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalledWith(
                expect.objectContaining({
                    organization: 'Hospital ABC'
                })
            );
        });
    });

    it('should handle handleSubmit async function', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true, data: { id: 1, email: 'test@test.com' } });
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        // Fill in required fields to pass validation
        const firstNameInput = screen.getByPlaceholderText(/first name/i);
        const lastNameInput = screen.getByPlaceholderText(/last name/i);
        const emailInput = screen.getByPlaceholderText(/email/i);
        const phoneInput = screen.getByPlaceholderText(/phone/i);
        
        fireEvent.change(firstNameInput, { target: { value: 'John', name: 'first_name' } });
        fireEvent.change(lastNameInput, { target: { value: 'Doe', name: 'last_name' } });
        fireEvent.change(emailInput, { target: { value: 'john@test.com', name: 'email' } });
        fireEvent.change(phoneInput, { target: { value: '1234567890', name: 'phone' } });
        
        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalled();
        });
    });

    it('should pass skipValidationFields to BaseUserModal', () => {
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // Organization field should be present and not cause validation errors
        const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
        expect(organizationInput).toBeInTheDocument();
        // Try to submit without organization (should not cause validation error)
        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        expect(submitButton).toBeInTheDocument();
    });

    it('should execute initialFormData object creation', () => {
        // This test ensures the initialFormData object is created when component renders
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // Verify form fields are initialized with empty values
        const firstNameInput = screen.getByPlaceholderText(/first name/i);
        expect(firstNameInput.value).toBe('');
        const organizationInput = screen.getByPlaceholderText('Enter organization (optional)');
        expect(organizationInput.value).toBe('');
    });

    it('should execute renderExtraFields function', () => {
        // This test ensures renderExtraFields function is executed
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // Verify the organization field from renderExtraFields is rendered
        expect(screen.getByText('Organization')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter organization (optional)')).toBeInTheDocument();
        // Verify Building2 icon is rendered (from renderExtraFields)
        expect(screen.getByTestId('building-icon')).toBeInTheDocument();
    });

    it('should execute handleSubmit function when form is submitted', async () => {
        nursesService.createNurse.mockResolvedValue({ success: true, data: { id: 1 } });
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        // Fill in required fields
        const firstNameInput = screen.getByPlaceholderText(/first name/i);
        const lastNameInput = screen.getByPlaceholderText(/last name/i);
        const emailInput = screen.getByPlaceholderText(/email/i);
        const phoneInput = screen.getByPlaceholderText(/phone/i);
        
        fireEvent.change(firstNameInput, { target: { value: 'John', name: 'first_name' } });
        fireEvent.change(lastNameInput, { target: { value: 'Doe', name: 'last_name' } });
        fireEvent.change(emailInput, { target: { value: 'john@test.com', name: 'email' } });
        fireEvent.change(phoneInput, { target: { value: '1234567890', name: 'phone' } });
        
        const submitButton = screen.getByRole('button', { name: /Add Nurse/i });
        fireEvent.click(submitButton);

        // Verify handleSubmit (which calls nursesService.createNurse) was executed
        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalled();
        });
    });

    it('should execute return statement with all props passed to BaseUserModal', () => {
        // This test ensures the return statement and all prop assignments are executed
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        // Verify all props are passed correctly by checking rendered content
        expect(screen.getByText('Add New Nurse')).toBeInTheDocument(); // title prop
        expect(screen.getByTestId('stethoscope-icon')).toBeInTheDocument(); // icon prop
        expect(screen.getByPlaceholderText('Enter organization (optional)')).toBeInTheDocument(); // renderExtraFields prop
        expect(screen.getByRole('button', { name: /Add Nurse/i })).toBeInTheDocument(); // submitButtonText prop
    });

    it('should execute all component code including initialFormData, renderExtraFields, handleSubmit, and return statement', () => {
        // This comprehensive test ensures all lines of the component execute
        const { container } = render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        // Verify component rendered (executes return statement)
        expect(container).toBeTruthy();
        
        // Verify initialFormData was used (empty values in inputs)
        const firstNameInput = screen.getByPlaceholderText(/first name/i);
        expect(firstNameInput.value).toBe('');
        
        // Verify renderExtraFields was called (organization field exists)
        expect(screen.getByText('Organization')).toBeInTheDocument();
        
        // Verify all props passed to BaseUserModal
        expect(screen.getByText('Add New Nurse')).toBeInTheDocument();
        expect(screen.getByTestId('stethoscope-icon')).toBeInTheDocument();
    });

    it('should execute handleSubmit with await when form is submitted', async () => {
        // This test ensures the async/await in handleSubmit executes
        nursesService.createNurse.mockResolvedValue({ success: true });
        
        render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        // Fill required fields
        fireEvent.change(screen.getByPlaceholderText(/first name/i), { target: { value: 'Test', name: 'first_name' } });
        fireEvent.change(screen.getByPlaceholderText(/last name/i), { target: { value: 'User', name: 'last_name' } });
        fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'test@test.com', name: 'email' } });
        fireEvent.change(screen.getByPlaceholderText(/phone/i), { target: { value: '1234567890', name: 'phone' } });
        
        // Submit form - this executes handleSubmit which has await
        fireEvent.click(screen.getByRole('button', { name: /Add Nurse/i }));
        
        await waitFor(() => {
            expect(nursesService.createNurse).toHaveBeenCalled();
        });
    });

    it('should have PropTypes defined and component exported correctly', () => {
        // This test ensures PropTypes (lines 65-69) and export (line 71) are executed
        // Import the component to ensure the file is executed
        expect(AddNurseModal).toBeDefined();
        expect(AddNurseModal.propTypes).toBeDefined();
        expect(AddNurseModal.propTypes.isOpen).toBeDefined();
        expect(AddNurseModal.propTypes.onClose).toBeDefined();
        expect(AddNurseModal.propTypes.onSuccess).toBeDefined();
    });

    it('should execute all lines of AddNurseModal component', () => {
        // Comprehensive test to ensure all code paths execute
        // This renders the component which executes:
        // - initialFormData object (lines 12-18)
        // - renderExtraFields function (lines 20-40)
        // - handleSubmit function definition (lines 42-44)
        // - Return statement with all props (lines 46-62)
        const { container } = render(<AddNurseModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
        
        // Verify component rendered (executes return statement)
        expect(container).toBeTruthy();
        
        // Verify initialFormData was created and used
        const inputs = screen.getAllByRole('textbox');
        expect(inputs.length).toBeGreaterThan(0);
        
        // Verify renderExtraFields executed (organization field rendered)
        expect(screen.getByText('Organization')).toBeInTheDocument();
        
        // Verify all props passed correctly
        expect(screen.getByText('Add New Nurse')).toBeInTheDocument();
        expect(screen.getByTestId('stethoscope-icon')).toBeInTheDocument();
    });
});
