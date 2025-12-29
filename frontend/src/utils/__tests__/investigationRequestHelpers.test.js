/**
 * Tests for investigationRequestHelpers utility functions
 * Ensures 100% coverage including all edge cases
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createRequestFromMatchOrTest,
  isPSATest,
  formatResultDate,
  getStatusBadgeClassName,
  createRequestFromClinicalInvestigation,
  prepareEditResultData
} from '../investigationRequestHelpers';

describe('investigationRequestHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRequestFromMatchOrTest', () => {
    const mockCreateFromClinical = vi.fn((req) => ({ ...req, transformed: true }));

    it('should return transformed request when matching request exists', () => {
      const matchingRequest = { id: 1, investigationName: 'MRI' };
      const result = createRequestFromMatchOrTest(matchingRequest, 'Test', null, mockCreateFromClinical);
      expect(mockCreateFromClinical).toHaveBeenCalledWith(matchingRequest);
      expect(result.transformed).toBe(true);
    });

    it('should create request from testData when no matching request', () => {
      const testData = { testName: 'MRI', test_name: 'MRI' };
      const result = createRequestFromMatchOrTest(null, 'Test', testData, mockCreateFromClinical);
      expect(result.investigationName).toBe('MRI');
      expect(result.testName).toBe('MRI');
      expect(result.isClinicalInvestigation).toBe(false);
    });

    it('should create request from testName string when no testData', () => {
      const result = createRequestFromMatchOrTest(null, 'MRI', null, mockCreateFromClinical);
      expect(result.investigationName).toBe('MRI');
      expect(result.testName).toBe('MRI');
    });

    it('should handle testNameOrData as object', () => {
      const testNameOrData = { testName: 'TRUS' };
      const result = createRequestFromMatchOrTest(null, testNameOrData, null, mockCreateFromClinical);
      expect(result.investigationName).toBe('TRUS');
    });

    it('should handle empty testNameOrData', () => {
      const result = createRequestFromMatchOrTest(null, '', null, mockCreateFromClinical);
      expect(result.investigationName).toBe('');
    });
  });

  describe('isPSATest', () => {
    it('should return false for null input', () => {
      expect(isPSATest(null)).toBe(false);
    });

    it('should return false for undefined input', () => {
      expect(isPSATest(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isPSATest('')).toBe(false);
    });

    it('should return true for PSA', () => {
      expect(isPSATest('PSA')).toBe(true);
    });

    it('should return true for PSA TOTAL', () => {
      expect(isPSATest('PSA TOTAL')).toBe(true);
    });

    it('should return true for PSA FREE', () => {
      expect(isPSATest('PSA FREE')).toBe(true);
    });

    it('should return true for PSA RATIO', () => {
      expect(isPSATest('PSA RATIO')).toBe(true);
    });

    it('should return true for PSA VELOCITY', () => {
      expect(isPSATest('PSA VELOCITY')).toBe(true);
    });

    it('should return true for PSA DENSITY', () => {
      expect(isPSATest('PSA DENSITY')).toBe(true);
    });

    it('should return true for test containing PSA', () => {
      expect(isPSATest('PSA Test')).toBe(true);
    });

    it('should return false for non-PSA test', () => {
      expect(isPSATest('MRI')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isPSATest('psa')).toBe(true);
      expect(isPSATest('Psa')).toBe(true);
    });
  });

  describe('formatResultDate', () => {
    it('should return N/A for null input', () => {
      expect(formatResultDate(null)).toBe('N/A');
    });

    it('should return N/A for undefined input', () => {
      expect(formatResultDate(undefined)).toBe('N/A');
    });

    it('should format valid date string', () => {
      const result = formatResultDate('2025-01-15');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should format Date object', () => {
      const date = new Date('2025-01-15');
      const result = formatResultDate(date);
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should return N/A for invalid date', () => {
      const result = formatResultDate('invalid-date');
      expect(result).toBe('N/A');
    });
  });

  describe('getStatusBadgeClassName', () => {
    it('should return empty string for null status', () => {
      expect(getStatusBadgeClassName(null)).toBe('');
    });

    it('should return empty string for undefined status', () => {
      expect(getStatusBadgeClassName(undefined)).toBe('');
    });

    it('should return green classes for normal status', () => {
      const result = getStatusBadgeClassName('normal');
      expect(result).toBe('bg-green-100 text-green-700');
    });

    it('should return red classes for high status', () => {
      const result = getStatusBadgeClassName('high');
      expect(result).toBe('bg-red-100 text-red-700');
    });

    it('should return red classes for elevated status', () => {
      const result = getStatusBadgeClassName('elevated');
      expect(result).toBe('bg-red-100 text-red-700');
    });

    it('should return yellow classes for intermediate status', () => {
      const result = getStatusBadgeClassName('intermediate');
      expect(result).toBe('bg-yellow-100 text-yellow-700');
    });

    it('should return blue classes for other status', () => {
      const result = getStatusBadgeClassName('other');
      expect(result).toBe('bg-blue-100 text-blue-700');
    });

    it('should handle case insensitivity', () => {
      expect(getStatusBadgeClassName('NORMAL')).toBe('bg-green-100 text-green-700');
      expect(getStatusBadgeClassName('High')).toBe('bg-red-100 text-red-700');
    });
  });

  describe('createRequestFromClinicalInvestigation', () => {
    it('should return request as-is when not clinical investigation', () => {
      const request = { id: 1, investigationName: 'MRI' };
      const result = createRequestFromClinicalInvestigation(request);
      expect(result).toEqual(request);
    });

    it('should transform clinical investigation request', () => {
      const request = {
        isClinicalInvestigation: true,
        noteId: 123,
        investigationName: 'MRI',
        investigation_name: 'MRI',
        investigationType: 'imaging',
        investigation_type: 'imaging',
        scheduledDate: '2025-01-15',
        scheduled_date: '2025-01-15',
        scheduledTime: '10:00',
        scheduled_time: '10:00',
        status: 'pending',
        notes: 'Test notes'
      };
      const result = createRequestFromClinicalInvestigation(request);
      expect(result.id).toBe(123);
      expect(result.isClinicalInvestigation).toBe(true);
      expect(result.investigationName).toBe('MRI');
    });
  });

  describe('prepareEditResultData', () => {
    it('should prepare data from test object with testName', () => {
      const test = {
        id: 1,
        testName: 'MRI',
        result: 'Normal',
        notes: 'Test notes',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      };
      const result = prepareEditResultData(test);
      expect(result).toEqual({
        id: 1,
        testName: 'MRI',
        result: 'Normal',
        notes: 'Test notes',
        filePath: 'uploads/test.pdf',
        fileName: 'test.pdf'
      });
    });

    it('should prepare data from test object with test_name', () => {
      const test = {
        id: 1,
        test_name: 'MRI',
        result: 'Normal',
        file_path: 'uploads/test.pdf',
        file_name: 'test.pdf'
      };
      const result = prepareEditResultData(test);
      expect(result.testName).toBe('MRI');
      expect(result.filePath).toBe('uploads/test.pdf');
    });

    it('should use selectedTestName override', () => {
      const test = {
        id: 1,
        testName: 'MRI',
        result: 'Normal'
      };
      const result = prepareEditResultData(test, 'TRUS');
      expect(result.testName).toBe('TRUS');
    });

    it('should handle missing fields', () => {
      const test = { id: 1 };
      const result = prepareEditResultData(test);
      expect(result.id).toBe(1);
      expect(result.testName).toBeUndefined();
    });
  });
});

