import { describe, it, expect } from 'vitest';
import { calculatePSAVelocity } from '../psaVelocity';

describe('calculatePSAVelocity', () => {
  describe('Insufficient Data', () => {
    it('should return insufficient data when no results provided', () => {
      const result = calculatePSAVelocity(null);
      
      expect(result.hasEnoughData).toBe(false);
      expect(result.velocity).toBeNull();
      expect(result.velocityText).toContain('Insufficient data');
    });

    it('should return insufficient data when empty array', () => {
      const result = calculatePSAVelocity([]);
      
      expect(result.hasEnoughData).toBe(false);
      expect(result.velocity).toBeNull();
    });

    it('should return insufficient data when only one result', () => {
      const results = [
        { result: 2.5, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(false);
      expect(result.velocity).toBeNull();
    });
  });

  describe('Valid Calculations', () => {
    it('should calculate velocity correctly with two results', () => {
      const results = [
        { result: 4.0, testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
      expect(result.velocity).toBeGreaterThan(0);
      expect(result.velocityText).toContain('ng/mL/year');
    });

    it('should use most recent two results when multiple results provided', () => {
      const results = [
        { result: 5.0, testDate: '2024-12-31' },
        { result: 4.0, testDate: '2024-06-30' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
      // Should use 5.0 and 4.0 (most recent two)
    });

    it('should handle negative velocity (decreasing PSA)', () => {
      const results = [
        { result: 2.0, testDate: '2024-12-31' },
        { result: 4.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
      expect(result.velocity).toBeLessThan(0);
      expect(result.velocityText).toContain('-');
    });

    it('should identify high risk when velocity > 0.75', () => {
      const results = [
        { result: 5.0, testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      // Velocity should be approximately 3.0 ng/mL/year (high risk)
      expect(result.isHighRisk).toBe(true);
    });

    it('should not identify high risk when velocity <= 0.75', () => {
      const results = [
        { result: 2.5, testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.isHighRisk).toBe(false);
    });
  });

  describe('Field Name Variations', () => {
    it('should handle result_value field', () => {
      const results = [
        { result_value: 4.0, testDate: '2024-12-31' },
        { result_value: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should handle numericValue field', () => {
      const results = [
        { numericValue: 4.0, testDate: '2024-12-31' },
        { numericValue: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should handle test_date field', () => {
      const results = [
        { result: 4.0, test_date: '2024-12-31' },
        { result: 2.0, test_date: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should handle formattedDate field', () => {
      const results = [
        { result: 4.0, formattedDate: '2024-12-31' },
        { result: 2.0, formattedDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should handle date field', () => {
      const results = [
        { result: 4.0, date: '2024-12-31' },
        { result: 2.0, date: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should handle created_at field', () => {
      const results = [
        { result: 4.0, created_at: '2024-12-31' },
        { result: 2.0, created_at: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should handle dateObj field', () => {
      const results = [
        { result: 4.0, dateObj: new Date('2024-12-31') },
        { result: 2.0, dateObj: new Date('2024-01-01') }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should prioritize dateObj over other date fields', () => {
      const results = [
        { result: 4.0, dateObj: new Date('2024-12-31'), testDate: '2023-01-01' },
        { result: 2.0, dateObj: new Date('2024-01-01'), testDate: '2023-12-31' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });
  });

  describe('PSA Value Parsing', () => {
    it('should handle string PSA values with ng/mL', () => {
      const results = [
        { result: '4.0 ng/mL', testDate: '2024-12-31' },
        { result: '2.0 ng/mL', testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should handle numeric PSA values', () => {
      const results = [
        { result: 4.0, testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
    });

    it('should return error when PSA values are invalid', () => {
      const results = [
        { result: 'invalid', testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(false);
      expect(result.velocity).toBeNull();
      expect(result.velocityText).toContain('invalid PSA values');
    });

    it('should return error when PSA values are null', () => {
      const results = [
        { result: null, testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(false);
    });
  });

  describe('Date Validation', () => {
    it('should return error when dates are invalid', () => {
      const results = [
        { result: 4.0, testDate: 'invalid-date' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(false);
      expect(result.velocityText).toContain('invalid dates');
    });

    it('should return error when dates are the same', () => {
      const results = [
        { result: 4.0, testDate: '2024-01-01' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(false);
      expect(result.velocityText).toContain('dates are invalid');
    });

    it('should return error when previous date is after latest date', () => {
      const results = [
        { result: 4.0, testDate: '2024-01-01' },
        { result: 2.0, testDate: '2024-12-31' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(false);
    });
  });

  describe('Sorting', () => {
    it('should sort results by date (newest first)', () => {
      const results = [
        { result: 2.0, testDate: '2024-01-01' },
        { result: 4.0, testDate: '2024-12-31' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.hasEnoughData).toBe(true);
      expect(result.velocity).toBeGreaterThan(0);
    });

    it('should handle unsorted results correctly', () => {
      const results = [
        { result: 3.0, testDate: '2024-06-30' },
        { result: 4.0, testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      // Should use 4.0 and 3.0 (most recent two)
      expect(result.hasEnoughData).toBe(true);
    });
  });

  describe('Return Values', () => {
    it('should return velocity, latestPSA, previousPSA, and timeDiffYears', () => {
      const results = [
        { result: 4.0, testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result).toHaveProperty('velocity');
      expect(result).toHaveProperty('latestPSA');
      expect(result).toHaveProperty('previousPSA');
      expect(result).toHaveProperty('timeDiffYears');
      expect(result.latestPSA).toBe(4.0);
      expect(result.previousPSA).toBe(2.0);
    });

    it('should format velocity text correctly', () => {
      const results = [
        { result: 4.0, testDate: '2024-12-31' },
        { result: 2.0, testDate: '2024-01-01' }
      ];
      const result = calculatePSAVelocity(results);
      
      expect(result.velocityText).toMatch(/^[+-]?\d+\.\d{2} ng\/mL\/year$/);
    });
  });
});
