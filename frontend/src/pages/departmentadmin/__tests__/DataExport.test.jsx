import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import DataExport from '../DataExport';
import departmentAdminService from '../../../services/departmentAdminService';

// Mock dependencies
vi.mock('../../../services/departmentAdminService', () => ({
  default: {
    getExportFields: vi.fn(),
    exportPatientsToCSV: vi.fn(),
    exportPatientsToExcel: vi.fn()
  }
}));

vi.mock('../../../components/modals/SuccessModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="success-modal">{message}</div> : null
  )
}));

vi.mock('../../../components/modals/ErrorModal', () => ({
  default: ({ isOpen, message }) => (
    isOpen ? <div data-testid="error-modal">{message}</div> : null
  )
}));

describe('DataExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    departmentAdminService.getExportFields.mockResolvedValue({
      success: true,
      data: {
        fields: [
          { id: 1, name: 'First Name', category: 'basic' },
          { id: 2, name: 'Email', category: 'contact' }
        ]
      }
    });
    departmentAdminService.exportPatientsToCSV.mockResolvedValue({ success: true });
    departmentAdminService.exportPatientsToExcel.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('should render data export page', () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      expect(screen.getByText('Data Export')).toBeInTheDocument();
    });

    it('should display export fields', async () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByText('First Name')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
      });
    });

    it('should display filters', () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    });
  });

  describe('Field Selection', () => {
    it('should select all fields by default', async () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox.checked).toBe(true);
        });
      });
    });

    it('should toggle field selection', async () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const checkbox = screen.getByLabelText(/first name/i);
        fireEvent.click(checkbox);
        expect(checkbox.checked).toBe(false);
      });
    });

    it('should select all fields', async () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const selectAllButton = screen.getByText(/select all/i);
        fireEvent.click(selectAllButton);
        
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox.checked).toBe(true);
        });
      });
    });
  });

  describe('Export', () => {
    it('should export to CSV', async () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const csvButton = screen.getByText(/export.*csv/i);
        fireEvent.click(csvButton);
      });
      
      await waitFor(() => {
        expect(departmentAdminService.exportPatientsToCSV).toHaveBeenCalled();
      });
    });

    it('should export to Excel', async () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const excelButton = screen.getByText(/export.*excel/i);
        fireEvent.click(excelButton);
      });
      
      await waitFor(() => {
        expect(departmentAdminService.exportPatientsToExcel).toHaveBeenCalled();
      });
    });

    it('should require at least one field selected', async () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        // Deselect all fields
        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          if (checkbox.checked) {
            fireEvent.click(checkbox);
          }
        });
        
        const csvButton = screen.getByText(/export.*csv/i);
        fireEvent.click(csvButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
        expect(screen.getByText(/select at least one field/i)).toBeInTheDocument();
      });
    });

    it('should apply filters to export', async () => {
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const startDateInput = screen.getByLabelText(/start date/i);
        fireEvent.change(startDateInput, { target: { value: '2024-01-01' } });
        
        const csvButton = screen.getByText(/export.*csv/i);
        fireEvent.click(csvButton);
      });
      
      await waitFor(() => {
        expect(departmentAdminService.exportPatientsToCSV).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({
            startDate: '2024-01-01'
          })
        );
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle fetch fields error', async () => {
      departmentAdminService.getExportFields.mockRejectedValue(new Error('Fetch failed'));
      
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
      });
    });

    it('should handle export error', async () => {
      departmentAdminService.exportPatientsToCSV.mockRejectedValue(new Error('Export failed'));
      
      render(
        <BrowserRouter>
          <DataExport />
        </BrowserRouter>
      );
      
      await waitFor(() => {
        const csvButton = screen.getByText(/export.*csv/i);
        fireEvent.click(csvButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('error-modal')).toBeInTheDocument();
      });
    });
  });
});
