import { GRADE_CONFIG, requiredExpForLevel, COMBO_DAMAGE_MULTIPLIER, MAX_COMBO } from '../game';

describe('game constants', () => {
  describe('GRADE_CONFIG', () => {
    it('has all five grades', () => {
      expect(Object.keys(GRADE_CONFIG)).toEqual(['E', 'D', 'C', 'B', 'A']);
    });

    it('grades have increasing exp rewards', () => {
      expect(GRADE_CONFIG.E.exp).toBeLessThan(GRADE_CONFIG.D.exp);
      expect(GRADE_CONFIG.D.exp).toBeLessThan(GRADE_CONFIG.C.exp);
      expect(GRADE_CONFIG.C.exp).toBeLessThan(GRADE_CONFIG.B.exp);
      expect(GRADE_CONFIG.B.exp).toBeLessThan(GRADE_CONFIG.A.exp);
    });

    it('grades have increasing monster HP', () => {
      expect(GRADE_CONFIG.E.monsterHp).toBe(100);
      expect(GRADE_CONFIG.A.monsterHp).toBe(2400);
    });

    it('grades have increasing drop rates', () => {
      expect(GRADE_CONFIG.E.dropRate).toBe(0.05);
      expect(GRADE_CONFIG.A.dropRate).toBe(0.50);
    });

    it('grade A has infinite maxMin', () => {
      expect(GRADE_CONFIG.A.maxMin).toBe(Infinity);
    });
  });

  describe('requiredExpForLevel', () => {
    it('returns 50 for level 1', () => {
      expect(requiredExpForLevel(1)).toBe(50);
    });

    it('returns increasing exp for higher levels', () => {
      const level5 = requiredExpForLevel(5);
      const level10 = requiredExpForLevel(10);
      const level20 = requiredExpForLevel(20);
      expect(level5).toBeLessThan(level10);
      expect(level10).toBeLessThan(level20);
    });

    it('follows floor(50 * level^1.5) formula', () => {
      expect(requiredExpForLevel(4)).toBe(Math.floor(50 * Math.pow(4, 1.5)));
      expect(requiredExpForLevel(10)).toBe(Math.floor(50 * Math.pow(10, 1.5)));
    });
  });

  describe('combo system', () => {
    it('has 6 damage multipliers (0 to MAX_COMBO)', () => {
      expect(COMBO_DAMAGE_MULTIPLIER).toHaveLength(MAX_COMBO + 1);
    });

    it('multipliers increase from 1.0 to 2.0', () => {
      expect(COMBO_DAMAGE_MULTIPLIER[0]).toBe(1.0);
      expect(COMBO_DAMAGE_MULTIPLIER[MAX_COMBO]).toBe(2.0);
    });

    it('each multiplier is greater than previous', () => {
      for (let i = 1; i < COMBO_DAMAGE_MULTIPLIER.length; i++) {
        expect(COMBO_DAMAGE_MULTIPLIER[i]).toBeGreaterThan(COMBO_DAMAGE_MULTIPLIER[i - 1]);
      }
    });
  });
});
