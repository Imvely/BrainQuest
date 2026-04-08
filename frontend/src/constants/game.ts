export type QuestGrade = 'E' | 'D' | 'C' | 'B' | 'A';

export const GRADE_CONFIG: Record<QuestGrade, {
  maxMin: number;
  exp: number;
  gold: number;
  monsterHp: number;
  dropRate: number;
}> = {
  E: { maxMin: 10, exp: 10, gold: 5, monsterHp: 100, dropRate: 0.05 },
  D: { maxMin: 30, exp: 25, gold: 15, monsterHp: 300, dropRate: 0.10 },
  C: { maxMin: 60, exp: 50, gold: 30, monsterHp: 600, dropRate: 0.20 },
  B: { maxMin: 120, exp: 100, gold: 60, monsterHp: 1200, dropRate: 0.35 },
  A: { maxMin: Infinity, exp: 200, gold: 120, monsterHp: 2400, dropRate: 0.50 },
};

export const COMBO_INTERVAL_SEC = 300; // 5분마다 콤보 증가
export const MAX_COMBO = 5;
export const COMBO_DAMAGE_MULTIPLIER = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0];

export const EXIT_PENALTY_THRESHOLDS = {
  COMBO_RESET: 30,     // ≤30초: 콤보 리셋만
  HP_RECOVER_10: 60,   // 30~60초: 몬스터 HP 10% 회복
  HP_DAMAGE_20: 120,   // 60~120초: 캐릭터 HP 20% 감소
  HP_DAMAGE_50: 300,   // 120~300초: 캐릭터 HP 50% 감소
  AUTO_DEFEAT: 301,    // >300초: 자동 패배
} as const;

export const STREAK_BONUS: Record<number, { exp: number; item?: boolean; rarity?: string }> = {
  7: { exp: 50 },
  14: { exp: 100 },
  30: { exp: 200, item: true },
  60: { exp: 500, item: true, rarity: 'RARE' },
  100: { exp: 1000, item: true, rarity: 'LEGENDARY' },
};

export function requiredExpForLevel(level: number): number {
  return Math.floor(50 * Math.pow(level, 1.5));
}
