/**
 * Tests for hooks.js
 * Ensures 100% coverage for Redux hooks
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect, vi } from 'vitest';
import { useDispatch, useSelector } from 'react-redux';
import { useAppDispatch, useAppSelector } from '../hooks';

// Mock react-redux
vi.mock('react-redux', () => ({
  useDispatch: vi.fn(),
  useSelector: vi.fn()
}));

describe('hooks', () => {
  describe('useAppDispatch', () => {
    it('should return result of useDispatch', () => {
      const mockDispatch = vi.fn();
      useDispatch.mockReturnValue(mockDispatch);
      
      const result = useAppDispatch();
      
      expect(useDispatch).toHaveBeenCalled();
      expect(result).toBe(mockDispatch);
    });

    it('should call useDispatch with no arguments', () => {
      useAppDispatch();
      
      expect(useDispatch).toHaveBeenCalledWith();
    });
  });

  describe('useAppSelector', () => {
    it('should return result of useSelector', () => {
      const mockSelector = vi.fn();
      const mockState = { auth: { user: null } };
      useSelector.mockReturnValue(mockState);
      
      const result = useAppSelector(mockSelector);
      
      expect(useSelector).toHaveBeenCalledWith(mockSelector);
      expect(result).toBe(mockState);
    });

    it('should pass selector function to useSelector', () => {
      const selector = (state) => state.auth;
      useAppSelector(selector);
      
      expect(useSelector).toHaveBeenCalledWith(selector);
    });
  });
});







