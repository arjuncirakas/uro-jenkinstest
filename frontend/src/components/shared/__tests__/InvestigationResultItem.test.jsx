/**
 * Tests for InvestigationResultItem component
 * Ensures 100% coverage including all rendering scenarios and interactions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InvestigationResultItem from '../InvestigationResultItem';
import React from 'react';

describe('InvestigationResultItem', () => {
  const mockResult = {
    id: 1,
    date: '2025-01-15',
    result: '5.2 ng/mL',
    status: 'normal',
    referenceRange: '0-4 ng/mL',
    notes: 'Test notes',
    authorName: 'Dr. Smith',
    authorRole: 'Urologist',
    filePath: 'uploads/test.pdf'
  };

  const defaultProps = {
    result: mockResult,
    index: 0,
    totalResults: 3
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render result item with all fields', () => {
      render(<InvestigationResultItem {...defaultProps} />);
      
      expect(screen.getByText('Result #3')).toBeInTheDocument();
      expect(screen.getByText('5.2 ng/mL')).toBeInTheDocument();
      expect(screen.getByText('normal')).toBeInTheDocument();
      expect(screen.getByText('0-4 ng/mL')).toBeInTheDocument();
      expect(screen.getByText('Test notes')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('(Urologist)')).toBeInTheDocument();
    });

    it('should render with minimal data', () => {
      const minimalResult = {
        id: 1,
        result: '5.2'
      };
      
      render(
        <InvestigationResultItem
          result={minimalResult}
          index={0}
          totalResults={1}
        />
      );
      
      expect(screen.getByText('Result #1')).toBeInTheDocument();
      expect(screen.getByText('5.2')).toBeInTheDocument();
    });

    it('should format date correctly', () => {
      render(<InvestigationResultItem {...defaultProps} />);
      
      expect(screen.getByText(/15\/01\/2025/)).toBeInTheDocument();
    });

    it('should display N/A when date is missing', () => {
      const resultWithoutDate = { ...mockResult, date: null };
      render(
        <InvestigationResultItem
          result={resultWithoutDate}
          index={0}
          totalResults={1}
        />
      );
      
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('should render normal status with green badge', () => {
      render(<InvestigationResultItem {...defaultProps} />);
      
      const statusBadge = screen.getByText('normal');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('should render high status with red badge', () => {
      const highResult = { ...mockResult, status: 'high' };
      render(
        <InvestigationResultItem
          result={highResult}
          index={0}
          totalResults={1}
        />
      );
      
      const statusBadge = screen.getByText('high');
      expect(statusBadge).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('should render elevated status with red badge', () => {
      const elevatedResult = { ...mockResult, status: 'elevated' };
      render(
        <InvestigationResultItem
          result={elevatedResult}
          index={0}
          totalResults={1}
        />
      );
      
      const statusBadge = screen.getByText('elevated');
      expect(statusBadge).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('should render intermediate status with yellow badge', () => {
      const intermediateResult = { ...mockResult, status: 'intermediate' };
      render(
        <InvestigationResultItem
          result={intermediateResult}
          index={0}
          totalResults={1}
        />
      );
      
      const statusBadge = screen.getByText('intermediate');
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-700');
    });

    it('should render other status with blue badge', () => {
      const otherResult = { ...mockResult, status: 'other' };
      render(
        <InvestigationResultItem
          result={otherResult}
          index={0}
          totalResults={1}
        />
      );
      
      const statusBadge = screen.getByText('other');
      expect(statusBadge).toHaveClass('bg-blue-100', 'text-blue-700');
    });

    it('should not render status badge when status is missing', () => {
      const resultWithoutStatus = { ...mockResult };
      delete resultWithoutStatus.status;
      
      render(
        <InvestigationResultItem
          result={resultWithoutStatus}
          index={0}
          totalResults={1}
        />
      );
      
      expect(screen.queryByText('normal')).not.toBeInTheDocument();
    });
  });

  describe('View File Button', () => {
    it('should render view file button when filePath and onViewFile are provided', () => {
      const onViewFile = vi.fn();
      render(
        <InvestigationResultItem
          {...defaultProps}
          onViewFile={onViewFile}
        />
      );
      
      const viewButton = screen.getByTitle('View file');
      expect(viewButton).toBeInTheDocument();
    });

    it('should not render view file button when filePath is missing', () => {
      const resultWithoutFile = { ...mockResult };
      delete resultWithoutFile.filePath;
      
      render(
        <InvestigationResultItem
          result={resultWithoutFile}
          index={0}
          totalResults={1}
          onViewFile={vi.fn()}
        />
      );
      
      expect(screen.queryByTitle('View file')).not.toBeInTheDocument();
    });

    it('should not render view file button when onViewFile is missing', () => {
      render(<InvestigationResultItem {...defaultProps} />);
      
      expect(screen.queryByTitle('View file')).not.toBeInTheDocument();
    });

    it('should call onViewFile with file URL when button is clicked', () => {
      const onViewFile = vi.fn();
      render(
        <InvestigationResultItem
          {...defaultProps}
          onViewFile={onViewFile}
        />
      );
      
      const viewButton = screen.getByTitle('View file');
      fireEvent.click(viewButton);
      
      expect(onViewFile).toHaveBeenCalledWith(
        expect.stringContaining('uploads/test.pdf')
      );
    });

    it('should handle HTTP file paths', () => {
      const onViewFile = vi.fn();
      const httpResult = {
        ...mockResult,
        filePath: 'https://example.com/file.pdf'
      };
      
      render(
        <InvestigationResultItem
          result={httpResult}
          index={0}
          totalResults={1}
          onViewFile={onViewFile}
        />
      );
      
      const viewButton = screen.getByTitle('View file');
      fireEvent.click(viewButton);
      
      expect(onViewFile).toHaveBeenCalledWith('https://example.com/file.pdf');
    });
  });

  describe('Optional Fields', () => {
    it('should not render author info when missing', () => {
      const resultWithoutAuthor = { ...mockResult };
      delete resultWithoutAuthor.authorName;
      delete resultWithoutAuthor.authorRole;
      
      render(
        <InvestigationResultItem
          result={resultWithoutAuthor}
          index={0}
          totalResults={1}
        />
      );
      
      expect(screen.queryByText(/Added by/)).not.toBeInTheDocument();
    });

    it('should render author name without role', () => {
      const resultWithNameOnly = {
        ...mockResult,
        authorName: 'Dr. Smith'
      };
      delete resultWithNameOnly.authorRole;
      
      render(
        <InvestigationResultItem
          result={resultWithNameOnly}
          index={0}
          totalResults={1}
        />
      );
      
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
    });

    it('should not render reference range when N/A', () => {
      const resultWithNA = {
        ...mockResult,
        referenceRange: 'N/A'
      };
      
      render(
        <InvestigationResultItem
          result={resultWithNA}
          index={0}
          totalResults={1}
        />
      );
      
      expect(screen.queryByText(/Reference Range/)).not.toBeInTheDocument();
    });

    it('should not render notes when missing', () => {
      const resultWithoutNotes = { ...mockResult };
      delete resultWithoutNotes.notes;
      
      render(
        <InvestigationResultItem
          result={resultWithoutNotes}
          index={0}
          totalResults={1}
        />
      );
      
      expect(screen.queryByText(/Notes/)).not.toBeInTheDocument();
    });
  });

  describe('Result Numbering', () => {
    it('should calculate result number correctly', () => {
      render(
        <InvestigationResultItem
          result={mockResult}
          index={0}
          totalResults={5}
        />
      );
      
      expect(screen.getByText('Result #5')).toBeInTheDocument();
    });

    it('should calculate result number for middle item', () => {
      render(
        <InvestigationResultItem
          result={mockResult}
          index={2}
          totalResults={5}
        />
      );
      
      expect(screen.getByText('Result #3')).toBeInTheDocument();
    });
  });
});

