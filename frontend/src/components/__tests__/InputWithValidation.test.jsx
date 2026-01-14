import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InputWithValidation from '../InputWithValidation';

describe('InputWithValidation', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render input with label', () => {
      render(
        <InputWithValidation
          label="Test Label"
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    });

    it('should render input without label', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should display required indicator', () => {
      render(
        <InputWithValidation
          label="Test Label"
          name="test"
          value=""
          onChange={mockOnChange}
          required={true}
        />
      );
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not display required indicator when not required', () => {
      render(
        <InputWithValidation
          label="Test Label"
          name="test"
          value=""
          onChange={mockOnChange}
          required={false}
        />
      );
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should display placeholder', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          placeholder="Enter text"
        />
      );
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should display error message', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          error="This field is required"
        />
      );
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should apply error styling when error is present', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          error="Error message"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('border-red-300');
      expect(input.className).toContain('bg-red-50');
    });

    it('should not display help text when error is present', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          error="Error message"
          validationType="name"
        />
      );
      expect(screen.queryByText(/only letters/i)).not.toBeInTheDocument();
    });
  });

  describe('Help Text', () => {
    it('should display custom help text', () => {
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

    it('should display help text for name validation type', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="name"
        />
      );
      expect(screen.getByText(/only letters, spaces, hyphens/i)).toBeInTheDocument();
    });

    it('should display help text for phone validation type', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="phone"
        />
      );
      expect(screen.getByText(/numbers and formatting characters/i)).toBeInTheDocument();
    });

    it('should display help text for numeric validation type', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="numeric"
        />
      );
      expect(screen.getByText(/numbers and decimal point/i)).toBeInTheDocument();
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

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render email input', () => {
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

    it('should render password input', () => {
      render(
        <InputWithValidation
          name="test"
          type="password"
          value=""
          onChange={mockOnChange}
        />
      );
      const input = screen.getByLabelText(/password/i) || screen.getByDisplayValue('');
      expect(input.type).toBe('password');
    });
  });

  describe('Validation Patterns', () => {
    it('should apply name pattern', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="name"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.pattern).toBe('[a-zA-Z\\s\'-]*');
    });

    it('should apply phone pattern', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="phone"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.pattern).toBe('[0-9\\s\\-()+ ]*');
    });

    it('should apply numeric pattern', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="numeric"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.pattern).toBe('[0-9.]*');
    });

    it('should not apply pattern for email type', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="email"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.pattern).toBe('');
    });

    it('should not apply pattern for text type', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          validationType="text"
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.pattern).toBe('');
    });
  });

  describe('Icon Support', () => {
    it('should render icon when provided', () => {
      const MockIcon = () => <div data-testid="icon">Icon</div>;
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          icon={MockIcon}
        />
      );
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('should apply icon padding when icon is present', () => {
      const MockIcon = () => <div>Icon</div>;
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          icon={MockIcon}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('pl-10');
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
          disabled={true}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input.className).toContain('bg-gray-100');
      expect(input.className).toContain('cursor-not-allowed');
    });

    it('should enable input when disabled prop is false', () => {
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

  describe('Max Length', () => {
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
      expect(input.maxLength).toBe(10);
    });
  });

  describe('Value Handling', () => {
    it('should display value', () => {
      render(
        <InputWithValidation
          name="test"
          value="Test value"
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      expect(input.value).toBe('Test value');
    });

    it('should call onChange when value changes', () => {
      render(
        <InputWithValidation
          name="test"
          value=""
          onChange={mockOnChange}
        />
      );
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'New value' } });
      expect(mockOnChange).toHaveBeenCalled();
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
      expect(input.className).toContain('custom-class');
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
