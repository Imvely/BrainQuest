import { useBattleStore } from '../useBattleStore';
import { BattleSession } from '../../types/battle';

const mockSession: BattleSession = {
  id: 1,
  userId: 1,
  plannedMin: 25,
  monsterType: 'SLIME',
  monsterMaxHp: 300,
  monsterRemainingHp: 300,
  maxCombo: 0,
  exitCount: 0,
  totalExitSec: 0,
  expEarned: 0,
  goldEarned: 0,
  startedAt: '2026-04-08T10:00:00',
};

describe('useBattleStore', () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useBattleStore.getState();
    expect(state.session).toBeNull();
    expect(state.combo).toBe(0);
    expect(state.isExited).toBe(false);
    expect(state.elapsedSec).toBe(0);
  });

  describe('setSession', () => {
    it('sets battle session', () => {
      useBattleStore.getState().setSession(mockSession);
      expect(useBattleStore.getState().session).toEqual(mockSession);
    });
  });

  describe('setCombo', () => {
    it('updates combo count', () => {
      useBattleStore.getState().setCombo(3);
      expect(useBattleStore.getState().combo).toBe(3);
    });
  });

  describe('setIsExited', () => {
    it('tracks exit state', () => {
      useBattleStore.getState().setIsExited(true);
      expect(useBattleStore.getState().isExited).toBe(true);
    });
  });

  describe('setElapsedSec', () => {
    it('updates elapsed seconds', () => {
      useBattleStore.getState().setElapsedSec(300);
      expect(useBattleStore.getState().elapsedSec).toBe(300);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useBattleStore.getState().setSession(mockSession);
      useBattleStore.getState().setCombo(5);
      useBattleStore.getState().setIsExited(true);
      useBattleStore.getState().setElapsedSec(600);

      useBattleStore.getState().reset();
      const state = useBattleStore.getState();
      expect(state.session).toBeNull();
      expect(state.combo).toBe(0);
      expect(state.isExited).toBe(false);
      expect(state.elapsedSec).toBe(0);
    });
  });
});
