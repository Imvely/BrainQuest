import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useBattleStore } from '../stores/useBattleStore';
import { COMBO_INTERVAL_SEC, MAX_COMBO } from '../constants/game';

interface UseBattleTimerOptions {
  onComboTick: (comboCount: number) => void;
  onTimeUp: () => void;
  onAppReturn: (backgroundSec: number) => void;
}

export function useBattleTimer({
  onComboTick,
  onTimeUp,
  onAppReturn,
}: UseBattleTimerOptions) {
  const phase = useBattleStore((s) => s.phase);
  const startedAt = useBattleStore((s) => s.startedAt);
  const plannedMin = useBattleStore((s) => s.plannedMin);
  const setRemainingSeconds = useBattleStore((s) => s.setRemainingSeconds);
  const incrementCombo = useBattleStore((s) => s.incrementCombo);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backgroundAtRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastComboTickRef = useRef(0);
  const hasEndedRef = useRef(false);

  const onComboTickRef = useRef(onComboTick);
  const onTimeUpRef = useRef(onTimeUp);
  const onAppReturnRef = useRef(onAppReturn);
  onComboTickRef.current = onComboTick;
  onTimeUpRef.current = onTimeUp;
  onAppReturnRef.current = onAppReturn;

  // ── 1-second interval ──
  useEffect(() => {
    if (phase !== 'FIGHTING' || !startedAt) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    hasEndedRef.current = false;

    intervalRef.current = setInterval(() => {
      if (hasEndedRef.current) return;

      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      const totalSec = plannedMin * 60;
      const remaining = Math.max(0, totalSec - elapsedSec);

      setRemainingSeconds(remaining);

      // Combo every 5 minutes
      const ticks = Math.floor(elapsedSec / COMBO_INTERVAL_SEC);
      if (ticks > lastComboTickRef.current && ticks <= MAX_COMBO) {
        lastComboTickRef.current = ticks;
        incrementCombo();
        onComboTickRef.current(ticks);
      }

      if (remaining <= 0 && !hasEndedRef.current) {
        hasEndedRef.current = true;
        onTimeUpRef.current();
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [phase, startedAt, plannedMin, setRemainingSeconds, incrementCombo]);

  // ── AppState background / foreground ──
  useEffect(() => {
    if (phase !== 'FIGHTING') return;

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;

      if (prev === 'active' && (next === 'inactive' || next === 'background')) {
        backgroundAtRef.current = Date.now();
      }

      if (
        (prev === 'inactive' || prev === 'background') &&
        next === 'active'
      ) {
        if (backgroundAtRef.current) {
          const sec = Math.floor(
            (Date.now() - backgroundAtRef.current) / 1000,
          );
          backgroundAtRef.current = null;
          if (sec >= 5) {
            onAppReturnRef.current(sec);
          }
        }
      }
    });

    return () => sub.remove();
  }, [phase]);

  const resetComboTracker = useCallback(() => {
    if (startedAt) {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      lastComboTickRef.current = Math.floor(elapsed / COMBO_INTERVAL_SEC);
    }
    hasEndedRef.current = false;
  }, [startedAt]);

  return { resetComboTracker };
}
