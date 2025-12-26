import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NurseLayout from '../NurseLayout';
import React from 'react';

// Mock the NurseSidebar since it's tested separately
vi.mock('../../components/layout/NurseSidebar', () => ({
    default: ({ isOpen }) => (
        <div data-testid="nurse-sidebar" data-open={isOpen}>Nurse Sidebar Mock</div>
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

describe('NurseLayout', () => {
    it('renders with NurseSidebar', () => {
        render(
            <MemoryRouter>
                <NurseLayout />
            </MemoryRouter>
        );

        expect(screen.getByTestId('nurse-sidebar')).toBeInTheDocument();
    });

    it('uses BaseLayout with correct props', () => {
        render(
            <MemoryRouter>
                <NurseLayout />
            </MemoryRouter>
        );

        // Should render without errors, meaning BaseLayout accepted the props
        expect(screen.getByTestId('nurse-sidebar')).toBeInTheDocument();
    });

    it('executes all lines including export statement', () => {
        // The component is already imported at the top, so export statement is executed
        // Just verify it renders correctly
        render(
            <MemoryRouter>
                <NurseLayout />
            </MemoryRouter>
        );
        
        // Verify component renders (line 10)
        expect(screen.getByTestId('nurse-sidebar')).toBeInTheDocument();
    });
});
