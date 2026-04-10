import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useBattleStore } from '../../stores/useBattleStore';
import { COMBO_INTERVAL_SEC, MAX_COMBO } from '../../constants/game';
import { useBattleTimer } from '../useBattleTimer';

// ---------------------------------------------------------------------------
// AppState mock — override addEventListener on the real AppState object
// ---------------------------------------------------------------------------

let appStateCallback: ((state: string) => void) | null = null;
const mockRemove = jest.fn();

const originalAddEventListener = AppState.addEventListener;

beforeEach(() => {
  (AppState as any).currentState = 'active';
  (AppState as any).addEventListener = jest.fn(
    (_event: string, callback: (state: string) => void) => {
      appStateCallback = callback;
      return { remove: mockRemove };
    },
  );
});

afterEach(() => {
  (AppState as any).addEventListener = originalAddEventListener;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupStore(
  overrides: Partial<{
    phase: 'SETUP' | 'COUNTDOWN' | 'FIGHTING' | 'RESULT';
    startedAt: number | null;
    plannedMin: number;
  }> = {},
) {
  useBattleStore.setState({
    phase: 'FIGHTING',
    startedAt: Date.now(),
    plannedMin: 25,
    comboCount: 0,
    maxCombo: 0,
    remainingSeconds: 0,
    ...overrides,
  });
}

function createCallbacks() {
  return {
    onComboTick: jest.fn(),
    onTimeUp: jest.fn(),
    onAppReturn: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBattleTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useBattleStore.getState().reset();
    appStateCallback = null;
    mockRemove.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -----------------------------------------------------------------------
  // 1. Interval starts when phase=FIGHTING and startedAt exists
  // -----------------------------------------------------------------------
  it('starts a 1-second interval when phase is FIGHTING and startedAt exists', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 25 });

    renderHook(() => useBattleTimer(callbacks));

    // Advance 1 tick
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // plannedMin=25 -> 1500s total, elapsed ~1s -> remaining ~1499
    const state = useBattleStore.getState();
    expect(state.remainingSeconds).toBeGreaterThanOrEqual(1498);
    expect(state.remainingSeconds).toBeLessThanOrEqual(1500);
  });

  // -----------------------------------------------------------------------
  // 2. Interval does NOT start when phase is not FIGHTING
  // -----------------------------------------------------------------------
  it('does NOT start interval when phase is SETUP', () => {
    const callbacks = createCallbacks();
    setupStore({ phase: 'SETUP', startedAt: Date.now(), plannedMin: 25 });

    renderHook(() => useBattleTimer(callbacks));

    const initialRemaining = useBattleStore.getState().remainingSeconds;

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // remainingSeconds should not change since no interval is running
    expect(useBattleStore.getState().remainingSeconds).toBe(initialRemaining);
  });

  it('does NOT start interval when phase is COUNTDOWN', () => {
    const callbacks = createCallbacks();
    setupStore({ phase: 'COUNTDOWN', startedAt: Date.now(), plannedMin: 25 });

    renderHook(() => useBattleTimer(callbacks));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(callbacks.onTimeUp).not.toHaveBeenCalled();
    expect(callbacks.onComboTick).not.toHaveBeenCalled();
  });

  it('does NOT start interval when startedAt is null', () => {
    const callbacks = createCallbacks();
    setupStore({ phase: 'FIGHTING', startedAt: null, plannedMin: 25 });

    renderHook(() => useBattleTimer(callbacks));

    const initialRemaining = useBattleStore.getState().remainingSeconds;

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(useBattleStore.getState().remainingSeconds).toBe(initialRemaining);
  });

  // -----------------------------------------------------------------------
  // 3. remainingSeconds is calculated and set correctly
  // -----------------------------------------------------------------------
  it('calculates remainingSeconds correctly as time elapses', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 1 }); // 1 min = 60s

    renderHook(() => useBattleTimer(callbacks));

    // Advance 10 seconds
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    const remaining = useBattleStore.getState().remainingSeconds;
    // 60 - 10 = 50 (approximately, allowing 1s tolerance for Date.now offset)
    expect(remaining).toBeGreaterThanOrEqual(49);
    expect(remaining).toBeLessThanOrEqual(51);
  });

  // -----------------------------------------------------------------------
  // 4. onTimeUp is called when remaining reaches 0
  // -----------------------------------------------------------------------
  it('calls onTimeUp when remainingSeconds reaches 0', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    // plannedMin = 3/60 -> 3 seconds total
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 3 / 60 });

    renderHook(() => useBattleTimer(callbacks));

    // Advance past the planned time
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(callbacks.onTimeUp).toHaveBeenCalledTimes(1);
    expect(useBattleStore.getState().remainingSeconds).toBe(0);
  });

  it('calls onTimeUp only once even after multiple ticks past zero', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 2 / 60 }); // 2 seconds

    renderHook(() => useBattleTimer(callbacks));

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    // Should fire exactly once thanks to hasEndedRef guard
    expect(callbacks.onTimeUp).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 5. Combo tick: after COMBO_INTERVAL_SEC seconds, onComboTick is called
  // -----------------------------------------------------------------------
  it('calls onComboTick after COMBO_INTERVAL_SEC (300s) of elapsed time', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 30 });

    renderHook(() => useBattleTimer(callbacks));

    // Advance 299 seconds -- no combo tick yet
    act(() => {
      jest.advanceTimersByTime(299_000);
    });
    expect(callbacks.onComboTick).not.toHaveBeenCalled();

    // Advance 1 more second (total 300s = COMBO_INTERVAL_SEC)
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(callbacks.onComboTick).toHaveBeenCalledTimes(1);
    expect(callbacks.onComboTick).toHaveBeenCalledWith(1);

    // Also confirm incrementCombo was called in the store
    expect(useBattleStore.getState().comboCount).toBe(1);
  });

  it('calls onComboTick at each COMBO_INTERVAL_SEC up to MAX_COMBO and stops', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    // Need enough time for MAX_COMBO (5) combos + extra: 5 * 300 = 1500s = 25 min
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 30 });

    renderHook(() => useBattleTimer(callbacks));

    // Advance through all MAX_COMBO combo ticks
    for (let i = 1; i <= MAX_COMBO; i++) {
      act(() => {
        jest.advanceTimersByTime(COMBO_INTERVAL_SEC * 1000);
      });
      expect(callbacks.onComboTick).toHaveBeenCalledTimes(i);
      expect(callbacks.onComboTick).toHaveBeenLastCalledWith(i);
    }

    expect(useBattleStore.getState().comboCount).toBe(MAX_COMBO);

    // Advancing another COMBO_INTERVAL should NOT trigger combo beyond MAX_COMBO
    act(() => {
      jest.advanceTimersByTime(COMBO_INTERVAL_SEC * 1000);
    });
    expect(callbacks.onComboTick).toHaveBeenCalledTimes(MAX_COMBO);
  });

  // -----------------------------------------------------------------------
  // 6. Cleanup: interval is cleared when component unmounts
  // -----------------------------------------------------------------------
  it('clears interval on unmount', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 25 });

    const { unmount } = renderHook(() => useBattleTimer(callbacks));

    // Confirm interval is running
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(useBattleStore.getState().remainingSeconds).toBeLessThan(1500);

    // Unmount the hook
    unmount();

    // Set a sentinel value to verify no further writes
    useBattleStore.setState({ remainingSeconds: 9999 });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should remain at 9999 because interval was cleared on unmount
    expect(useBattleStore.getState().remainingSeconds).toBe(9999);
  });

  // -----------------------------------------------------------------------
  // 7. resetComboTracker resets the internal combo counter
  // -----------------------------------------------------------------------
  it('resetComboTracker resets internal tracking so combo does not double-fire', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 30 });

    const { result } = renderHook(() => useBattleTimer(callbacks));

    // Advance to first combo tick (300s)
    act(() => {
      jest.advanceTimersByTime(COMBO_INTERVAL_SEC * 1000);
    });
    expect(callbacks.onComboTick).toHaveBeenCalledTimes(1);

    // Reset combo tracker -- this recalculates lastComboTickRef from elapsed time
    act(() => {
      result.current.resetComboTracker();
    });

    // Advance 1 more second -- should NOT re-trigger the same combo tick
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(callbacks.onComboTick).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 8. AppState: background -> active with >=5s calls onAppReturn
  // -----------------------------------------------------------------------
  it('calls onAppReturn when returning from background after >= 5 seconds', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 25 });

    renderHook(() => useBattleTimer(callbacks));

    expect(appStateCallback).not.toBeNull();

    // Simulate going to background
    act(() => {
      appStateCallback!('background');
    });

    // Advance 10 seconds while in background
    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    // Simulate returning to foreground
    act(() => {
      appStateCallback!('active');
    });

    expect(callbacks.onAppReturn).toHaveBeenCalledTimes(1);
    const calledWithSec = callbacks.onAppReturn.mock.calls[0][0];
    expect(calledWithSec).toBeGreaterThanOrEqual(9);
    expect(calledWithSec).toBeLessThanOrEqual(11);
  });

  // -----------------------------------------------------------------------
  // 9. AppState: background -> active with < 5s does NOT call onAppReturn
  // -----------------------------------------------------------------------
  it('does NOT call onAppReturn when background duration < 5 seconds', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 25 });

    renderHook(() => useBattleTimer(callbacks));

    expect(appStateCallback).not.toBeNull();

    // Go to background
    act(() => {
      appStateCallback!('background');
    });

    // Only 3 seconds in background
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Return to foreground
    act(() => {
      appStateCallback!('active');
    });

    expect(callbacks.onAppReturn).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 10. AppState listener not registered when phase != FIGHTING
  // -----------------------------------------------------------------------
  it('does not register AppState listener when phase is not FIGHTING', () => {
    (AppState.addEventListener as jest.Mock).mockClear();

    const callbacks = createCallbacks();
    setupStore({ phase: 'SETUP', startedAt: Date.now(), plannedMin: 25 });

    renderHook(() => useBattleTimer(callbacks));

    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 11. AppState listener is cleaned up on unmount
  // -----------------------------------------------------------------------
  it('removes AppState listener on unmount', () => {
    mockRemove.mockClear();

    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 25 });

    const { unmount } = renderHook(() => useBattleTimer(callbacks));

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // 12. Phase transition: SETUP -> FIGHTING starts the interval
  // -----------------------------------------------------------------------
  it('starts interval when phase transitions from SETUP to FIGHTING', () => {
    const callbacks = createCallbacks();
    setupStore({ phase: 'SETUP', startedAt: null, plannedMin: 25 });

    const { rerender } = renderHook(() => useBattleTimer(callbacks));

    // No interval running
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    const remainingBefore = useBattleStore.getState().remainingSeconds;

    // Transition to FIGHTING
    act(() => {
      useBattleStore.setState({
        phase: 'FIGHTING',
        startedAt: Date.now(),
      });
    });

    rerender({});

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    const remaining = useBattleStore.getState().remainingSeconds;
    // 25 min = 1500s, minus ~2s elapsed
    expect(remaining).toBeGreaterThanOrEqual(1497);
    expect(remaining).toBeLessThanOrEqual(1500);
  });

  // -----------------------------------------------------------------------
  // 13. Phase transition: FIGHTING -> RESULT clears the interval
  // -----------------------------------------------------------------------
  it('clears interval when phase transitions from FIGHTING to RESULT', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 25 });

    const { rerender } = renderHook(() => useBattleTimer(callbacks));

    // Let interval run
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Transition to RESULT
    act(() => {
      useBattleStore.setState({ phase: 'RESULT' });
    });

    rerender({});

    // Set sentinel
    useBattleStore.setState({ remainingSeconds: 7777 });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Sentinel should be unchanged since interval was cleared
    expect(useBattleStore.getState().remainingSeconds).toBe(7777);
  });

  // -----------------------------------------------------------------------
  // 14. AppState inactive -> active also triggers onAppReturn
  // -----------------------------------------------------------------------
  it('handles inactive -> active transition (e.g., iOS app switcher)', () => {
    const callbacks = createCallbacks();
    const now = Date.now();
    setupStore({ phase: 'FIGHTING', startedAt: now, plannedMin: 25 });

    renderHook(() => useBattleTimer(callbacks));

    // Go to inactive (not background)
    act(() => {
      appStateCallback!('inactive');
    });

    act(() => {
      jest.advanceTimersByTime(8000);
    });

    // Return to active from inactive
    act(() => {
      appStateCallback!('active');
    });

    expect(callbacks.onAppReturn).toHaveBeenCalledTimes(1);
    const sec = callbacks.onAppReturn.mock.calls[0][0];
    expect(sec).toBeGreaterThanOrEqual(7);
    expect(sec).toBeLessThanOrEqual(9);
  });

  // -----------------------------------------------------------------------
  // 15. Hook returns resetComboTracker function
  // -----------------------------------------------------------------------
  it('returns an object with resetComboTracker function', () => {
    const callbacks = createCallbacks();
    setupStore({ phase: 'FIGHTING', startedAt: Date.now(), plannedMin: 25 });

    const { result } = renderHook(() => useBattleTimer(callbacks));

    expect(result.current).toHaveProperty('resetComboTracker');
    expect(typeof result.current.resetComboTracker).toBe('function');
  });
});
