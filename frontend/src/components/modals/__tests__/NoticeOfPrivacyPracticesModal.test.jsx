import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NoticeOfPrivacyPracticesModal from '../NoticeOfPrivacyPracticesModal';

describe('NoticeOfPrivacyPracticesModal', () => {
  const mockOnClose = vi.fn();

  it('should not render when isOpen is false', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Notice of Privacy Practices')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Notice of Privacy Practices')).toBeInTheDocument();
  });

  it('should display all main sections', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('1. Introduction')).toBeInTheDocument();
    expect(screen.getByText('2. Uses and Disclosures of Protected Health Information')).toBeInTheDocument();
    expect(screen.getByText('3. Your Rights Regarding Protected Health Information')).toBeInTheDocument();
    expect(screen.getByText('4. Uses and Disclosures That Require Your Authorization')).toBeInTheDocument();
    expect(screen.getByText('5. Uses and Disclosures That Do Not Require Your Authorization')).toBeInTheDocument();
    expect(screen.getByText('6. Breach Notification')).toBeInTheDocument();
    expect(screen.getByText('7. Changes to This Notice')).toBeInTheDocument();
    expect(screen.getByText('8. Complaints')).toBeInTheDocument();
    expect(screen.getByText('9. Contact Information')).toBeInTheDocument();
    expect(screen.getByText('10. Acknowledgment')).toBeInTheDocument();
  });

  it('should display subsection headers', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('2.1 Treatment')).toBeInTheDocument();
    expect(screen.getByText('2.2 Payment')).toBeInTheDocument();
    expect(screen.getByText('2.3 Health Care Operations')).toBeInTheDocument();
    expect(screen.getByText('3.1 Right to Request Restrictions')).toBeInTheDocument();
    expect(screen.getByText('3.2 Right to Request Confidential Communications')).toBeInTheDocument();
    expect(screen.getByText('3.3 Right to Inspect and Copy')).toBeInTheDocument();
    expect(screen.getByText('3.4 Right to Amend')).toBeInTheDocument();
    expect(screen.getByText('3.5 Right to an Accounting of Disclosures')).toBeInTheDocument();
    expect(screen.getByText('3.6 Right to a Paper Copy of This Notice')).toBeInTheDocument();
  });

  it('should display HIPAA compliance information', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/HIPAA Compliance/)).toBeInTheDocument();
    expect(screen.getByText(/Effective Date:/)).toBeInTheDocument();
  });

  it('should display contact information', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Privacy Officer')).toBeInTheDocument();
    expect(screen.getByText(/AhimsaGlobal Healthcare Systems/)).toBeInTheDocument();
    expect(screen.getByText(/privacy@ahimsaglobal.com/)).toBeInTheDocument();
  });

  it('should display content about protected health information', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/protected health information \(PHI\)/)).toBeInTheDocument();
  });

  it('should display content about patient rights', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/You have the right to request restrictions/)).toBeInTheDocument();
    expect(screen.getByText(/You have the right to request that we communicate/)).toBeInTheDocument();
    expect(screen.getByText(/You have the right to inspect and obtain a copy/)).toBeInTheDocument();
  });

  it('should display content about uses and disclosures', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/We may use and disclose your PHI to provide/)).toBeInTheDocument();
    expect(screen.getByText(/We may use and disclose your PHI to obtain payment/)).toBeInTheDocument();
  });

  it('should display list of disclosures that do not require authorization', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('As required by law')).toBeInTheDocument();
    expect(screen.getByText('For public health activities')).toBeInTheDocument();
    expect(screen.getByText('For health oversight activities')).toBeInTheDocument();
    expect(screen.getByText('For judicial and administrative proceedings')).toBeInTheDocument();
    expect(screen.getByText('For law enforcement purposes')).toBeInTheDocument();
    expect(screen.getByText('To avert a serious threat to health or safety')).toBeInTheDocument();
  });

  it('should display breach notification information', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/We are required to notify you following a breach/)).toBeInTheDocument();
  });

  it('should display complaints information', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/If you believe your privacy rights have been violated/)).toBeInTheDocument();
    expect(screen.getByText(/You will not be penalized for filing a complaint/)).toBeInTheDocument();
  });

  it('should display acknowledgment section', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText(/By using our healthcare services, you acknowledge/)).toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close modal when footer close button is clicked', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    const footerCloseButton = screen.getByText('Close');
    fireEvent.click(footerCloseButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should have proper modal structure', () => {
    const { container } = render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    const modal = container.querySelector('.fixed.inset-0');
    expect(modal).toBeInTheDocument();
  });

  it('should have scrollable content area', () => {
    const { container } = render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    const scrollableArea = container.querySelector('.overflow-y-auto');
    expect(scrollableArea).toBeInTheDocument();
  });

  it('should display effective date', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    const effectiveDateText = screen.getByText(/Effective Date:/);
    expect(effectiveDateText).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    render(<NoticeOfPrivacyPracticesModal isOpen={true} onClose={mockOnClose} />);
    const header = screen.getByText('Notice of Privacy Practices').closest('.flex.items-center.justify-between');
    expect(header).toBeInTheDocument();
  });
});
