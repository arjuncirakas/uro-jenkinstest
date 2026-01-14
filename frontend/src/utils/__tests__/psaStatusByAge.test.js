import { describe, it, expect } from 'vitest';
import { getPSAStatusByAge, getPSAThresholdByAge } from '../psaStatusByAge';

describe('getPSAStatusByAge', () => {
  describe('Invalid PSA Values', () => {
    it('should return Normal status for null PSA', () => {
      const result = getPSAStatusByAge(null, 50);
      expect(result.status).toBe('Normal');
      expect(result.message).toBe('Invalid PSA value');
    });

    it('should return Normal status for undefined PSA', () => {
      const result = getPSAStatusByAge(undefined, 50);
      expect(result.status).toBe('Normal');
      expect(result.message).toBe('Invalid PSA value');
    });

    it('should return Normal status for NaN PSA', () => {
      const result = getPSAStatusByAge('invalid', 50);
      expect(result.status).toBe('Normal');
      expect(result.message).toBe('Invalid PSA value');
    });

    it('should return Normal status for empty string PSA', () => {
      const result = getPSAStatusByAge('', 50);
      expect(result.status).toBe('Normal');
      expect(result.message).toBe('Invalid PSA value');
    });
  });

  describe('Age 10-39', () => {
    it('should return High status for PSA > 2.0', () => {
      const result = getPSAStatusByAge(2.5, 30);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(2.0);
      expect(result.message).toContain('Highly suspicious');
    });

    it('should return Elevated status for PSA > 1.5 and <= 2.0', () => {
      const result = getPSAStatusByAge(1.8, 30);
      expect(result.status).toBe('Elevated');
      expect(result.threshold).toBe(1.5);
      expect(result.message).toContain('Above normal');
    });

    it('should return Normal status for PSA <= 1.5', () => {
      const result = getPSAStatusByAge(1.0, 30);
      expect(result.status).toBe('Normal');
      expect(result.threshold).toBe(1.5);
    });

    it('should return Low status for negative PSA', () => {
      const result = getPSAStatusByAge(-0.5, 30);
      expect(result.status).toBe('Low');
      expect(result.threshold).toBe(0.0);
    });
  });

  describe('Age 40-49', () => {
    it('should return High status for PSA > 2.0', () => {
      const result = getPSAStatusByAge(2.5, 45);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(2.0);
    });

    it('should return Normal status for PSA <= 2.0', () => {
      const result = getPSAStatusByAge(1.5, 45);
      expect(result.status).toBe('Normal');
      expect(result.threshold).toBe(2.0);
    });

    it('should return Low status for negative PSA', () => {
      const result = getPSAStatusByAge(-0.5, 45);
      expect(result.status).toBe('Low');
    });
  });

  describe('Age 50-59', () => {
    it('should return High status for PSA > 3.0', () => {
      const result = getPSAStatusByAge(3.5, 55);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(3.0);
    });

    it('should return Normal status for PSA <= 3.0', () => {
      const result = getPSAStatusByAge(2.5, 55);
      expect(result.status).toBe('Normal');
      expect(result.threshold).toBe(3.0);
    });

    it('should return Low status for negative PSA', () => {
      const result = getPSAStatusByAge(-0.5, 55);
      expect(result.status).toBe('Low');
    });
  });

  describe('Age 60-69', () => {
    it('should return High status for PSA > 4.0', () => {
      const result = getPSAStatusByAge(4.5, 65);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(4.0);
    });

    it('should return Elevated status for PSA > 3.0 and <= 4.0', () => {
      const result = getPSAStatusByAge(3.5, 65);
      expect(result.status).toBe('Elevated');
      expect(result.threshold).toBe(3.0);
      expect(result.message).toContain('Flagged for discussion');
    });

    it('should return Normal status for PSA <= 3.0', () => {
      const result = getPSAStatusByAge(2.5, 65);
      expect(result.status).toBe('Normal');
      expect(result.threshold).toBe(4.0);
    });

    it('should return Low status for negative PSA', () => {
      const result = getPSAStatusByAge(-0.5, 65);
      expect(result.status).toBe('Low');
    });
  });

  describe('Age 70-79', () => {
    it('should return High status for PSA > 5.5', () => {
      const result = getPSAStatusByAge(6.0, 75);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(5.5);
    });

    it('should return Normal status for PSA <= 5.5', () => {
      const result = getPSAStatusByAge(4.0, 75);
      expect(result.status).toBe('Normal');
      expect(result.threshold).toBe(5.5);
    });

    it('should return Low status for negative PSA', () => {
      const result = getPSAStatusByAge(-0.5, 75);
      expect(result.status).toBe('Low');
    });
  });

  describe('Age 80-100', () => {
    it('should return High status for PSA > 10.0', () => {
      const result = getPSAStatusByAge(11.0, 85);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(10.0);
    });

    it('should return Elevated status for PSA > 6.5 and <= 10.0', () => {
      const result = getPSAStatusByAge(8.0, 85);
      expect(result.status).toBe('Elevated');
      expect(result.threshold).toBe(6.5);
    });

    it('should return Normal status for PSA <= 6.5', () => {
      const result = getPSAStatusByAge(5.0, 85);
      expect(result.status).toBe('Normal');
      expect(result.threshold).toBe(6.5);
    });

    it('should return Low status for negative PSA', () => {
      const result = getPSAStatusByAge(-0.5, 85);
      expect(result.status).toBe('Low');
    });
  });

  describe('Age Not Available', () => {
    it('should use default 4.0 threshold when age is null', () => {
      const result = getPSAStatusByAge(5.0, null);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(4.0);
      expect(result.message).toContain('age not available');
    });

    it('should use default 4.0 threshold when age is undefined', () => {
      const result = getPSAStatusByAge(5.0, undefined);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(4.0);
    });

    it('should use default 4.0 threshold when age < 10', () => {
      const result = getPSAStatusByAge(5.0, 5);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(4.0);
    });

    it('should return Normal for PSA <= 4.0 when age not available', () => {
      const result = getPSAStatusByAge(3.0, null);
      expect(result.status).toBe('Normal');
      expect(result.threshold).toBe(4.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle string PSA values', () => {
      const result = getPSAStatusByAge('3.5', 55);
      expect(result.status).toBe('High');
    });

    it('should handle string age values', () => {
      const result = getPSAStatusByAge(3.5, '55');
      expect(result.status).toBe('High');
    });

    it('should handle boundary values exactly at threshold', () => {
      const result = getPSAStatusByAge(2.0, 45);
      expect(result.status).toBe('Normal');
    });

    it('should handle ages outside normal range (> 100)', () => {
      const result = getPSAStatusByAge(5.0, 105);
      expect(result.status).toBe('High');
      expect(result.threshold).toBe(4.0);
    });

    it('should handle zero PSA', () => {
      const result = getPSAStatusByAge(0, 50);
      expect(result.status).toBe('Normal');
    });
  });
});

describe('getPSAThresholdByAge', () => {
  it('should return 1.5 for age 10-39', () => {
    expect(getPSAThresholdByAge(30)).toBe(1.5);
    expect(getPSAThresholdByAge(10)).toBe(1.5);
    expect(getPSAThresholdByAge(39)).toBe(1.5);
  });

  it('should return 2.0 for age 40-49', () => {
    expect(getPSAThresholdByAge(40)).toBe(2.0);
    expect(getPSAThresholdByAge(45)).toBe(2.0);
    expect(getPSAThresholdByAge(49)).toBe(2.0);
  });

  it('should return 3.0 for age 50-59', () => {
    expect(getPSAThresholdByAge(50)).toBe(3.0);
    expect(getPSAThresholdByAge(55)).toBe(3.0);
    expect(getPSAThresholdByAge(59)).toBe(3.0);
  });

  it('should return 4.0 for age 60-69', () => {
    expect(getPSAThresholdByAge(60)).toBe(4.0);
    expect(getPSAThresholdByAge(65)).toBe(4.0);
    expect(getPSAThresholdByAge(69)).toBe(4.0);
  });

  it('should return 5.5 for age 70-79', () => {
    expect(getPSAThresholdByAge(70)).toBe(5.5);
    expect(getPSAThresholdByAge(75)).toBe(5.5);
    expect(getPSAThresholdByAge(79)).toBe(5.5);
  });

  it('should return 6.5 for age 80-100', () => {
    expect(getPSAThresholdByAge(80)).toBe(6.5);
    expect(getPSAThresholdByAge(90)).toBe(6.5);
    expect(getPSAThresholdByAge(100)).toBe(6.5);
  });

  it('should return 4.0 default for null age', () => {
    expect(getPSAThresholdByAge(null)).toBe(4.0);
  });

  it('should return 4.0 default for undefined age', () => {
    expect(getPSAThresholdByAge(undefined)).toBe(4.0);
  });

  it('should return 4.0 default for age < 10', () => {
    expect(getPSAThresholdByAge(5)).toBe(4.0);
    expect(getPSAThresholdByAge(0)).toBe(4.0);
  });

  it('should return 4.0 default for age > 100', () => {
    expect(getPSAThresholdByAge(101)).toBe(4.0);
    expect(getPSAThresholdByAge(150)).toBe(4.0);
  });

  it('should handle string age values', () => {
    expect(getPSAThresholdByAge('55')).toBe(3.0);
  });
});
