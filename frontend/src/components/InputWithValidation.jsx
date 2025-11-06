import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

/**
 * Reusable Input Component with Built-in Validation
 * Handles validation, error display, and input restrictions
 */
const InputWithValidation = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  validationType = 'text', // 'name', 'phone', 'email', 'numeric', 'text'
  helpText,
  maxLength,
  icon: Icon,
  className = '',
  ...props
}) => {
  
  const getInputClassName = () => {
    const baseClasses = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent';
    const errorClasses = error ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-white';
    const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed' : '';
    const iconClasses = Icon ? 'pl-10' : '';
    
    return `${baseClasses} ${errorClasses} ${disabledClasses} ${iconClasses} ${className}`;
  };

  const getValidationPattern = () => {
    switch (validationType) {
      case 'name':
        return '[a-zA-Z\\s\'-]*';
      case 'phone':
        return '[0-9\\s\\-()+ ]*';
      case 'numeric':
        return '[0-9.]*';
      case 'email':
        return undefined; // Let browser handle
      default:
        return undefined;
    }
  };

  const getHelpText = () => {
    if (helpText) return helpText;
    
    switch (validationType) {
      case 'name':
        return 'Only letters, spaces, hyphens, and apostrophes allowed';
      case 'phone':
        return 'Only numbers and formatting characters allowed';
      case 'numeric':
        return 'Only numbers and decimal point allowed';
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <Icon className="h-5 w-5" />
          </div>
        )}
        
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          pattern={getValidationPattern()}
          className={getInputClassName()}
          {...props}
        />
      </div>
      
      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
          {error}
        </p>
      )}
      
      {/* Help Text */}
      {!error && getHelpText() && (
        <p className="mt-1 text-xs text-gray-500 flex items-center">
          <Info className="h-3 w-3 mr-1 flex-shrink-0" />
          {getHelpText()}
        </p>
      )}
    </div>
  );
};

export default InputWithValidation;








