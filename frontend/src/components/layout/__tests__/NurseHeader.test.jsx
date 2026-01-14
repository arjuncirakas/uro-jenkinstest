import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NurseHeader from '../NurseHeader';

// Mock dependencies
vi.mock('../NotificationModal', () => ({
  default: ({ isOpen, onClose, onNotificationCountChange }) => (
    isOpen ? (
      <div data-testid="notification-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

vi.mock('../ProfileDropdown', () => ({
  default: ({ isOpen, onClose, buttonRef }) => (
    isOpen ? <div data-testid="profile-dropdown">Profile</div> : null
  )
}));

vi.mock('../GlobalPatientSearch', () => ({
  default: ({ placeholder, onPatientSelect }) => (
    <div data-testid="global-patient-search">
      <input placeholder={placeholder} />
      <button onClick={() => onPatientSelect({ id: 1, name: 'Test Patient' })}>Select</button>
    </div>
  )
}));

vi.mock('../NursePatientDetailsModal', () => ({
  default: ({ isOpen, onClose, patient }) => (
    isOpen ? (
      <div data-testid="patient-details-modal">
        <div>Patient: {patient}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  )
}));

describe('NurseHeader', () => {
  const mockOnSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header with title and subtitle', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
          />
        </BrowserRouter>
      );
      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
    });

    it('should display global search by default', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
          />
        </BrowserRouter>
      );
      expect(screen.getByTestId('global-patient-search')).toBeInTheDocument();
    });

    it('should display local search when onSearch is provided', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
            onSearch={mockOnSearch}
          />
        </BrowserRouter>
      );
      expect(screen.queryByTestId('global-patient-search')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search patients/i)).toBeInTheDocument();
    });

    it('should hide search when hideSearch is true', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
            hideSearch={true}
          />
        </BrowserRouter>
      );
      expect(screen.queryByTestId('global-patient-search')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    });

    it('should display notification icon', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
          />
        </BrowserRouter>
      );
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    });

    it('should display profile icon', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
          />
        </BrowserRouter>
      );
      expect(screen.getByLabelText(/profile/i)).toBeInTheDocument();
    });

    it('should display notification badge when count > 0', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
          />
        </BrowserRouter>
      );
      // Badge should not be visible initially (count is 0)
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should call onSearch when local search is used', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
            onSearch={mockOnSearch}
          />
        </BrowserRouter>
      );
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });
      
      expect(mockOnSearch).toHaveBeenCalledWith('John');
    });

    it('should use custom search placeholder', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
            searchPlaceholder="Custom placeholder"
          />
        </BrowserRouter>
      );
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });
  });

  describe('Notifications', () => {
    it('should open notification modal', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
          />
        </BrowserRouter>
      );
      const notificationButton = screen.getByLabelText(/notifications/i);
      fireEvent.click(notificationButton);
      
      expect(screen.getByTestId('notification-modal')).toBeInTheDocument();
    });
  });

  describe('Profile', () => {
    it('should open profile dropdown', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
          />
        </BrowserRouter>
      );
      const profileButton = screen.getByLabelText(/profile/i);
      fireEvent.click(profileButton);
      
      expect(screen.getByTestId('profile-dropdown')).toBeInTheDocument();
    });
  });

  describe('Patient Selection', () => {
    it('should open patient details modal when patient is selected from global search', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
          />
        </BrowserRouter>
      );
      const selectButton = screen.getByText('Select');
      fireEvent.click(selectButton);
      
      expect(screen.getByTestId('patient-details-modal')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onSearch', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
            onSearch={null}
          />
        </BrowserRouter>
      );
      // Should use global search
      expect(screen.getByTestId('global-patient-search')).toBeInTheDocument();
    });

    it('should handle useLocalSearch flag', () => {
      render(
        <BrowserRouter>
          <NurseHeader
            title="Test Title"
            subtitle="Test Subtitle"
            useLocalSearch={true}
            onSearch={mockOnSearch}
          />
        </BrowserRouter>
      );
      expect(screen.queryByTestId('global-patient-search')).not.toBeInTheDocument();
    });
  });
});
