import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalPatientSearch from '../GlobalPatientSearch';
import { patientService } from '../../services/patientService';

// Mock dependencies
vi.mock('../../services/patientService', () => ({
  patientService: {
    searchPatients: vi.fn()
  }
}));

describe('GlobalPatientSearch', () => {
  const mockOnPatientSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render search input', () => {
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      expect(screen.getByPlaceholderText(/search patients/i)).toBeInTheDocument();
    });

    it('should display custom placeholder', () => {
      render(
        <GlobalPatientSearch
          onPatientSelect={mockOnPatientSelect}
          placeholder="Custom placeholder"
        />
      );
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should display default placeholder when not provided', () => {
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      expect(screen.getByPlaceholderText(/search patients by name/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should not search when query is less than 1 character', async () => {
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: '' } });
      vi.advanceTimersByTime(300);
      
      expect(patientService.searchPatients).not.toHaveBeenCalled();
    });

    it('should debounce search requests', async () => {
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: []
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Jo' } });
      fireEvent.change(searchInput, { target: { value: 'Joh' } });
      
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(patientService.searchPatients).toHaveBeenCalledTimes(1);
      });
    });

    it('should search when query length is 1 or more', async () => {
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: []
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'J' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(patientService.searchPatients).toHaveBeenCalledWith('J', 20);
      });
    });

    it('should display suggestions when search succeeds', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' },
        { id: 2, name: 'Jane Smith', upi: 'URP456' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
    });

    it('should limit suggestions to 10 results', async () => {
      const mockPatients = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Patient ${i + 1}`,
        upi: `URP${i + 1}`
      }));
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'Patient' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const suggestions = screen.getAllByText(/patient/i);
        expect(suggestions.length).toBeLessThanOrEqual(10);
      });
    });

    it('should prioritize "starts with" matches', async () => {
      const mockPatients = [
        { id: 1, name: 'John Smith', upi: 'URP123' },
        { id: 2, name: 'Johnny Doe', upi: 'URP456' },
        { id: 3, name: 'Bob Johnson', upi: 'URP789' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const suggestions = screen.getAllByText(/john/i);
        expect(suggestions[0].textContent).toContain('John Smith');
      });
    });

    it('should hide suggestions when query is cleared', async () => {
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: [{ id: 1, name: 'John Doe' }]
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.change(searchInput, { target: { value: '' } });
      vi.advanceTimersByTime(300);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate down with ArrowDown key', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' },
        { id: 2, name: 'Jane Smith', upi: 'URP456' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      
      // Selected index should be 0
      await waitFor(() => {
        const suggestions = screen.getAllByText(/john|jane/i);
        expect(suggestions[0]).toHaveClass(/selected|highlight/i);
      });
    });

    it('should navigate up with ArrowUp key', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' },
        { id: 2, name: 'Jane Smith', upi: 'URP456' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Navigate down first
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      
      // Then navigate up
      fireEvent.keyDown(searchInput, { key: 'ArrowUp' });
      
      // Should be at index 0
      await waitFor(() => {
        const suggestions = screen.getAllByText(/john|jane/i);
        expect(suggestions[0]).toHaveClass(/selected|highlight/i);
      });
    });

    it('should select patient with Enter key', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      fireEvent.keyDown(searchInput, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockOnPatientSelect).toHaveBeenCalledWith(mockPatients[0]);
      });
    });

    it('should close suggestions with Escape key', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(searchInput, { key: 'Escape' });
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should not navigate when suggestions are not shown', () => {
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
      
      // Should not crash
      expect(screen.queryByText(/patient/i)).not.toBeInTheDocument();
    });
  });

  describe('Click Outside', () => {
    it('should close suggestions when clicking outside', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      fireEvent.mouseDown(document.body);
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Patient Selection', () => {
    it('should call onPatientSelect when patient is clicked', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const patientItem = screen.getByText('John Doe');
        fireEvent.click(patientItem);
      });
      
      expect(mockOnPatientSelect).toHaveBeenCalledWith(mockPatients[0]);
    });

    it('should clear search after selection', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const patientItem = screen.getByText('John Doe');
        fireEvent.click(patientItem);
      });
      
      expect(searchInput.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should handle search error gracefully', async () => {
      patientService.searchPatients.mockRejectedValue(new Error('Search failed'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalled();
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle unsuccessful search response', async () => {
      patientService.searchPatients.mockResolvedValue({
        success: false,
        error: 'Search failed'
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(patientService.searchPatients).toHaveBeenCalled();
      });
      
      expect(screen.queryByText(/patient/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state during search', async () => {
      patientService.searchPatients.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100)));
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onPatientSelect callback', async () => {
      const mockPatients = [
        { id: 1, name: 'John Doe', upi: 'URP123' }
      ];
      
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: mockPatients
      });
      
      render(<GlobalPatientSearch onPatientSelect={null} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'John' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        const patientItem = screen.getByText('John Doe');
        fireEvent.click(patientItem);
      });
      
      // Should not crash
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should handle empty search results', async () => {
      patientService.searchPatients.mockResolvedValue({
        success: true,
        data: []
      });
      
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: 'Nonexistent' } });
      vi.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(patientService.searchPatients).toHaveBeenCalled();
      });
      
      expect(screen.queryByText(/patient/i)).not.toBeInTheDocument();
    });

    it('should handle whitespace-only queries', async () => {
      render(<GlobalPatientSearch onPatientSelect={mockOnPatientSelect} />);
      const searchInput = screen.getByPlaceholderText(/search patients/i);
      
      fireEvent.change(searchInput, { target: { value: '   ' } });
      vi.advanceTimersByTime(300);
      
      expect(patientService.searchPatients).not.toHaveBeenCalled();
    });
  });
});
