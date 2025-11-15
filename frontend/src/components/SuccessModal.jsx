import React from 'react';
import { IoClose, IoCheckmarkCircle, IoCalendar, IoTime, IoRefresh, IoPerson } from 'react-icons/io5';
import { useEscapeKey } from '../utils/useEscapeKey';

const SuccessModal = ({ isOpen, onClose, title, message, appointmentDetails }) => {
  // Handle Escape key to close modal
  const [showConfirmModal, closeConfirmModal] = useEscapeKey(onClose, isOpen);
  // Not using confirm modal for simple modals without data

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden transform transition-all animate-slideUp shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
          aria-label="Close modal"
        >
          <IoClose className="text-2xl" />
        </button>

        {/* Icon Section */}
        <div className="pt-8 pb-4 px-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-50 mb-4">
            <IoCheckmarkCircle className="text-5xl text-teal-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            {title || 'Success!'}
          </h2>
          <p className="text-gray-700 font-medium mb-4">
            {message || 'Operation completed successfully!'}
          </p>
        </div>

        {/* Appointment Details Section */}
        {appointmentDetails && (
          <div className="px-6 pb-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Follow-up Appointments Scheduled</h3>
              <div className="space-y-2.5">
                <div className="flex items-start">
                  <IoCalendar className="text-teal-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">First Appointment</div>
                    <div className="text-sm font-medium text-gray-900">{appointmentDetails.date}</div>
                  </div>
                </div>
                <div className="flex items-start">
                  <IoTime className="text-teal-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Time</div>
                    <div className="text-sm font-medium text-gray-900">{appointmentDetails.time}</div>
                  </div>
                </div>
                {appointmentDetails.urologist && (
                  <div className="flex items-start">
                    <IoPerson className="text-teal-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-gray-500">Urologist</div>
                      <div className="text-sm font-medium text-gray-900">{appointmentDetails.urologist}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start">
                  <IoRefresh className="text-teal-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500">Frequency</div>
                    <div className="text-sm font-medium text-gray-900">{appointmentDetails.frequency}</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">Total Appointments</div>
                  <div className="text-sm font-medium text-gray-900">{appointmentDetails.total} appointments scheduled for the next 12 months</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 active:bg-teal-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
