import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEscapeKey } from '../useEscapeKey';

describe('useEscapeKey', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should call onClose when Escape is pressed and no unsaved changes', () => {
      const mockOnClose = vi.fn();
      const { result } = renderHook(() => 
        useEscapeKey(mockOnClose, true, false, null)
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not call onClose when modal is not open', () => {
      const mockOnClose = vi.fn();
      renderHook(() => 
        useEscapeKey(mockOnClose, false, false, null)
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show confirmation modal when Escape is pressed with unsaved changes', () => {
      const mockOnClose = vi.fn();
      const mockOnSave = vi.fn();
      const { result } = renderHook(() => 
        useEscapeKey(mockOnClose, true, true, mockOnSave)
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(result.current[0]).toBe(true); // showConfirmModal should be true
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Confirmation Modal', () => {
    it('should close modal when shouldSave is false', () => {
      const mockOnClose = vi.fn();
      const mockOnSave = vi.fn();
      const { result } = renderHook(() => 
        useEscapeKey(mockOnClose, true, true, mockOnSave)
      );

      // Trigger Escape to show modal
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(result.current[0]).toBe(true);

      // Close without saving
      act(() => {
        result.current[1](false);
      });

      expect(result.current[0]).toBe(false);
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should save and close when shouldSave is true', () => {
      const mockOnClose = vi.fn();
      const mockOnSave = vi.fn();
      const { result } = renderHook(() => 
        useEscapeKey(mockOnClose, true, true, mockOnSave)
      );

      // Trigger Escape to show modal
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      // Save and close
      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(false);
      expect(mockOnSave).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal even when onSave is null and shouldSave is true', () => {
      const mockOnClose = vi.fn();
      const { result } = renderHook(() => 
        useEscapeKey(mockOnClose, true, true, null)
      );

      // Trigger Escape to show modal
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      // Try to save (but onSave is null)
      act(() => {
        result.current[1](true);
      });

      expect(result.current[0]).toBe(false);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Ref Updates', () => {
    it('should update onClose ref when onClose changes', () => {
      const mockOnClose1 = vi.fn();
      const mockOnClose2 = vi.fn();
      const { rerender } = renderHook(
        ({ onClose }) => useEscapeKey(onClose, true, false, null),
        { initialProps: { onClose: mockOnClose1 } }
      );

      rerender({ onClose: mockOnClose2 });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(mockOnClose2).toHaveBeenCalled();
      expect(mockOnClose1).not.toHaveBeenCalled();
    });

    it('should update onSave ref when onSave changes', () => {
      const mockOnClose = vi.fn();
      const mockOnSave1 = vi.fn();
      const mockOnSave2 = vi.fn();
      const { rerender } = renderHook(
        ({ onSave }) => useEscapeKey(mockOnClose, true, true, onSave),
        { initialProps: { onSave: mockOnSave1 } }
      );

      rerender({ onSave: mockOnSave2 });

      // Trigger Escape
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      // Save
      const { result } = rerender({ onSave: mockOnSave2 });
      act(() => {
        result.current[1](true);
      });

      expect(mockOnSave2).toHaveBeenCalled();
      expect(mockOnSave1).not.toHaveBeenCalled();
    });

    it('should update hasUnsavedChanges ref when it changes', () => {
      const mockOnClose = vi.fn();
      const mockOnSave = vi.fn();
      const { rerender } = renderHook(
        ({ hasUnsavedChanges }) => useEscapeKey(mockOnClose, true, hasUnsavedChanges, mockOnSave),
        { initialProps: { hasUnsavedChanges: false } }
      );

      // Should close immediately when no unsaved changes
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalled();

      // Reset
      mockOnClose.mockClear();

      // Update to have unsaved changes
      rerender({ hasUnsavedChanges: true });

      // Should show confirmation modal
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      const { result } = rerender({ hasUnsavedChanges: true });
      expect(result.current[0]).toBe(true);
    });
  });

  describe('Event Handling', () => {
    it('should prevent default and stop propagation', () => {
      const mockOnClose = vi.fn();
      renderHook(() => useEscapeKey(mockOnClose, true, false, null));

      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      act(() => {
        document.dispatchEvent(event);
      });

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should clean up event listener on unmount', () => {
      const mockOnClose = vi.fn();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = renderHook(() => 
        useEscapeKey(mockOnClose, true, false, null)
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('should clean up event listener when isOpen becomes false', () => {
      const mockOnClose = vi.fn();
      const { rerender } = renderHook(
        ({ isOpen }) => useEscapeKey(mockOnClose, isOpen, false, null),
        { initialProps: { isOpen: true } }
      );

      rerender({ isOpen: false });

      // Event listener should be removed
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null onClose', () => {
      const { result } = renderHook(() => 
        useEscapeKey(null, true, false, null)
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      // Should not throw error
      expect(result.current).toBeDefined();
    });

    it('should handle undefined onSave', () => {
      const mockOnClose = vi.fn();
      const { result } = renderHook(() => 
        useEscapeKey(mockOnClose, true, true, undefined)
      );

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(result.current[0]).toBe(true);

      act(() => {
        result.current[1](true);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle hasUnsavedChanges changing from true to false', () => {
      const mockOnClose = vi.fn();
      const { rerender } = renderHook(
        ({ hasUnsavedChanges }) => useEscapeKey(mockOnClose, true, hasUnsavedChanges, null),
        { initialProps: { hasUnsavedChanges: true } }
      );

      rerender({ hasUnsavedChanges: false });

      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
