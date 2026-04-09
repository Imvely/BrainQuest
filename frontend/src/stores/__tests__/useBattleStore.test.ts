import { useBattleStore } from '../useBattleStore';
import { BattleSession } from '../../types/battle';

const mockSession: BattleSession = {
  id: 1,
  userId: 1,
  questId: 10,
  checkpointId: 20,
  plannedMin: 25,
  monsterType: 'goblin',
  monsterMaxHp: 300,
  monsterRemainingHp: 300,
  maxCombo: 0,
  exitCount: 0,
  totalExitSec: 0,
  expEarned: 0,
  goldEarned: 0,
  startedAt: '2024-01-01T12:00:00',
};

describe('useBattleStore', () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useBattleStore.getState();
    expect(state.phase).toBe('SETUP');
    expect(state.sessionId).toBeNull();
    expect(state.plannedMin).toBe(25);
    expect(state.comboCount).toBe(0);
    expect(state.monsterMaxHp).toBe(0);
    expect(state.result).toBeNull();
    expect(state.itemDrops).toEqual([]);
  });

  it('setPhase updates the phase', () => {
    useBattleStore.getState().setPhase('COUNTDOWN');
    expect(useBattleStore.getState().phase).toBe('COUNTDOWN');
  });

  it('setPlannedMin updates planned minutes', () => {
    useBattleStore.getState().setPlannedMin(45);
    expect(useBattleStore.getState().plannedMin).toBe(45);
  });

  it('setRemainingSeconds updates remaining seconds', () => {
    useBattleStore.getState().setRemainingSeconds(120);
    expect(useBattleStore.getState().remainingSeconds).toBe(120);
  });

  it('startFighting transitions to FIGHTING with session data', () => {
    useBattleStore.getState().startFighting(mockSession);
    const state = useBattleStore.getState();
    expect(state.phase).toBe('FIGHTING');
    expect(state.sessionId).toBe(1);
    expect(state.questId).toBe(10);
    expect(state.checkpointId).toBe(20);
    expect(state.monsterType).toBe('goblin');
    expect(state.monsterMaxHp).toBe(300);
    expect(state.monsterRemainingHp).toBe(300);
    expect(state.remainingSeconds).toBe(25 * 60);
    expect(state.startedAt).toBeTruthy();
  });

  it('incrementCombo increases combo up to max 5', () => {
    useBattleStore.getState().incrementCombo();
    expect(useBattleStore.getState().comboCount).toBe(1);

    useBattleStore.getState().incrementCombo();
    useBattleStore.getState().incrementCombo();
    useBattleStore.getState().incrementCombo();
    useBattleStore.getState().incrementCombo();
    expect(useBattleStore.getState().comboCount).toBe(5);

    // Should not exceed 5
    useBattleStore.getState().incrementCombo();
    expect(useBattleStore.getState().comboCount).toBe(5);
  });

  it('incrementCombo tracks maxCombo', () => {
    useBattleStore.getState().incrementCombo();
    useBattleStore.getState().incrementCombo();
    useBattleStore.getState().incrementCombo();
    expect(useBattleStore.getState().maxCombo).toBe(3);
  });

  it('applyDamage reduces monster HP but not below 0', () => {
    useBattleStore.getState().startFighting(mockSession);
    useBattleStore.getState().applyDamage(100);
    expect(useBattleStore.getState().monsterRemainingHp).toBe(200);

    useBattleStore.getState().applyDamage(500);
    expect(useBattleStore.getState().monsterRemainingHp).toBe(0);
  });

  it('handleExit increments exit count', () => {
    useBattleStore.getState().handleExit();
    expect(useBattleStore.getState().exitCount).toBe(1);
    useBattleStore.getState().handleExit();
    expect(useBattleStore.getState().exitCount).toBe(2);
  });

  it('handleReturn resets combo and applies penalty', () => {
    useBattleStore.getState().startFighting(mockSession);
    useBattleStore.getState().incrementCombo();
    useBattleStore.getState().incrementCombo();
    expect(useBattleStore.getState().comboCount).toBe(2);

    useBattleStore.getState().handleReturn('HP_RECOVER', 330);
    const state = useBattleStore.getState();
    expect(state.comboCount).toBe(0);
    expect(state.lastPenalty).toBe('HP_RECOVER');
    expect(state.monsterRemainingHp).toBe(330);
  });

  it('handleReturn can update characterHp', () => {
    useBattleStore.getState().startFighting(mockSession);
    useBattleStore.getState().handleReturn('HP_DAMAGE', 300, 80);
    expect(useBattleStore.getState().characterHp).toBe(80);
  });

  it('setResult transitions to RESULT phase with reward data', () => {
    useBattleStore.getState().startFighting(mockSession);
    useBattleStore.getState().setResult({
      result: 'VICTORY',
      expEarned: 50,
      goldEarned: 30,
      itemDrops: [{ itemId: 1, name: 'Sword', rarity: 'COMMON' }],
      levelUp: true,
      newLevel: 6,
      checkpointCompleted: true,
    });
    const state = useBattleStore.getState();
    expect(state.phase).toBe('RESULT');
    expect(state.result).toBe('VICTORY');
    expect(state.expEarned).toBe(50);
    expect(state.goldEarned).toBe(30);
    expect(state.itemDrops).toHaveLength(1);
    expect(state.levelUp).toBe(true);
    expect(state.newLevel).toBe(6);
    expect(state.checkpointCompleted).toBe(true);
  });

  it('setResult marks isPerfectFocus when no exits and victory', () => {
    useBattleStore.getState().startFighting(mockSession);
    // exitCount is 0 by default after startFighting
    useBattleStore.getState().setResult({
      result: 'VICTORY',
      expEarned: 50,
      goldEarned: 30,
      itemDrops: [],
      levelUp: false,
      checkpointCompleted: false,
    });
    expect(useBattleStore.getState().isPerfectFocus).toBe(true);
  });

  it('setResult isPerfectFocus is false when there are exits', () => {
    useBattleStore.getState().startFighting(mockSession);
    useBattleStore.getState().handleExit();
    useBattleStore.getState().setResult({
      result: 'VICTORY',
      expEarned: 50,
      goldEarned: 30,
      itemDrops: [],
      levelUp: false,
      checkpointCompleted: false,
    });
    expect(useBattleStore.getState().isPerfectFocus).toBe(false);
  });

  it('reset restores initial state', () => {
    useBattleStore.getState().startFighting(mockSession);
    useBattleStore.getState().incrementCombo();
    useBattleStore.getState().reset();
    const state = useBattleStore.getState();
    expect(state.phase).toBe('SETUP');
    expect(state.sessionId).toBeNull();
    expect(state.comboCount).toBe(0);
    expect(state.monsterMaxHp).toBe(0);
  });
});
