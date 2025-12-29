/**
 * Tests for ConsentFormSection component
 * Ensures 100% coverage including all rendering scenarios and interactions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ConsentFormSection from '../ConsentFormSection';
import React from 'react';

describe('ConsentFormSection', () => {
  const mockTemplate = {
    id: 1,
    test_name: 'MRI',
    procedure_name: 'Magnetic Resonance Imaging'
  };

  const mockPatientForm = {
    id: 1,
    file_path: 'uploads/consent-forms/patients/test.pdf'
  };

  const defaultProps = {
    investigationName: 'MRI',
    templateToUse: mockTemplate,
    hasUploadedForm: false,
    printingConsentForm: false,
    uploadingConsentForms: {},
    getPrintButtonTitle: vi.fn((hasTemplate, isPrinting) => {
      if (!hasTemplate) return 'Template not available';
      if (isPrinting) return 'Loading...';
      return 'Print consent form';
    }),
    handlePrintConsentForm: vi.fn(),
    handleConsentFormUpload: vi.fn(),
    handleViewConsentForm: vi.fn(),
    patientConsentForm: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  describe('Rendering', () => {
    it('should render consent form section', () => {
      render(<ConsentFormSection {...defaultProps} />);
      expect(screen.getByText('Consent Form')).toBeInTheDocument();
    });

    it('should show signed badge when form is uploaded', () => {
      render(<ConsentFormSection {...defaultProps} hasUploadedForm={true} />);
      expect(screen.getByText('Signed')).toBeInTheDocument();
    });

    it('should show template not available badge when no template', () => {
      render(<ConsentFormSection {...defaultProps} templateToUse={null} />);
      expect(screen.getByText('Template Not Available')).toBeInTheDocument();
    });

    it('should render print button', () => {
      render(<ConsentFormSection {...defaultProps} />);
      expect(screen.getByText('Print')).toBeInTheDocument();
    });

    it('should render upload button', () => {
      render(<ConsentFormSection {...defaultProps} />);
      expect(screen.getByText(/Upload Signed MRI/)).toBeInTheDocument();
    });

    it('should show re-upload text when form is already uploaded', () => {
      render(<ConsentFormSection {...defaultProps} hasUploadedForm={true} />);
      expect(screen.getByText(/Re-upload Signed MRI/)).toBeInTheDocument();
    });

    it('should render view button when form is uploaded', () => {
      render(
        <ConsentFormSection
          {...defaultProps}
          hasUploadedForm={true}
          patientConsentForm={mockPatientForm}
        />
      );
      expect(screen.getByText(/View MRI Consent Form/)).toBeInTheDocument();
    });
  });

  describe('Print Button', () => {
    it('should be enabled when template is available', () => {
      render(<ConsentFormSection {...defaultProps} />);
      const printButton = screen.getByText('Print').closest('button');
      expect(printButton).not.toBeDisabled();
    });

    it('should be disabled when no template', () => {
      render(<ConsentFormSection {...defaultProps} templateToUse={null} />);
      const printButton = screen.getByText('Print').closest('button');
      expect(printButton).toBeDisabled();
    });

    it('should be disabled when printing', () => {
      render(<ConsentFormSection {...defaultProps} printingConsentForm={true} />);
      const printButton = screen.getByText('Loading...').closest('button');
      expect(printButton).toBeDisabled();
    });

    it('should show loading state when printing', () => {
      render(<ConsentFormSection {...defaultProps} printingConsentForm={true} />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should call handlePrintConsentForm when clicked', () => {
      const handlePrint = vi.fn();
      render(
        <ConsentFormSection
          {...defaultProps}
          handlePrintConsentForm={handlePrint}
        />
      );
      const printButton = screen.getByText('Print').closest('button');
      fireEvent.click(printButton);
      expect(handlePrint).toHaveBeenCalledWith(mockTemplate, 'MRI');
    });

    it('should not call handlePrintConsentForm when disabled', () => {
      const handlePrint = vi.fn();
      render(
        <ConsentFormSection
          {...defaultProps}
          templateToUse={null}
          handlePrintConsentForm={handlePrint}
        />
      );
      const printButton = screen.getByText('Print').closest('button');
      fireEvent.click(printButton);
      expect(handlePrint).not.toHaveBeenCalled();
    });

    it('should have correct title attribute', () => {
      render(<ConsentFormSection {...defaultProps} />);
      const printButton = screen.getByText('Print').closest('button');
      expect(printButton).toHaveAttribute('title', 'Print consent form');
    });
  });

  describe('Upload Button', () => {
    it('should be enabled when template is available', () => {
      render(<ConsentFormSection {...defaultProps} />);
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      expect(uploadInput).not.toBeDisabled();
    });

    it('should be disabled when no template', () => {
      render(<ConsentFormSection {...defaultProps} templateToUse={null} />);
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      expect(uploadInput).toBeDisabled();
    });

    it('should be disabled when uploading', () => {
      render(
        <ConsentFormSection
          {...defaultProps}
          uploadingConsentForms={{ mri: true }}
        />
      );
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      expect(uploadInput).toBeDisabled();
    });

    it('should call handleConsentFormUpload when file is selected', () => {
      const handleUpload = vi.fn();
      render(
        <ConsentFormSection
          {...defaultProps}
          handleConsentFormUpload={handleUpload}
        />
      );
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(uploadInput, { target: { files: [file] } });
      expect(handleUpload).toHaveBeenCalledWith('MRI', mockTemplate, file);
    });

    it('should show alert when file selected without template', () => {
      render(<ConsentFormSection {...defaultProps} templateToUse={null} />);
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(uploadInput, { target: { files: [file] } });
      expect(global.alert).toHaveBeenCalled();
    });

    it('should call onErrorAlert when file selected without template and showErrorAlert is true', () => {
      const onErrorAlert = vi.fn();
      render(
        <ConsentFormSection
          {...defaultProps}
          templateToUse={null}
          showErrorAlert={true}
          onErrorAlert={onErrorAlert}
        />
      );
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(uploadInput, { target: { files: [file] } });
      expect(onErrorAlert).toHaveBeenCalled();
      expect(global.alert).not.toHaveBeenCalled();
    });

    it('should reset file input after selection', () => {
      render(<ConsentFormSection {...defaultProps} />);
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(uploadInput, { target: { files: [file] } });
      expect(uploadInput.value).toBe('');
    });
  });

  describe('View Button', () => {
    it('should call handleViewConsentForm when clicked', () => {
      const handleView = vi.fn();
      render(
        <ConsentFormSection
          {...defaultProps}
          hasUploadedForm={true}
          patientConsentForm={mockPatientForm}
          handleViewConsentForm={handleView}
        />
      );
      const viewButton = screen.getByText(/View MRI Consent Form/);
      fireEvent.click(viewButton);
      expect(handleView).toHaveBeenCalledWith(mockPatientForm);
    });

    it('should not render view button when form is not uploaded', () => {
      render(<ConsentFormSection {...defaultProps} hasUploadedForm={false} />);
      expect(screen.queryByText(/View.*Consent Form/)).not.toBeInTheDocument();
    });
  });

  describe('Not Required Status', () => {
    it('should disable print button when isNotRequired is true', () => {
      render(<ConsentFormSection {...defaultProps} isNotRequired={true} />);
      const printButton = screen.getByText('Print').closest('button');
      expect(printButton).toBeDisabled();
    });

    it('should disable upload button when isNotRequired is true', () => {
      render(<ConsentFormSection {...defaultProps} isNotRequired={true} />);
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      expect(uploadInput).toBeDisabled();
    });

    it('should show appropriate title when isNotRequired is true', () => {
      render(<ConsentFormSection {...defaultProps} isNotRequired={true} />);
      const printButton = screen.getByText('Print').closest('button');
      expect(printButton).toHaveAttribute('title', 'Test is marked as Not Required. Consent form actions are disabled.');
    });

    it('should not call handlePrintConsentForm when isNotRequired is true', () => {
      const handlePrint = vi.fn();
      render(
        <ConsentFormSection
          {...defaultProps}
          isNotRequired={true}
          handlePrintConsentForm={handlePrint}
        />
      );
      const printButton = screen.getByText('Print').closest('button');
      fireEvent.click(printButton);
      expect(handlePrint).not.toHaveBeenCalled();
    });

    it('should show alert when trying to upload with isNotRequired is true', () => {
      global.alert = vi.fn();
      render(
        <ConsentFormSection
          {...defaultProps}
          isNotRequired={true}
        />
      );
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(uploadInput, { target: { files: [file] } });
      expect(global.alert).toHaveBeenCalledWith('Test is marked as Not Required. Consent form actions are disabled.');
    });

    it('should call onErrorAlert when trying to upload with isNotRequired is true and showErrorAlert is true', () => {
      const onErrorAlert = vi.fn();
      render(
        <ConsentFormSection
          {...defaultProps}
          isNotRequired={true}
          showErrorAlert={true}
          onErrorAlert={onErrorAlert}
        />
      );
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(uploadInput, { target: { files: [file] } });
      expect(onErrorAlert).toHaveBeenCalledWith('Test is marked as Not Required. Consent form actions are disabled.');
    });

    it('should enable buttons when isNotRequired is false', () => {
      render(<ConsentFormSection {...defaultProps} isNotRequired={false} />);
      const printButton = screen.getByText('Print').closest('button');
      const uploadInput = screen.getByLabelText(/Upload Signed MRI/);
      expect(printButton).not.toBeDisabled();
      expect(uploadInput).not.toBeDisabled();
    });
  });
});

