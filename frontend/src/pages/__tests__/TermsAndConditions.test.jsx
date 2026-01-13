import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TermsAndConditions from '../TermsAndConditions';

describe('TermsAndConditions', () => {
  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <TermsAndConditions />
      </MemoryRouter>
    );
  };

  it('renders the main heading', () => {
    renderComponent();
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument();
  });

  it('renders last updated date', () => {
    renderComponent();
    const lastUpdatedText = screen.getByText(/Last updated:/);
    expect(lastUpdatedText).toBeInTheDocument();
  });

  it('renders all main sections', () => {
    renderComponent();
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument();
    expect(screen.getByText('2. Use License')).toBeInTheDocument();
    expect(screen.getByText('3. Medical Disclaimer')).toBeInTheDocument();
    expect(screen.getByText('4. User Responsibilities')).toBeInTheDocument();
    expect(screen.getByText('5. Privacy and Data Protection')).toBeInTheDocument();
    expect(screen.getByText('6. Limitation of Liability')).toBeInTheDocument();
    expect(screen.getByText('7. Revisions and Errata')).toBeInTheDocument();
    expect(screen.getByText('8. Contact Information')).toBeInTheDocument();
  });

  it('renders content for Acceptance of Terms section', () => {
    renderComponent();
    expect(screen.getByText(/By accessing and using the Urology Care System/)).toBeInTheDocument();
  });

  it('renders Use License restrictions', () => {
    renderComponent();
    expect(screen.getByText(/Modify or copy the materials/)).toBeInTheDocument();
    expect(screen.getByText(/Use the materials for any commercial purpose/)).toBeInTheDocument();
    expect(screen.getByText(/Attempt to decompile or reverse engineer/)).toBeInTheDocument();
    expect(screen.getByText(/Remove any copyright or other proprietary notations/)).toBeInTheDocument();
  });

  it('renders Medical Disclaimer content', () => {
    renderComponent();
    expect(screen.getByText(/The information provided by the Urology Care System/)).toBeInTheDocument();
    expect(screen.getByText(/The system is not intended to be a substitute for professional medical advice/)).toBeInTheDocument();
  });

  it('renders User Responsibilities list', () => {
    renderComponent();
    expect(screen.getByText(/Maintaining the confidentiality of their account credentials/)).toBeInTheDocument();
    expect(screen.getByText(/All activities that occur under their account/)).toBeInTheDocument();
    expect(screen.getByText(/Ensuring the accuracy of information entered/)).toBeInTheDocument();
    expect(screen.getByText(/Complying with all applicable laws and regulations/)).toBeInTheDocument();
  });

  it('renders Privacy and Data Protection section', () => {
    renderComponent();
    expect(screen.getByText(/Your use of the system is also governed by our Privacy Policy/)).toBeInTheDocument();
  });

  it('renders Limitation of Liability section', () => {
    renderComponent();
    expect(screen.getByText(/In no event shall AhimsaGlobal or its suppliers be liable/)).toBeInTheDocument();
  });

  it('renders Revisions and Errata section', () => {
    renderComponent();
    expect(screen.getByText(/The materials appearing on the system could include technical/)).toBeInTheDocument();
  });

  it('renders Contact Information section', () => {
    renderComponent();
    expect(screen.getByText(/If you have any questions about these Terms and Conditions/)).toBeInTheDocument();
    expect(screen.getByText(/support@ahimsaglobal.com/)).toBeInTheDocument();
  });

  it('has proper page structure with container classes', () => {
    const { container } = renderComponent();
    const mainContainer = container.querySelector('.min-h-screen.bg-gray-50');
    expect(mainContainer).toBeInTheDocument();
    
    const contentContainer = container.querySelector('.max-w-4xl.mx-auto.bg-white');
    expect(contentContainer).toBeInTheDocument();
  });

  it('renders all list items in Use License section', () => {
    renderComponent();
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThan(0);
  });
});
