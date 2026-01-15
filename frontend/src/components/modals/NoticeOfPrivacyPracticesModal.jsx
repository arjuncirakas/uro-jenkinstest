import React from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * NoticeOfPrivacyPracticesModal - Modal component displaying Notice of Privacy Practices (HIPAA NPP)
 */
const NoticeOfPrivacyPracticesModal = ({ isOpen, onClose }) => {
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-labelledby="npp-modal-title"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all animate-slideUp flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center" id="npp-modal-title">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Notice of Privacy Practices
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                HIPAA Compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose max-w-none">
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">1. Introduction</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                This Notice of Privacy Practices describes how medical information about you may be used and disclosed and how you can get access to this information. Please review it carefully.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We are required by law to maintain the privacy of your protected health information (PHI) and to provide you with notice of our legal duties and privacy practices with respect to PHI. This notice describes how we may use and disclose your medical information, your rights with respect to your medical information, and our obligations regarding the use and disclosure of your medical information.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">2. Uses and Disclosures of Protected Health Information</h2>
              <h3 className="text-base font-semibold text-gray-700 mb-2 mt-3">2.1 Treatment</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We may use and disclose your PHI to provide, coordinate, or manage your health care and any related services. This includes the coordination or management of your health care with a third party, consultation with other health care providers, or referral to another health care provider.
              </p>

              <h3 className="text-xl font-semibold text-gray-700 mb-3 mt-4">2.2 Payment</h3>
              <p className="text-gray-700 mb-4">
                We may use and disclose your PHI to obtain payment for health care services we provide to you. This may include activities such as determining eligibility or coverage for insurance benefits, reviewing services provided to you for medical necessity, and undertaking utilization review activities.
              </p>

              <h3 className="text-base font-semibold text-gray-700 mb-2 mt-3">2.3 Health Care Operations</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We may use and disclose your PHI for our health care operations, which include activities necessary to run our organization and ensure that our patients receive quality care. These activities may include quality assessment and improvement activities, case management and care coordination, and business planning and development.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">3. Your Rights Regarding Protected Health Information</h2>
              <h3 className="text-base font-semibold text-gray-700 mb-2 mt-3">3.1 Right to Request Restrictions</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You have the right to request restrictions on certain uses and disclosures of your PHI. We are not required to agree to your requested restriction, except in limited circumstances.
              </p>

              <h3 className="text-base font-semibold text-gray-700 mb-2 mt-3">3.2 Right to Request Confidential Communications</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You have the right to request that we communicate with you about medical matters in a certain way or at a certain location. We will accommodate reasonable requests.
              </p>

              <h3 className="text-base font-semibold text-gray-700 mb-2 mt-3">3.3 Right to Inspect and Copy</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You have the right to inspect and obtain a copy of your PHI that may be used to make decisions about your care. This right is subject to certain limited exceptions.
              </p>

              <h3 className="text-base font-semibold text-gray-700 mb-2 mt-3">3.4 Right to Amend</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You have the right to request an amendment of your PHI if you believe it is incorrect or incomplete. We may deny your request under certain circumstances.
              </p>

              <h3 className="text-base font-semibold text-gray-700 mb-2 mt-3">3.5 Right to an Accounting of Disclosures</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You have the right to receive an accounting of certain disclosures of your PHI made by us. This right does not apply to all disclosures, including those made for treatment, payment, or health care operations.
              </p>

              <h3 className="text-base font-semibold text-gray-700 mb-2 mt-3">3.6 Right to a Paper Copy of This Notice</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You have the right to receive a paper copy of this notice at any time, even if you have agreed to receive this notice electronically.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">4. Uses and Disclosures That Require Your Authorization</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                Most uses and disclosures of psychotherapy notes, uses and disclosures of PHI for marketing purposes, and disclosures that constitute a sale of PHI require your written authorization. You may revoke an authorization at any time, except to the extent that we have already taken action in reliance on the authorization.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">5. Uses and Disclosures That Do Not Require Your Authorization</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We may use or disclose your PHI without your authorization in the following situations:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3 space-y-1.5">
                <li>As required by law</li>
                <li>For public health activities</li>
                <li>For health oversight activities</li>
                <li>For judicial and administrative proceedings</li>
                <li>For law enforcement purposes</li>
                <li>To avert a serious threat to health or safety</li>
                <li>For workers' compensation</li>
                <li>For research purposes (with appropriate safeguards)</li>
                <li>For coroners, medical examiners, and funeral directors</li>
                <li>For organ and tissue donation</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">6. Breach Notification</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We are required to notify you following a breach of your unsecured PHI. The notification will be provided in writing and will include information about what happened, what information was involved, what we are doing to investigate the breach, and what steps you can take to protect yourself.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">7. Changes to This Notice</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                We reserve the right to change this notice. We reserve the right to make the revised or changed notice effective for medical information we already have about you as well as any information we receive in the future. We will post a copy of the current notice in our facility and on our website.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">8. Complaints</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                If you believe your privacy rights have been violated, you may file a complaint with us or with the Secretary of the Department of Health and Human Services. To file a complaint with us, contact our Privacy Officer at the address and phone number listed below. All complaints must be submitted in writing.
              </p>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                You will not be penalized for filing a complaint.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">9. Contact Information</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                If you have any questions about this Notice of Privacy Practices, please contact:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-3">
                <p className="text-sm text-gray-700 font-semibold mb-1.5">Privacy Officer</p>
                <p className="text-sm text-gray-600">AhimsaGlobal Healthcare Systems</p>
                <p className="text-sm text-gray-600">Email: privacy@ahimsaglobal.com</p>
                <p className="text-sm text-gray-600">Phone: (555) 123-4567</p>
                <p className="text-sm text-gray-600 mt-1.5">Address: [Healthcare Facility Address]</p>
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">10. Acknowledgment</h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">
                By using our healthcare services, you acknowledge that you have received a copy of this Notice of Privacy Practices. We will make a good faith effort to obtain your written acknowledgment of receipt of this notice.
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-5 border-t border-gray-200 flex-shrink-0 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-colors shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

NoticeOfPrivacyPracticesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};

export default NoticeOfPrivacyPracticesModal;
