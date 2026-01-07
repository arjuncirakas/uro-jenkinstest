import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileDropdown from '../ProfileDropdown';

// Hoist mocks
const mocks = vi.hoisted(() => ({
    getProfile: vi.fn()
}));

vi.mock('../../services/authService', () => ({
    default: {
        getProfile: mocks.getProfile
    }
}));

// Mock react-icons
vi.mock('react-icons/io5', () => ({
    IoPersonOutline: () => <span data-testid="person-icon" />,
    IoMailOutline: () => <span data-testid="mail-icon" />,
    IoCallOutline: () => <span data-testid="call-icon" />,
    IoClose: () => <span data-testid="close-icon" />
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
});
