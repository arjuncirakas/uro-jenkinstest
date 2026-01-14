import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BulkPSAUploadModal from '../BulkPSAUploadModal';
import { investigationService } from '../../../services/investigationService';

// Mock dependencies
vi.mock('../../../services/investigationService', () => ({
  investigationService: {
    parsePSAFile: vi.fn(),
    addInvestigationResult: vi.fn()
  }
}));

vi.mock('../../../utils/psaStatusByAge', () => ({
  getPSAStatusByAge: vi.fn((psa, age) => ({
    status: psa > 4 ? 'High' : 'Normal',
    threshold: 4
  }))
}));

describe('BulkPSAUploadModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockPatient = {
    id: 1,
    name: 'John Doe',
    age: 50
  };

  beforeEach(() => {
    vi.clearAllMocks();
    investigationService.parsePSAFile.mockResolvedValue({
      success: true,
      data: { psaEntries: [] }
    });
    investigationService.addInvestigationResult.mockResolvedValue({
      success: true
    });
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <BulkPSAUploadModal
          isOpen={false}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.queryByText(/bulk psa upload/i)).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.getByText(/bulk psa upload/i)).toBeInTheDocument();
    });

    it('should display file upload input', () => {
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.getByLabelText(/upload file/i)).toBeInTheDocument();
    });

    it('should initialize with one empty entry', () => {
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      expect(screen.getByLabelText(/test date/i)).toBeInTheDocument();
    });
  });

  describe('File Upload', () => {
    it('should handle file selection', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      investigationService.parsePSAFile.mockResolvedValue({
        success: true,
        data: {
          psaEntries: [
            {
              testDate: '2024-01-15',
              result: '4.5',
              status: 'Normal'
            }
          ]
        }
      });
      
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      const fileInput = screen.getByLabelText(/upload file/i);
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(investigationService.parsePSAFile).toHaveBeenCalled();
      });
    });

    it('should validate file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      const fileInput = screen.getByLabelText(/upload file/i);
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });

    it('should validate file size', async () => {
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
      
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      const fileInput = screen.getByLabelText(/upload file/i);
      fireEvent.change(fileInput, { target: { files: [largeFile] } });
      
      await waitFor(() => {
        expect(screen.getByText(/file size exceeds/i)).toBeInTheDocument();
      });
    });

    it('should auto-populate entries from parsed file', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      investigationService.parsePSAFile.mockResolvedValue({
        success: true,
        data: {
          psaEntries: [
            {
              testDate: '2024-01-15',
              result: '4.5',
              status: 'Normal',
              notes: 'Test note'
            }
          ]
        }
      });
      
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      const fileInput = screen.getByLabelText(/upload file/i);
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('4.5')).toBeInTheDocument();
      });
    });
  });

  describe('PSA Entries Management', () => {
    it('should add new entry', () => {
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const addButton = screen.getByText(/add entry/i);
      fireEvent.click(addButton);
      
      const dateInputs = screen.getAllByLabelText(/test date/i);
      expect(dateInputs.length).toBe(2);
    });

    it('should remove entry', () => {
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const addButton = screen.getByText(/add entry/i);
      fireEvent.click(addButton);
      
      const removeButtons = screen.getAllByLabelText(/remove entry/i);
      fireEvent.click(removeButtons[0]);
      
      const dateInputs = screen.getAllByLabelText(/test date/i);
      expect(dateInputs.length).toBe(1);
    });

    it('should not remove last entry', () => {
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      const removeButton = screen.getByLabelText(/remove entry/i);
      fireEvent.click(removeButton);
      
      // Should still have one entry
      expect(screen.getByLabelText(/test date/i)).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should validate entries before submission', async () => {
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          onSuccess={mockOnSuccess}
        />
      );
      
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByLabelText(/upload file/i);
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      const submitButton = screen.getByText(/submit/i);
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/test date is required/i)).toBeInTheDocument();
      });
    });

    it('should submit valid entries', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      investigationService.parsePSAFile.mockResolvedValue({
        success: true,
        data: {
          psaEntries: [
            {
              testDate: '2024-01-15',
              result: '4.5',
              status: 'Normal'
            }
          ]
        }
      });
      
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
          onSuccess={mockOnSuccess}
        />
      );
      
      const fileInput = screen.getByLabelText(/upload file/i);
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        const submitButton = screen.getByText(/submit/i);
        fireEvent.click(submitButton);
      });
      
      await waitFor(() => {
        expect(investigationService.addInvestigationResult).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null patient', () => {
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={null}
        />
      );
      // Should not crash
      expect(screen.getByText(/bulk psa upload/i)).toBeInTheDocument();
    });

    it('should handle parse error', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      
      investigationService.parsePSAFile.mockResolvedValue({
        success: false,
        error: 'Parse failed'
      });
      
      render(
        <BulkPSAUploadModal
          isOpen={true}
          onClose={mockOnClose}
          patient={mockPatient}
        />
      );
      
      const fileInput = screen.getByLabelText(/upload file/i);
      fireEvent.change(fileInput, { target: { files: [file] } });
      
      await waitFor(() => {
        expect(screen.getByText(/could not automatically extract/i)).toBeInTheDocument();
      });
    });
  });
});
