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
    expect(state.sessionId).toBeNull();
    expect(state.comboCount).toBe(0);
    expect(state.exitCount).toBe(0);
    expect(state.remainingSeconds).toBe(0);
    expect(state.phase).toBe('SETUP');
  });

  describe('startFighting', () => {
    it('sets battle session and transitions to FIGHTING', () => {
      useBattleStore.getState().setPlannedMin(25);
      useBattleStore.getState().startFighting(mockSession);
      const state = useBattleStore.getState();
      expect(state.sessionId).toBe(1);
      expect(state.phase).toBe('FIGHTING');
      expect(state.monsterMaxHp).toBe(300);
      expect(state.monsterRemainingHp).toBe(300);
    });
  });

  describe('incrementCombo', () => {
    it('increments combo count up to max 5', () => {
      useBattleStore.getState().incrementCombo();
      expect(useBattleStore.getState().comboCount).toBe(1);
      for (let i = 0; i < 5; i++) useBattleStore.getState().incrementCombo();
      expect(useBattleStore.getState().comboCount).toBe(5);
    });
  });

  describe('applyDamage', () => {
    it('reduces monster HP without going below 0', () => {
      useBattleStore.getState().setPlannedMin(25);
      useBattleStore.getState().startFighting(mockSession);
      useBattleStore.getState().applyDamage(50);
      expect(useBattleStore.getState().monsterRemainingHp).toBe(250);
      useBattleStore.getState().applyDamage(999);
      expect(useBattleStore.getState().monsterRemainingHp).toBe(0);
    });
  });

  describe('handleExit', () => {
    it('increments exit count', () => {
      useBattleStore.getState().handleExit();
      expect(useBattleStore.getState().exitCount).toBe(1);
      useBattleStore.getState().handleExit();
      expect(useBattleStore.getState().exitCount).toBe(2);
    });
  });

  describe('setResult', () => {
    it('transitions to RESULT and stores rewards', () => {
      useBattleStore.getState().setResult({
        result: 'VICTORY',
        expEarned: 50,
        goldEarned: 30,
        itemDrops: [],
        levelUp: false,
        checkpointCompleted: false,
      });
      const state = useBattleStore.getState();
      expect(state.phase).toBe('RESULT');
      expect(state.result).toBe('VICTORY');
      expect(state.expEarned).toBe(50);
      expect(state.isPerfectFocus).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      useBattleStore.getState().setPlannedMin(40);
      useBattleStore.getState().startFighting(mockSession);
      useBattleStore.getState().incrementCombo();
      useBattleStore.getState().handleExit();

      useBattleStore.getState().reset();
      const state = useBattleStore.getState();
      expect(state.sessionId).toBeNull();
      expect(state.comboCount).toBe(0);
      expect(state.exitCount).toBe(0);
      expect(state.phase).toBe('SETUP');
    });
  });
});
