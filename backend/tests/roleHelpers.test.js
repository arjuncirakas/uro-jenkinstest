/**
 * Tests for role helper utilities
 * Tests all functions to achieve 100% coverage
 */
import { describe, it, expect } from '@jest/globals';
import * as roleHelpers from '../utils/roleHelpers.js';

describe('Role Helpers', () => {
  describe('isUrologistOrDoctor', () => {
    it('should return true for urologist role', () => {
      expect(roleHelpers.isUrologistOrDoctor('urologist')).toBe(true);
    });

    it('should return true for doctor role', () => {
      expect(roleHelpers.isUrologistOrDoctor('doctor')).toBe(true);
    });

    it('should return false for other roles', () => {
      expect(roleHelpers.isUrologistOrDoctor('gp')).toBe(false);
      expect(roleHelpers.isUrologistOrDoctor('urology_nurse')).toBe(false);
      expect(roleHelpers.isUrologistOrDoctor('superadmin')).toBe(false);
      expect(roleHelpers.isUrologistOrDoctor('department_admin')).toBe(false);
    });
  });

  describe('isRoleAllowed', () => {
    it('should allow urologist when urologist is in allowed roles', () => {
      expect(roleHelpers.isRoleAllowed('urologist', ['urologist', 'gp'])).toBe(true);
    });

    it('should allow doctor when urologist is in allowed roles', () => {
      expect(roleHelpers.isRoleAllowed('doctor', ['urologist', 'gp'])).toBe(true);
    });

    it('should allow urologist when doctor is in allowed roles', () => {
      expect(roleHelpers.isRoleAllowed('urologist', ['doctor', 'gp'])).toBe(true);
    });

    it('should allow doctor when doctor is in allowed roles', () => {
      expect(roleHelpers.isRoleAllowed('doctor', ['doctor', 'gp'])).toBe(true);
    });

    it('should allow role when it is in allowed roles', () => {
      expect(roleHelpers.isRoleAllowed('gp', ['gp', 'urologist'])).toBe(true);
      expect(roleHelpers.isRoleAllowed('urology_nurse', ['urology_nurse'])).toBe(true);
    });

    it('should not allow role when it is not in allowed roles', () => {
      expect(roleHelpers.isRoleAllowed('gp', ['urologist'])).toBe(false);
      expect(roleHelpers.isRoleAllowed('superadmin', ['gp'])).toBe(false);
    });

    it('should handle empty allowed roles array', () => {
      expect(roleHelpers.isRoleAllowed('urologist', [])).toBe(false);
    });
  });

  describe('normalizeRoleForDisplay', () => {
    it('should normalize doctor to urologist', () => {
      expect(roleHelpers.normalizeRoleForDisplay('doctor')).toBe('urologist');
    });

    it('should return other roles as-is', () => {
      expect(roleHelpers.normalizeRoleForDisplay('urologist')).toBe('urologist');
      expect(roleHelpers.normalizeRoleForDisplay('gp')).toBe('gp');
      expect(roleHelpers.normalizeRoleForDisplay('urology_nurse')).toBe('urology_nurse');
      expect(roleHelpers.normalizeRoleForDisplay('superadmin')).toBe('superadmin');
    });
  });

  describe('getRoleDisplayName', () => {
    it('should return correct display name for urologist', () => {
      expect(roleHelpers.getRoleDisplayName('urologist')).toBe('Urologist');
    });

    it('should return Urologist for doctor', () => {
      expect(roleHelpers.getRoleDisplayName('doctor')).toBe('Urologist');
    });

    it('should return correct display name for nurse', () => {
      expect(roleHelpers.getRoleDisplayName('urology_nurse')).toBe('Nurse');
    });

    it('should return correct display name for gp', () => {
      expect(roleHelpers.getRoleDisplayName('gp')).toBe('GP');
    });

    it('should return Admin for superadmin', () => {
      expect(roleHelpers.getRoleDisplayName('superadmin')).toBe('Admin');
    });

    it('should return Admin for admin', () => {
      expect(roleHelpers.getRoleDisplayName('admin')).toBe('Admin');
    });

    it('should return User for unknown roles', () => {
      expect(roleHelpers.getRoleDisplayName('unknown_role')).toBe('User');
      expect(roleHelpers.getRoleDisplayName('department_admin')).toBe('User');
    });
  });
});











