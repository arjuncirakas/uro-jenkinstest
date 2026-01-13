import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivacyPolicy from '../PrivacyPolicy';

describe('PrivacyPolicy', () => {
  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <PrivacyPolicy />
      </MemoryRouter>
    );
  };

  it('renders the main heading', () => {
    renderComponent();
    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('renders last updated date', () => {
    renderComponent();
    const lastUpdatedText = screen.getByText(/Last updated:/);
    expect(lastUpdatedText).toBeInTheDocument();
  });

  it('renders all main sections', () => {
    renderComponent();
    expect(screen.getByText('1. Introduction')).toBeInTheDocument();
    expect(screen.getByText('2. Information We Collect')).toBeInTheDocument();
    expect(screen.getByText('3. How We Use Your Information')).toBeInTheDocument();
    expect(screen.getByText('4. Data Security')).toBeInTheDocument();
    expect(screen.getByText('5. HIPAA and GDPR Compliance')).toBeInTheDocument();
    expect(screen.getByText('6. Data Sharing and Disclosure')).toBeInTheDocument();
    expect(screen.getByText('7. Your Rights')).toBeInTheDocument();
    expect(screen.getByText('8. Data Retention')).toBeInTheDocument();
    expect(screen.getByText('9. Changes to This Privacy Policy')).toBeInTheDocument();
    expect(screen.getByText('10. Contact Us')).toBeInTheDocument();
  });

  it('renders Introduction section content', () => {
    renderComponent();
    expect(screen.getByText(/AhimsaGlobal \("we", "our", or "us"\) is committed to protecting your privacy/)).toBeInTheDocument();
  });

  it('renders Information We Collect list items', () => {
    renderComponent();
    expect(screen.getByText(/Personal identification information/)).toBeInTheDocument();
    expect(screen.getByText(/Medical information and health records/)).toBeInTheDocument();
    expect(screen.getByText(/Account credentials and authentication information/)).toBeInTheDocument();
    expect(screen.getByText(/Usage data and system interactions/)).toBeInTheDocument();
  });

  it('renders How We Use Your Information list items', () => {
    renderComponent();
    expect(screen.getByText(/Provide, maintain, and improve our services/)).toBeInTheDocument();
    expect(screen.getByText(/Process transactions and manage patient care/)).toBeInTheDocument();
    expect(screen.getByText(/Send administrative information and updates/)).toBeInTheDocument();
    expect(screen.getByText(/Respond to your inquiries and provide customer support/)).toBeInTheDocument();
    expect(screen.getByText(/Comply with legal obligations and regulatory requirements/)).toBeInTheDocument();
  });

  it('renders Data Security list items', () => {
    renderComponent();
    expect(screen.getByText(/Encryption of data in transit and at rest/)).toBeInTheDocument();
    expect(screen.getByText(/Regular security assessments and audits/)).toBeInTheDocument();
    expect(screen.getByText(/Access controls and authentication mechanisms/)).toBeInTheDocument();
    expect(screen.getByText(/Employee training on data protection/)).toBeInTheDocument();
  });

  it('renders HIPAA and GDPR Compliance section', () => {
    renderComponent();
    expect(screen.getByText(/We are committed to compliance with the Health Insurance Portability/)).toBeInTheDocument();
  });

  it('renders Data Sharing and Disclosure list items', () => {
    renderComponent();
    expect(screen.getByText(/With your explicit consent/)).toBeInTheDocument();
    expect(screen.getByText(/To comply with legal obligations/)).toBeInTheDocument();
    expect(screen.getByText(/To protect our rights and safety/)).toBeInTheDocument();
    expect(screen.getByText(/With authorized healthcare providers involved in your care/)).toBeInTheDocument();
  });

  it('renders Your Rights list items', () => {
    renderComponent();
    expect(screen.getByText(/Access your personal information/)).toBeInTheDocument();
    expect(screen.getByText(/Request correction of inaccurate data/)).toBeInTheDocument();
    expect(screen.getByText(/Request deletion of your data/)).toBeInTheDocument();
    expect(screen.getByText(/Object to processing of your data/)).toBeInTheDocument();
    expect(screen.getByText(/Request data portability/)).toBeInTheDocument();
    expect(screen.getByText(/Withdraw consent at any time/)).toBeInTheDocument();
  });

  it('renders Data Retention section', () => {
    renderComponent();
    expect(screen.getByText(/We retain your personal information for as long as necessary/)).toBeInTheDocument();
  });

  it('renders Changes to Privacy Policy section', () => {
    renderComponent();
    expect(screen.getByText(/We may update this Privacy Policy from time to time/)).toBeInTheDocument();
  });

  it('renders Contact Us section with email', () => {
    renderComponent();
    expect(screen.getByText(/If you have any questions about this Privacy Policy/)).toBeInTheDocument();
    expect(screen.getByText(/privacy@ahimsaglobal.com/)).toBeInTheDocument();
  });

  it('has proper page structure with container classes', () => {
    const { container } = renderComponent();
    const mainContainer = container.querySelector('.min-h-screen.bg-gray-50');
    expect(mainContainer).toBeInTheDocument();
    
    const contentContainer = container.querySelector('.max-w-4xl.mx-auto.bg-white');
    expect(contentContainer).toBeInTheDocument();
  });

  it('renders all list items correctly', () => {
    renderComponent();
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThan(0);
  });
});
