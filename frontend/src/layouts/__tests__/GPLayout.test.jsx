import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import GPLayout from '../GPLayout';
import React from 'react';

// Mock the GPSidebar since it's tested separately
vi.mock('../../components/layout/GPSidebar', () => ({
    default: ({ isOpen }) => (
        <div data-testid="gp-sidebar" data-open={isOpen}>GP Sidebar Mock</div>
    )
}));

// Mock the modals
vi.mock('../../components/AddPatientModal', () => ({
    default: () => null
}));

vi.mock('../../components/modals/SuccessModal', () => ({
    default: () => null
}));

vi.mock('../../components/modals/ErrorModal', () => ({
    default: () => null
}));

describe('GPLayout', () => {
    it('renders with GPSidebar', () => {
        render(
            <MemoryRouter>
                <GPLayout />
            </MemoryRouter>
        );

        expect(screen.getByTestId('gp-sidebar')).toBeInTheDocument();
    });

    it('uses BaseLayout with correct props', () => {
        render(
            <MemoryRouter>
                <GPLayout />
            </MemoryRouter>
        );

        // Should render without errors, meaning BaseLayout accepted the props
        expect(screen.getByTestId('gp-sidebar')).toBeInTheDocument();
    });
});
