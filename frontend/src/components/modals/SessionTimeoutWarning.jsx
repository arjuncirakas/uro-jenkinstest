import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { X, Clock, AlertTriangle } from 'lucide-react';
import sessionTimeoutService from '../../services/sessionTimeoutService';

const SessionTimeoutWarning = ({ isOpen, onExtendSession }) => {
  const [timeRemaining, setTimeRemaining] = useState(5);

  useEffect(() => {
    if (!isOpen) return;

    // Update countdown every second
    const interval = setInterval(() => {
      const minutes = sessionTimeoutService.getMinutesRemaining();
      setTimeRemaining(minutes);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const handleExtendSession = () => {
    sessionTimeoutService.extendSession();
    if (onExtendSession) {
      onExtendSession();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-fadeIn">
      <div className="bg-white rounded-2xl border border-orange-200 max-w-lg w-full mx-4 transform transition-all animate-slideUp shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Session Timeout Warning
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Your session will expire soon
              </p>
            </div>
          </div>
          <button
            onClick={handleExtendSession}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-lg"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <div className="bg-orange-50 border-l-4 border-orange-500 rounded-r-lg p-5">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 mb-2">
                  Inactivity Detected
                </p>
                <p className="text-sm text-orange-800 leading-relaxed mb-3">
                  For security and compliance with HIPAA/GDPR regulations, your session will automatically expire after 30 minutes of inactivity.
                </p>
                <div className="bg-white rounded-lg p-3 border border-orange-200">
                  <p className="text-xs text-orange-700 mb-1">Time remaining:</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {timeRemaining} {timeRemaining === 1 ? 'minute' : 'minutes'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleExtendSession}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-lg hover:shadow-xl"
          >
            Continue Session
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            Click to extend your session and continue working
          </p>
        </div>
      </div>
    </div>
  );
};

SessionTimeoutWarning.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onExtendSession: PropTypes.func.isRequired
};

export default SessionTimeoutWarning;
