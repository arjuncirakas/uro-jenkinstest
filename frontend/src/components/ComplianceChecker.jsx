import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { guidelineService } from '../services/guidelineService';

/**
 * Compliance Checker Component
 * Displays compliance warnings and errors for clinical actions
 */
const ComplianceChecker = ({ 
  patientId, 
  checkType, 
  checkData, 
  onValidationChange 
}) => {
  const [compliance, setCompliance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientId || !checkType) {
      setCompliance(null);
      return;
    }

    const checkCompliance = async () => {
      setLoading(true);
      try {
        let result;
        
        if (checkType === 'pathway') {
          result = await guidelineService.checkPathwayCompliance(
            patientId,
            checkData?.fromPathway,
            checkData?.toPathway
          );
        } else if (checkType === 'investigation') {
          result = await guidelineService.checkInvestigationCompliance(
            patientId,
            checkData?.investigationType,
            checkData?.investigationName
          );
        }

        if (result.success) {
          setCompliance(result.data);
          if (onValidationChange) {
            onValidationChange(result.data);
          }
        }
      } catch (error) {
        console.error('Error checking compliance:', error);
      } finally {
        setLoading(false);
      }
    };

    checkCompliance();
  }, [patientId, checkType, checkData, onValidationChange]);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">Checking compliance...</span>
        </div>
      </div>
    );
  }

  if (!compliance) {
    return null;
  }

  const hasErrors = compliance.errors && compliance.errors.length > 0;
  const hasWarnings = compliance.warnings && compliance.warnings.length > 0;
  const hasRequiredActions = compliance.requiredActions && compliance.requiredActions.length > 0;

  if (!hasErrors && !hasWarnings && !hasRequiredActions) {
    return (
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">Compliant with guidelines</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Errors */}
      {hasErrors && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start space-x-2">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Compliance Errors</h4>
              <ul className="space-y-1">
                {compliance.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700">{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">Warnings</h4>
              <ul className="space-y-1">
                {compliance.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700">{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Required Actions */}
      {hasRequiredActions && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Required Actions</h4>
              <ul className="space-y-1">
                {compliance.requiredActions.map((action, index) => (
                  <li key={index} className="text-sm text-blue-700 flex items-start">
                    <span className="mr-2">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceChecker;




