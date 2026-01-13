import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import InputWithValidation from '../InputWithValidation';
import { AlertCircle, Info, User } from 'lucide-react';

describe('InputWithValidation', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render input with label', () => {
      render(
        <InputWithValidation
          label="Test Label"
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      expect(screen.getByText('Test Label')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render input without label', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      expect(screen.queryByText('Test Label')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should display required asterisk when required', () => {
      render(
        <InputWithValidation
          label="Required Field"
          name="test"
          value=""
          onChange={mockOnChange}
          required
        />
      );
      const label = screen.getByText('Required Field');
      expect(label.querySelector('.text-red-500')).toBeInTheDocument();
    });

    it('should not display required asterisk when not required', () => {
      render(
        <InputWithValidation
          label="Optional Field"
          name="test"
          value=""
          onChange={mockOnChange}
          required={false}
        />
      );
      const label = screen.getByText('Optional Field');
      expect(label.querySelector('.text-red-500')).not.toBeInTheDocument();
    });
  });

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.type).toBe('text');
    });

    it('should render email input when type is email', () => {
      render(
        <InputWithValidation
          name="test"
          type="email"
          value=""
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.type).toBe('email');
    });

    it('should render password input when type is password', () => {
      render(
        <InputWithValidation
          name="test"
          type="password"
          value=""
          onChange={mockOnChange}
        />
      );
      const input = screen.getByLabelText(/test/i) || document.querySelector('input[type="password"]');
      expect(input.type).toBe('password');
    });
  });

  describe('Value and onChange', () => {
    it('should display value', () => {
      render(
        <InputWithValidation
          name="test"
          value="test value"
          onChange={mockOnChange}
        />
      );
      expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
    });

    it('should call onChange when input changes', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });
      expect(mockOnChange).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error is provided', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          error="This is an error"
        />
      );
      expect(screen.getByText('This is an error')).toBeInTheDocument();
      expect(screen.getByText('This is an error').closest('p')).toHaveClass('text-red-600');
    });

    it('should apply error styling when error exists', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          error="Error message"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-300', 'bg-red-50');
    });

    it('should not display error when error is not provided', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          disabled
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveClass('bg-gray-100', 'cursor-not-allowed');
    });

    it('should not disable input when disabled prop is false', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          disabled={false}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).not.toBeDisabled();
    });
  });

  describe('Placeholder', () => {
    it('should display placeholder', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          placeholder="Enter text here"
        />
      );
      expect(screen.getByPlaceholderText('Enter text here')).toBeInTheDocument();
    });
  });

  describe('MaxLength', () => {
    it('should apply maxLength attribute', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          maxLength={10}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '10');
    });
  });

  describe('Icon Support', () => {
    it('should render icon when provided', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          icon={User}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10');
    });

    it('should not apply icon padding when icon is not provided', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('pl-10');
    });
  });

  describe('Validation Types', () => {
    it('should apply name pattern for name validation', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="name"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', "[a-zA-Z\\s'-]*");
    });

    it('should apply phone pattern for phone validation', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="phone"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '[0-9\\s\\-()+ ]*');
    });

    it('should apply numeric pattern for numeric validation', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="numeric"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('pattern', '[0-9.]*');
    });

    it('should not apply pattern for email validation', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="email"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('pattern');
    });

    it('should not apply pattern for text validation', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="text"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveAttribute('pattern');
    });
  });

  describe('Help Text', () => {
    it('should display custom help text when provided', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          helpText="Custom help text"
        />
      );
      expect(screen.getByText('Custom help text')).toBeInTheDocument();
    });

    it('should display default help text for name validation', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="name"
        />
      );
      expect(screen.getByText('Only letters, spaces, hyphens, and apostrophes allowed')).toBeInTheDocument();
    });

    it('should display default help text for phone validation', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="phone"
        />
      );
      expect(screen.getByText('Only numbers and formatting characters allowed')).toBeInTheDocument();
    });

    it('should display default help text for numeric validation', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="numeric"
        />
      );
      expect(screen.getByText('Only numbers and decimal point allowed')).toBeInTheDocument();
    });

    it('should not display help text when error is present', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          error="Error message"
          helpText="Help text"
        />
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Help text')).not.toBeInTheDocument();
    });

    it('should not display help text for text validation type', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="text"
        />
      );
      expect(screen.queryByText(/only/i)).not.toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          className="custom-class"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
    });
  });

  describe('Additional Props', () => {
    it('should pass through additional props to input', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          data-testid="custom-input"
          aria-label="Custom label"
        />
      );
      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('aria-label', 'Custom label');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null value', () => {
      render(
        <InputWithValidation
          name="test"
          value={null}
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.value).toBe('');
    });

    it('should handle undefined value', () => {
      render(
        <InputWithValidation
          name="test"
          value={undefined}
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.value).toBe('');
    });

    it('should handle empty string value', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.value).toBe('');
    });
  });
});


















