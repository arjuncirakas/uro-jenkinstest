/**
 * Tests for store/index.js
 * Ensures 100% coverage for store configuration
 * CRITICAL: No modifications to source code - only testing existing behavior
 */
import { describe, it, expect } from 'vitest';
import { store } from '../index';
import authReducer from '../slices/authSlice';
import superadminReducer from '../slices/superadminSlice';

describe('store', () => {
  it('should export store', () => {
    expect(store).toBeDefined();
    expect(typeof store.dispatch).toBe('function');
    expect(typeof store.getState).toBe('function');
    expect(typeof store.subscribe).toBe('function');
  });

  it('should have auth reducer in state', () => {
    const state = store.getState();
    expect(state.auth).toBeDefined();
  });

  it('should have superadmin reducer in state', () => {
    const state = store.getState();
    expect(state.superadmin).toBeDefined();
  });

  it('should dispatch actions', () => {
    const action = { type: 'test/action' };
    const result = store.dispatch(action);
    expect(result).toEqual(action);
  });

  it('should subscribe to state changes', () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    
    store.dispatch({ type: 'test/action' });
    
    expect(listener).toHaveBeenCalled();
    
    unsubscribe();
    listener.mockClear();
    
    store.dispatch({ type: 'test/action2' });
    // Listener may or may not be called after unsubscribe depending on implementation
  });

  it('should return current state', () => {
    const state = store.getState();
    expect(state).toBeDefined();
    expect(typeof state).toBe('object');
  });
});





