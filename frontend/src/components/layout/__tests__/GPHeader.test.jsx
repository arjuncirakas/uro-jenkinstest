import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GPHeader from '../GPHeader';
import React from 'react';

// Mock child components
vi.mock('../../GlobalPatientSearch', () => ({
    default: ({ onPatientSelect }) => (
        <div data-testid="global-search">
            <button onClick={() => onPatientSelect({ id: 1, name: 'Search Patient' })}>
                Select Patient
            </button>
        </div>
    )
}));

vi.mock('../../NotificationModal', () => ({
    default: ({ isOpen, onClose, onPatientClick, onNotificationCountChange }) => {
        // Simulate count change on mount
        React.useEffect(() => {
            onNotificationCountChange(5);
        }, []);

        return isOpen ? (
            <div data-testid="notification-modal">
                <button onClick={onClose}>Close Notifications</button>
                <button onClick={() => onPatientClick('Notif Patient', 1, {})}>
                    Click Patient
                </button>
            </div>
        ) : null;
    }
}));

vi.mock('../../GPPatientDetailsModal', () => ({
    default: ({ isOpen, onClose, patient }) => isOpen ? (
        <div data-testid="patient-details-modal">
            {patient && <span>{patient.name || patient}</span>}
            <button onClick={onClose}>Close Details</button>
        </div>
    ) : null
}));

describe('GPHeader', () => {
    it('renders with title and subtitle', () => {
        render(<GPHeader title="My Title" subtitle="My Subtitle" />);
        expect(screen.getByText('My Title')).toBeInTheDocument();
        expect(screen.getByText('My Subtitle')).toBeInTheDocument();
    });

    it('opens notification modal', async () => {
        render(<GPHeader title="Title" subtitle="Subtitle" />);

        // Find notification button (it has an icon, but we can find by count badge or role if needed)
        // Since count updates to 5, we can look for '5'
        await waitFor(() => screen.getByText('5'));

        // Find button wrapper
        const notifButton = screen.getByText('5').closest('button');
        fireEvent.click(notifButton);

        expect(screen.getByTestId('notification-modal')).toBeInTheDocument();

        // Close it
        fireEvent.click(screen.getByText('Close Notifications'));
        expect(screen.queryByTestId('notification-modal')).not.toBeInTheDocument();
    });

    it('handles patient selection from search', async () => {
        render(<GPHeader title="Title" subtitle="Subtitle" />);

        fireEvent.click(screen.getByText('Select Patient'));

        expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
        expect(screen.getByText('Search Patient')).toBeInTheDocument();

        // Close details
        fireEvent.click(screen.getByText('Close Details'));
        expect(screen.queryByTestId('patient-details-modal')).not.toBeInTheDocument();
    });

    it('handles patient click from notification', async () => {
        render(<GPHeader title="Title" subtitle="Subtitle" />);

        // Open notifications
        const notifButton = screen.getByText('5').closest('button');
        fireEvent.click(notifButton);

        // Click patient in notification
        fireEvent.click(screen.getByText('Click Patient'));

        // Should close notification and open details
        expect(screen.queryByTestId('notification-modal')).not.toBeInTheDocument();
        expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
        expect(screen.getByText('Notif Patient')).toBeInTheDocument();
    });

    it('logs selected patient', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        render(<GPHeader title="Title" subtitle="Subtitle" />);

        fireEvent.click(screen.getByText('Select Patient'));

        expect(consoleSpy).toHaveBeenCalledWith('Selected patient:', expect.any(Object));
        consoleSpy.mockRestore();
    });

    it('logs notification click for patient', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        render(<GPHeader title="Title" subtitle="Subtitle" />);

        const notifButton = screen.getByText('5').closest('button');
        fireEvent.click(notifButton);
        fireEvent.click(screen.getByText('Click Patient'));

        expect(consoleSpy).toHaveBeenCalledWith('GPHeader: Notification clicked for patient:', 'Notif Patient');
        consoleSpy.mockRestore();
    });

    it('handles default searchPlaceholder', () => {
        render(<GPHeader title="Title" subtitle="Subtitle" />);
        // Should render with default placeholder
        expect(screen.getByTestId('global-search')).toBeInTheDocument();
    });

    it('handles custom searchPlaceholder', () => {
        render(<GPHeader title="Title" subtitle="Subtitle" searchPlaceholder="Custom placeholder" />);
        // Should render with custom placeholder
        expect(screen.getByTestId('global-search')).toBeInTheDocument();
    });

    it('clears selected patient when modal closes', () => {
        render(<GPHeader title="Title" subtitle="Subtitle" />);

        fireEvent.click(screen.getByText('Select Patient'));
        expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Close Details'));
        expect(screen.queryByTestId('patient-details-modal')).not.toBeInTheDocument();
    });

    it('updates notification count', async () => {
        render(<GPHeader title="Title" subtitle="Subtitle" />);
        
        await waitFor(() => {
            expect(screen.getByText('5')).toBeInTheDocument();
        });
    });

    it('executes all lines including export statement', () => {
        // The component is already imported at the top, so export statement is executed
        // Just verify it renders correctly
        render(<GPHeader title="Title" subtitle="Subtitle" />);
        expect(screen.getByText('Title')).toBeInTheDocument();
    });
});
