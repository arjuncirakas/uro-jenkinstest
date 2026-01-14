import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Info } from 'lucide-react';

// Info explanations mapping
const infoExplanations = {
  'successful-logins': {
    title: 'Successful Logins (30 days)',
    description: 'This shows the total number of successful login attempts in the last 30 days. Successful logins occur when users correctly authenticate with their credentials. This metric helps track normal user activity and system usage patterns.'
  },
  'account-lockouts': {
    title: 'Account Lockouts (30 days)',
    description: 'This shows how many times user accounts were locked due to multiple failed login attempts in the last 30 days. Account lockouts are a security measure to prevent brute-force attacks. A high number might indicate security threats or users having trouble with their passwords.'
  },
  'suspicious-activities': {
    title: 'Suspicious Activities (30 days)',
    description: 'This shows the number of failed access attempts to Protected Health Information (PHI) in the last 30 days. These are unauthorized attempts to access patient data that were blocked. A high number indicates potential security threats or unauthorized access attempts.'
  },
  'login-success-rate': {
    title: 'Login Success Rate (30 days)',
    description: 'This shows the percentage of successful login attempts out of total login attempts (successful + failed) in the last 30 days. A high success rate indicates good user experience and security, while a low rate might indicate password issues or security threats.'
  },
  'failed-logins': {
    title: 'Failed Login Attempts (30 days)',
    description: 'This shows the total number of failed login attempts in the last 30 days. Failed attempts occur when someone tries to log in with incorrect credentials. A high number might indicate security concerns or users having trouble with their passwords.'
  },
  'phi-access': {
    title: 'PHI Access Events (30 days)',
    description: 'PHI (Protected Health Information) access events track how many times patient health data was accessed in the last 30 days. This includes viewing patient records, medical history, test results, and other sensitive health information. All access is logged for compliance and security purposes.'
  },
  'unique-users-phi': {
    title: 'Unique Users Accessing PHI (30 days)',
    description: 'This shows how many different users have accessed Protected Health Information (PHI) in the last 30 days. This helps track who has been viewing patient data and ensures only authorized personnel are accessing sensitive information.'
  },
  'data-exports': {
    title: 'Data Exports (30 days)',
    description: 'This counts how many times data has been exported from the system in the last 30 days. Data exports include downloading patient information, reports, or other data. All exports are logged to track data sharing and ensure compliance with data protection regulations.'
  },
  'total-verified-users': {
    title: 'Total Verified Users',
    description: 'This is the total number of users who have completed email verification. Verified users have confirmed their email addresses and can access the system. This helps ensure that only legitimate users with valid email addresses can use the system.'
  },
  'data-classification': {
    title: 'Data Classification Levels',
    description: 'Data is classified into 5 levels based on sensitivity: Level 1 (Non-Sensitive) - Public information; Level 2 (Internal) - Employee data; Level 3 (Sensitive) - Patient demographics; Level 4 (Highly Sensitive) - Medical diagnoses; Level 5 (Critical) - Full medical records. This classification helps ensure appropriate security controls are applied to protect sensitive data according to GDPR and HIPAA requirements.'
  },
  'total-tables': {
    title: 'Total Tables',
    description: 'This shows the total number of database tables in the system. Each table stores different types of information - for example, one table might store patient information, another might store appointments, etc. This helps understand the overall data structure.'
  },
  'total-records': {
    title: 'Total Records',
    description: 'This is the total number of records stored across all database tables. A record is a single entry - for example, one patient record, one appointment record, etc. This gives you an idea of the total amount of data stored in the system.'
  },
  'total-size': {
    title: 'Total Size',
    description: 'This shows the total amount of storage space used by all database tables. It includes all data, indexes, and other database structures. This helps monitor storage usage and plan for future capacity needs.'
  },
  'categories': {
    title: 'Categories',
    description: 'This shows how many different data categories exist in the system. Data is organized into categories like Medical/PHI (patient health information), Demographic (user information), Operational (appointments, bookings), and System Usage (logs, audit trails).'
  },
  'total-tables-monitored': {
    title: 'Total Tables Monitored',
    description: 'This shows how many database tables are being monitored for data retention. Retention monitoring tracks how long data has been stored and when it should be deleted according to retention policies (for example, patient records might be kept for 10 years).'
  },
  'approaching-deletion': {
    title: 'Approaching Deletion',
    description: 'This shows how many tables have data that is approaching its deletion date based on retention policies. When data reaches its retention limit, it should be deleted or archived to comply with data protection regulations and free up storage space.'
  }
};

// Helper function to calculate tooltip position
const calculateTooltipPosition = (buttonRect, viewportWidth, tooltipWidth, padding) => {
  const spaceOnRight = viewportWidth - buttonRect.right;
  const spaceOnLeft = buttonRect.left;
  const wouldOverflowRight = (spaceOnRight + buttonRect.width) < (tooltipWidth + padding);
  const wouldOverflowLeft = (spaceOnLeft + buttonRect.width) < (tooltipWidth + padding);

  if (wouldOverflowRight && !wouldOverflowLeft) {
    return 'left';
  }
  if (wouldOverflowLeft && !wouldOverflowRight) {
    return 'right';
  }
  if (wouldOverflowRight && wouldOverflowLeft) {
    return spaceOnRight >= spaceOnLeft ? 'right' : 'left';
  }
  return 'right';
};

// Get info explanation for tooltip
const getInfoExplanation = (key) => {
  return infoExplanations[key] || null;
};

// Tooltip component - dynamically positioned to avoid viewport overflow
const InfoTooltip = ({ infoKey, ariaLabel, forcePosition = null }) => {
  const explanation = getInfoExplanation(infoKey);
  const [position, setPosition] = useState(forcePosition || 'right');
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (forcePosition) {
      setPosition(forcePosition);
      return;
    }

    if (!buttonRef.current || !containerRef.current) return;

    const updatePosition = () => {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const tooltipWidth = 320;
      const padding = 16;
      const newPosition = calculateTooltipPosition(buttonRect, viewportWidth, tooltipWidth, padding);
      setPosition(newPosition);
    };

    const handleMouseEnter = () => {
      requestAnimationFrame(() => {
        setTimeout(updatePosition, 0);
      });
    };

    const groupElement = containerRef.current;
    if (groupElement) {
      groupElement.addEventListener('mouseenter', handleMouseEnter);
      window.addEventListener('resize', updatePosition);
      return () => {
        groupElement.removeEventListener('mouseenter', handleMouseEnter);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [forcePosition]);

  if (!explanation) return null;

  return (
    <div ref={containerRef} className="relative inline-block group">
      <button
        ref={buttonRef}
        className="text-teal-600 hover:text-teal-700 transition-colors cursor-pointer focus:outline-none"
        aria-label={ariaLabel}
        type="button"
      >
        <Info className="h-4 w-4" />
      </button>
      <div
        ref={tooltipRef}
        className={`absolute bottom-full mb-2 w-80 max-w-[min(20rem,calc(100vw-3rem))] p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] pointer-events-none whitespace-normal ${
          position === 'right' ? 'right-0' : 'left-0'
        }`}
      >
        <div className="font-semibold mb-1.5 text-sm">{explanation.title}</div>
        <div className="text-gray-300 leading-relaxed break-words">{explanation.description}</div>
        <div className={`absolute top-full -mt-1 border-4 border-transparent border-t-gray-900 ${
          position === 'right' ? 'right-4' : 'left-4'
        }`}></div>
      </div>
    </div>
  );
};

InfoTooltip.propTypes = {
  infoKey: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string,
  forcePosition: PropTypes.string
};

export default InfoTooltip;
