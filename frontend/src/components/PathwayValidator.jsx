import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, XCircle, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { guidelineService } from '../services/guidelineService';

/**
 * Pathway Validator Component
 * Validates pathway transitions before submission
 */
const PathwayValidator = React.memo(({ 
  patientId, 
  fromPathway, 
  toPathway,
  onValidationChange 
}) => {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const previousValues = useRef({ patientId, fromPathway, toPathway });

  useEffect(() => {
    // Only validate if pathway-related values actually changed
    const hasChanged = 
      previousValues.current.patientId !== patientId ||
      previousValues.current.fromPathway !== fromPathway ||
      previousValues.current.toPathway !== toPathway;

    if (!hasChanged) {
      return;
    }

    // Update ref with current values
    previousValues.current = { patientId, fromPathway, toPathway };

    if (!patientId || !toPathway) {
      setValidation(null);
      return;
    }

    const validatePathway = async () => {
      setLoading(true);
      try {
        const result = await guidelineService.validatePathway(
          patientId,
          fromPathway,
          toPathway
        );

        if (result.success) {
          setValidation(result.data);
          if (onValidationChange) {
            onValidationChange(result.data);
          }
        }
      } catch (error) {
        console.error('Error validating pathway:', error);
      } finally {
        setLoading(false);
      }
    };

    validatePathway();
  }, [patientId, fromPathway, toPathway, onValidationChange]);

  // Show loading state only if we don't have previous validation data
  if (loading && !validation) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-blue-700">Validating pathway transition...</span>
        </div>
      </div>
    );
  }

  // If no validation data and not loading, don't show anything
  if (!validation && !loading) {
    return null;
  }

  // If loading but we have previous validation, show previous validation to prevent jumping
  // Continue to show previous validation below

  if (!validation) {
    return null;
  }

  const hasErrors = validation.errors && validation.errors.length > 0;
  const hasWarnings = validation.warnings && validation.warnings.length > 0;
  const hasRequiredActions = validation.requiredActions && validation.requiredActions.length > 0;

  if (validation.isValid && !hasWarnings && !hasRequiredActions) {
    return (
      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">Pathway transition is valid</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Validation Status Header - Only show if invalid */}
      {!validation.isValid && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start space-x-2">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-1">Pathway Transition Invalid</h4>
              <p className="text-sm text-red-700">
                This pathway transition cannot be completed due to missing requirements.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Errors Section - Show first if there are errors */}
      {hasErrors && (
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-start space-x-2">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-2">Errors</h4>
              <ul className="space-y-1.5">
                {validation.errors.map((error, index) => (
                  <li key={index} className="text-sm text-red-700 flex items-start">
                    <span className="mr-2 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Warnings Section - Show after errors */}
      {hasWarnings && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">Warnings</h4>
              <ul className="space-y-1.5">
                {validation.warnings.map((warning, index) => (
                  <li key={index} className="text-sm text-yellow-700 flex items-start">
                    <span className="mr-2 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Required Actions Section - Show last */}
      {hasRequiredActions && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Required Actions</h4>
              <ul className="space-y-1.5">
                {validation.requiredActions.map((action, index) => (
                  <li key={index} className="text-sm text-blue-700 flex items-start">
                    <span className="mr-2 mt-0.5">•</span>
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
});

PathwayValidator.displayName = 'PathwayValidator';

export default PathwayValidator;

