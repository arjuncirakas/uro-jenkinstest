import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileDropdown from '../ProfileDropdown';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    getProfile: vi.fn(),
    getDPOContactInfo: vi.fn()
}));

vi.mock('../../services/authService', () => ({
    default: {
        getProfile: mocks.getProfile
    }
}));

vi.mock('../../services/securityDashboardService', () => ({
    securityDashboardService: {
        getDPOContactInfo: mocks.getDPOContactInfo
    }
}));

// Mock react-icons
vi.mock('react-icons/io5', () => ({
    IoPersonOutline: () => <span data-testid="person-icon" />,
    IoMailOutline: () => <span data-testid="mail-icon" />,
    IoCallOutline: () => <span data-testid="call-icon" />,
    IoClose: () => <span data-testid="close-icon" />,
    IoShieldOutline: () => <span data-testid="shield-icon" />
}));

describe('ProfileDropdown Component', () => {
    const mockOnClose = vi.fn();
    const mockButtonRef = { current: document.createElement('button') };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should not render when isOpen is false', () => {
            const { container } = render(
                <ProfileDropdown
                    isOpen={false}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should render when isOpen is true', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: { user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'admin' } }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('My Profile')).toBeInTheDocument();
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading state while fetching profile', async () => {
            mocks.getProfile.mockImplementation(() => new Promise(() => { }));

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        it('should show error state when profile fetch fails', async () => {
            mocks.getProfile.mockResolvedValue({
                success: false
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
            });
        });

        it('should show error when API throws exception', async () => {
            mocks.getProfile.mockRejectedValue(new Error('Network error'));

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Network error')).toBeInTheDocument();
            });
        });

        it('should allow retry after error', async () => {
            mocks.getProfile.mockResolvedValueOnce({
                success: false
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Try Again')).toBeInTheDocument();
            });

            mocks.getProfile.mockResolvedValueOnce({
                success: true,
                data: { user: { firstName: 'John', lastName: 'Doe', email: 'john@test.com', role: 'admin' } }
            });

            fireEvent.click(screen.getByText('Try Again'));

            await waitFor(() => {
                expect(screen.getByText('John Doe')).toBeInTheDocument();
            });
        });
    });

    describe('Profile Display', () => {
        it('should display user name and initials', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: {
                    user: {
                        firstName: 'Jane',
                        lastName: 'Smith',
                        email: 'jane@test.com',
                        role: 'urologist'
                    }
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Jane Smith')).toBeInTheDocument();
                expect(screen.getByText('JS')).toBeInTheDocument();
            });
        });

        it('should handle snake_case field names', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: {
                    user: {
                        first_name: 'Mary',
                        last_name: 'Johnson',
                        email: 'mary@test.com',
                        role: 'gp'
                    }
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Mary Johnson')).toBeInTheDocument();
                expect(screen.getByText('MJ')).toBeInTheDocument();
            });
        });

        it('should display role with proper formatting', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: {
                    user: {
                        firstName: 'Test',
                        lastName: 'User',
                        email: 'test@test.com',
                        role: 'urology_nurse'
                    }
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Urology Nurse')).toBeInTheDocument();
            });
        });

        it('should display organization if available', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: {
                    user: {
                        firstName: 'Test',
                        lastName: 'User',
                        email: 'test@test.com',
                        role: 'admin',
                        organization: 'Test Hospital'
                    }
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Test Hospital')).toBeInTheDocument();
            });
        });

        it('should display phone if available', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: {
                    user: {
                        firstName: 'Test',
                        lastName: 'User',
                        email: 'test@test.com',
                        role: 'admin',
                        phone: '+1234567890'
                    }
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('+1234567890')).toBeInTheDocument();
            });
        });

        it('should handle missing name gracefully', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: {
                    user: {
                        email: 'test@test.com',
                        role: 'admin'
                    }
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('User')).toBeInTheDocument();
                expect(screen.getByText('U')).toBeInTheDocument();
            });
        });
    });

    describe('Role Display Names', () => {
        const testRoles = [
            { role: 'urologist', display: 'Urologist' },
            { role: 'doctor', display: 'Doctor' },
            { role: 'gp', display: 'General Practitioner' },
            { role: 'superadmin', display: 'Super Admin' },
            { role: 'department_admin', display: 'Department Admin' },
            { role: 'unknown_role', display: 'unknown_role' }
        ];

        testRoles.forEach(({ role, display }) => {
            it(`should display "${display}" for role "${role}"`, async () => {
                mocks.getProfile.mockResolvedValue({
                    success: true,
                    data: {
                        user: {
                            firstName: 'Test',
                            lastName: 'User',
                            email: 'test@test.com',
                            role
                        }
                    }
                });

                render(
                    <ProfileDropdown
                        isOpen={true}
                        onClose={mockOnClose}
                        buttonRef={mockButtonRef}
                    />
                );

                await waitFor(() => {
                    expect(screen.getByText(display)).toBeInTheDocument();
                });
            });
        });
    });

    describe('Close Functionality', () => {
        it('should call onClose when close button is clicked', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: { user: { firstName: 'Test', lastName: 'User', email: 'test@test.com', role: 'admin' } }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('My Profile')).toBeInTheDocument();
            });

            const closeButton = screen.getByLabelText('Close');
            fireEvent.click(closeButton);

            expect(mockOnClose).toHaveBeenCalledTimes(1);
        });

        it('should close when clicking outside', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: { user: { firstName: 'Test', lastName: 'User', email: 'test@test.com', role: 'admin' } }
            });

            render(
                <div>
                    <div data-testid="outside">Outside</div>
                    <ProfileDropdown
                        isOpen={true}
                        onClose={mockOnClose}
                        buttonRef={mockButtonRef}
                    />
                </div>
            );

            await waitFor(() => {
                expect(screen.getByText('My Profile')).toBeInTheDocument();
            });

            fireEvent.mouseDown(screen.getByTestId('outside'));

            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should reset state when modal closes', async () => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: { user: { firstName: 'Test', lastName: 'User', email: 'test@test.com', role: 'admin' } }
            });

            const { rerender } = render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Test User')).toBeInTheDocument();
            });

            rerender(
                <ProfileDropdown
                    isOpen={false}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
        });
    });

    describe('DPO Contact Information Display', () => {
        beforeEach(() => {
            mocks.getProfile.mockResolvedValue({
                success: true,
                data: {
                    user: {
                        firstName: 'Test',
                        lastName: 'User',
                        email: 'test@test.com',
                        role: 'urologist'
                    }
                }
            });
        });

        it('should display DPO contact information when available', async () => {
            mocks.getDPOContactInfo.mockResolvedValue({
                success: true,
                data: {
                    name: 'John DPO',
                    email: 'dpo@example.com',
                    contact_number: '+1234567890'
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Data Protection Officer')).toBeInTheDocument();
                expect(screen.getByText('John DPO')).toBeInTheDocument();
                expect(screen.getByText('dpo@example.com')).toBeInTheDocument();
                expect(screen.getByText('+1234567890')).toBeInTheDocument();
            });
        });

        it('should not display DPO section when DPO info is not available', async () => {
            mocks.getDPOContactInfo.mockResolvedValue({
                success: true,
                data: null
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Test User')).toBeInTheDocument();
            });

            expect(screen.queryByText('Data Protection Officer')).not.toBeInTheDocument();
        });

        it('should not display DPO section when DPO fetch fails', async () => {
            mocks.getDPOContactInfo.mockRejectedValue(new Error('Network error'));

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Test User')).toBeInTheDocument();
            });

            // DPO section should not be displayed on error
            expect(screen.queryByText('Data Protection Officer')).not.toBeInTheDocument();
        });

        it('should not display DPO section when DPO fetch returns success false', async () => {
            mocks.getDPOContactInfo.mockResolvedValue({
                success: false,
                error: 'Failed to fetch'
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Test User')).toBeInTheDocument();
            });

            expect(screen.queryByText('Data Protection Officer')).not.toBeInTheDocument();
        });

        it('should fetch DPO info when modal opens', async () => {
            mocks.getDPOContactInfo.mockResolvedValue({
                success: true,
                data: {
                    name: 'Jane DPO',
                    email: 'jane.dpo@example.com',
                    contact_number: '+9876543210'
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(mocks.getDPOContactInfo).toHaveBeenCalled();
            });
        });

        it('should reset DPO info when modal closes', async () => {
            mocks.getDPOContactInfo.mockResolvedValue({
                success: true,
                data: {
                    name: 'John DPO',
                    email: 'dpo@example.com',
                    contact_number: '+1234567890'
                }
            });

            const { rerender } = render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('John DPO')).toBeInTheDocument();
            });

            rerender(
                <ProfileDropdown
                    isOpen={false}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            // When modal reopens, DPO info should be fetched again
            rerender(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(mocks.getDPOContactInfo).toHaveBeenCalledTimes(2);
            });
        });

        it('should display DPO information with proper formatting', async () => {
            mocks.getDPOContactInfo.mockResolvedValue({
                success: true,
                data: {
                    name: 'Dr. Sarah DPO',
                    email: 'sarah.dpo@healthcare.com',
                    contact_number: '+44 20 7946 0958'
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Dr. Sarah DPO')).toBeInTheDocument();
                expect(screen.getByText('sarah.dpo@healthcare.com')).toBeInTheDocument();
                expect(screen.getByText('+44 20 7946 0958')).toBeInTheDocument();
            });
        });

        it('should handle empty DPO data gracefully', async () => {
            mocks.getDPOContactInfo.mockResolvedValue({
                success: true,
                data: {
                    name: '',
                    email: '',
                    contact_number: ''
                }
            });

            render(
                <ProfileDropdown
                    isOpen={true}
                    onClose={mockOnClose}
                    buttonRef={mockButtonRef}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Test User')).toBeInTheDocument();
            });

            // Should not crash with empty data
            expect(screen.queryByText('Data Protection Officer')).not.toBeInTheDocument();
        });
    });
});
