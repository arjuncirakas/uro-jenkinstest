/**
 * Tests for PSA status by age utilities
 * Tests all functions to achieve 100% coverage
 */
import { describe, it, expect } from '@jest/globals';
import * as psaStatusByAge from '../utils/psaStatusByAge.js';

describe('PSA Status By Age', () => {
  describe('getPSAStatusByAge', () => {
    it('should return Normal for invalid PSA values', () => {
      expect(psaStatusByAge.getPSAStatusByAge(null, 50)).toBe('Normal');
      expect(psaStatusByAge.getPSAStatusByAge(undefined, 50)).toBe('Normal');
      expect(psaStatusByAge.getPSAStatusByAge('invalid', 50)).toBe('Normal');
      expect(psaStatusByAge.getPSAStatusByAge('', 50)).toBe('Normal');
    });

    it('should use standard 4.0 threshold when age is not available', () => {
      expect(psaStatusByAge.getPSAStatusByAge(5.0, null)).toBe('High');
      expect(psaStatusByAge.getPSAStatusByAge(3.0, null)).toBe('Normal');
      expect(psaStatusByAge.getPSAStatusByAge(-1.0, null)).toBe('Low');
    });

    it('should use standard 4.0 threshold when age is less than 10', () => {
      expect(psaStatusByAge.getPSAStatusByAge(5.0, 5)).toBe('High');
      expect(psaStatusByAge.getPSAStatusByAge(3.0, 8)).toBe('Normal');
    });

    describe('Age 10-39', () => {
      it('should return High for PSA > 2.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(2.1, 25)).toBe('High');
        expect(psaStatusByAge.getPSAStatusByAge(3.0, 35)).toBe('High');
      });

      it('should return Elevated for PSA > 1.5 and <= 2.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(1.6, 25)).toBe('Elevated');
        expect(psaStatusByAge.getPSAStatusByAge(2.0, 35)).toBe('Elevated');
      });

      it('should return Normal for PSA <= 1.5', () => {
        expect(psaStatusByAge.getPSAStatusByAge(1.5, 25)).toBe('Normal');
        expect(psaStatusByAge.getPSAStatusByAge(1.0, 35)).toBe('Normal');
      });

      it('should return Low for negative PSA', () => {
        expect(psaStatusByAge.getPSAStatusByAge(-1.0, 25)).toBe('Low');
      });
    });

    describe('Age 40-49', () => {
      it('should return High for PSA > 2.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(2.1, 45)).toBe('High');
        expect(psaStatusByAge.getPSAStatusByAge(3.0, 40)).toBe('High');
      });

      it('should return Normal for PSA <= 2.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(2.0, 45)).toBe('Normal');
        expect(psaStatusByAge.getPSAStatusByAge(1.5, 40)).toBe('Normal');
      });

      it('should return Low for negative PSA', () => {
        expect(psaStatusByAge.getPSAStatusByAge(-1.0, 45)).toBe('Low');
      });
    });

    describe('Age 50-59', () => {
      it('should return High for PSA > 3.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(3.1, 55)).toBe('High');
        expect(psaStatusByAge.getPSAStatusByAge(4.0, 50)).toBe('High');
      });

      it('should return Normal for PSA <= 3.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(3.0, 55)).toBe('Normal');
        expect(psaStatusByAge.getPSAStatusByAge(2.5, 50)).toBe('Normal');
      });

      it('should return Low for negative PSA', () => {
        expect(psaStatusByAge.getPSAStatusByAge(-1.0, 55)).toBe('Low');
      });
    });

    describe('Age 60-69', () => {
      it('should return High for PSA > 4.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(4.1, 65)).toBe('High');
        expect(psaStatusByAge.getPSAStatusByAge(5.0, 60)).toBe('High');
      });

      it('should return Elevated for PSA > 3.0 and <= 4.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(3.1, 65)).toBe('Elevated');
        expect(psaStatusByAge.getPSAStatusByAge(4.0, 60)).toBe('Elevated');
      });

      it('should return Normal for PSA <= 3.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(3.0, 65)).toBe('Normal');
        expect(psaStatusByAge.getPSAStatusByAge(2.5, 60)).toBe('Normal');
      });

      it('should return Low for negative PSA', () => {
        expect(psaStatusByAge.getPSAStatusByAge(-1.0, 65)).toBe('Low');
      });
    });

    describe('Age 70-79', () => {
      it('should return High for PSA > 5.5', () => {
        expect(psaStatusByAge.getPSAStatusByAge(5.6, 75)).toBe('High');
        expect(psaStatusByAge.getPSAStatusByAge(6.0, 70)).toBe('High');
      });

      it('should return Normal for PSA <= 5.5', () => {
        expect(psaStatusByAge.getPSAStatusByAge(5.5, 75)).toBe('Normal');
        expect(psaStatusByAge.getPSAStatusByAge(4.0, 70)).toBe('Normal');
      });

      it('should return Low for negative PSA', () => {
        expect(psaStatusByAge.getPSAStatusByAge(-1.0, 75)).toBe('Low');
      });
    });

    describe('Age 80-100', () => {
      it('should return High for PSA > 10.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(10.1, 85)).toBe('High');
        expect(psaStatusByAge.getPSAStatusByAge(15.0, 80)).toBe('High');
      });

      it('should return Elevated for PSA > 6.5 and <= 10.0', () => {
        expect(psaStatusByAge.getPSAStatusByAge(6.6, 85)).toBe('Elevated');
        expect(psaStatusByAge.getPSAStatusByAge(10.0, 80)).toBe('Elevated');
      });

      it('should return Normal for PSA <= 6.5', () => {
        expect(psaStatusByAge.getPSAStatusByAge(6.5, 85)).toBe('Normal');
        expect(psaStatusByAge.getPSAStatusByAge(5.0, 80)).toBe('Normal');
      });

      it('should return Low for negative PSA', () => {
        expect(psaStatusByAge.getPSAStatusByAge(-1.0, 85)).toBe('Low');
      });
    });

    it('should use fallback for ages outside range', () => {
      expect(psaStatusByAge.getPSAStatusByAge(5.0, 101)).toBe('High');
      expect(psaStatusByAge.getPSAStatusByAge(3.0, 101)).toBe('Normal');
      expect(psaStatusByAge.getPSAStatusByAge(-1.0, 101)).toBe('Low');
    });
  });

  describe('getPSAThresholdByAge', () => {
    it('should return 4.0 for invalid age', () => {
      expect(psaStatusByAge.getPSAThresholdByAge(null)).toBe(4.0);
      expect(psaStatusByAge.getPSAThresholdByAge(undefined)).toBe(4.0);
      expect(psaStatusByAge.getPSAThresholdByAge(5)).toBe(4.0);
    });

    it('should return correct threshold for age 10-39', () => {
      expect(psaStatusByAge.getPSAThresholdByAge(10)).toBe(1.5);
      expect(psaStatusByAge.getPSAThresholdByAge(25)).toBe(1.5);
      expect(psaStatusByAge.getPSAThresholdByAge(39)).toBe(1.5);
    });

    it('should return correct threshold for age 40-49', () => {
      expect(psaStatusByAge.getPSAThresholdByAge(40)).toBe(2.0);
      expect(psaStatusByAge.getPSAThresholdByAge(45)).toBe(2.0);
      expect(psaStatusByAge.getPSAThresholdByAge(49)).toBe(2.0);
    });

    it('should return correct threshold for age 50-59', () => {
      expect(psaStatusByAge.getPSAThresholdByAge(50)).toBe(3.0);
      expect(psaStatusByAge.getPSAThresholdByAge(55)).toBe(3.0);
      expect(psaStatusByAge.getPSAThresholdByAge(59)).toBe(3.0);
    });

    it('should return correct threshold for age 60-69', () => {
      expect(psaStatusByAge.getPSAThresholdByAge(60)).toBe(4.0);
      expect(psaStatusByAge.getPSAThresholdByAge(65)).toBe(4.0);
      expect(psaStatusByAge.getPSAThresholdByAge(69)).toBe(4.0);
    });

    it('should return correct threshold for age 70-79', () => {
      expect(psaStatusByAge.getPSAThresholdByAge(70)).toBe(5.5);
      expect(psaStatusByAge.getPSAThresholdByAge(75)).toBe(5.5);
      expect(psaStatusByAge.getPSAThresholdByAge(79)).toBe(5.5);
    });

    it('should return correct threshold for age 80-100', () => {
      expect(psaStatusByAge.getPSAThresholdByAge(80)).toBe(6.5);
      expect(psaStatusByAge.getPSAThresholdByAge(90)).toBe(6.5);
      expect(psaStatusByAge.getPSAThresholdByAge(100)).toBe(6.5);
    });

    it('should return 4.0 for ages outside range', () => {
      expect(psaStatusByAge.getPSAThresholdByAge(101)).toBe(4.0);
      expect(psaStatusByAge.getPSAThresholdByAge(200)).toBe(4.0);
    });
  });
});


















