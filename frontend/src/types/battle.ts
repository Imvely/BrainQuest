import { UserItem } from './character';

export type BattleResult = 'VICTORY' | 'DEFEAT' | 'ABANDON';
export type PenaltyType = 'COMBO_RESET' | 'HP_RECOVER' | 'HP_DAMAGE' | 'DEFEAT';
export type BattlePhase = 'SETUP' | 'COUNTDOWN' | 'FIGHTING' | 'RESULT';

/**
 * 전투 시작 요청 — 백엔드 {@code StartBattleRequest}.
 * {@code plannedMin}은 5-60 범위 필수.
 */
export interface BattleStartRequest {
  plannedMin: number;
  questId?: number;
  checkpointId?: number;
}

/**
 * 전투 시작 응답 — 백엔드 {@code StartBattleResponse}.
 * <p>{@code sessionId} + 몬스터 정보만 반환 (전체 세션 엔티티 아님).</p>
 */
export interface BattleStartResponse {
  sessionId: number;
  monster: MonsterResponse;
  plannedMin: number;
}

export interface MonsterResponse {
  /** "슬라임" / "고블린" / "오크" / "드래곤" / "마왕" */
  type: string;
  maxHp: number;
}

/**
 * 전투 종료 요청 — 백엔드 {@code EndBattleRequest}.
 */
export interface BattleEndRequest {
  result: BattleResult;
  maxCombo: number;
}

/**
 * 전투 종료 응답 — 백엔드 {@code EndBattleResponse}.
 * <p><b>주요 변경사항</b>:</p>
 * <ul>
 *   <li>{@code itemDrops: ItemDrop[]} → {@code itemDrop: UserItemResponse | null} (단수)</li>
 *   <li>{@code levelUp: boolean} → {@code levelUp: number | null} (새 레벨 또는 null)</li>
 *   <li>{@code checkpointCompleted} 필드 없음 (이벤트 기반 처리)</li>
 * </ul>
 */
export interface BattleEndResponse {
  result: BattleResult;
  actualMin: number;
  expEarned: number;
  goldEarned: number;
  maxCombo: number;
  exitCount: number;
  perfectFocus: boolean;
  /** null이면 레벨업 없음, 숫자면 새 레벨 */
  levelUp: number | null;
  /** null이면 드롭 없음 */
  itemDrop: UserItem | null;
}

/**
 * 이탈 기록 응답 — 백엔드 {@code ExitResponse}.
 * <p>이탈 시점에는 페널티가 결정되지 않고 복귀 시 {@code ReturnResponse}에서 확정된다.</p>
 */
export interface BattleExitResponse {
  exitId: number;
}

/**
 * 복귀 기록 응답 — 백엔드 {@code ReturnResponse}.
 * <p>필드명 주의: {@code remainingTimeSec} ({@code remainingSeconds} 아님).</p>
 */
export interface BattleReturnResponse {
  penaltyType: PenaltyType;
  durationSec: number;
  monsterRemainingHp: number;
  remainingTimeSec: number;
}

/**
 * 전투 기록 응답 — 백엔드 {@code BattleHistoryResponse}.
 */
export interface BattleHistoryItem {
  id: number;
  questTitle?: string;
  plannedMin: number;
  actualMin?: number;
  result: BattleResult;
  expEarned: number;
  startedAt: string;
}

/**
 * 전체 세션 엔티티 (클라이언트 로컬 상태 관리용).
 * <p>백엔드는 엔티티 전체를 반환하지 않으며, 시작/종료 시 필요한 부분만 반환한다.
 * 프론트는 이 타입을 로컬 스토어에서 사용.</p>
 */
export interface BattleSession {
  id: number;
  userId?: number;
  questId?: number;
  checkpointId?: number;
  plannedMin: number;
  actualMin?: number;
  monsterType: string;
  monsterMaxHp: number;
  monsterRemainingHp: number;
  maxCombo: number;
  exitCount: number;
  totalExitSec: number;
  result?: BattleResult;
  expEarned: number;
  goldEarned: number;
  itemDrops?: ItemDrop[];
  startedAt: string;
  endedAt?: string;
}

/**
 * 레거시: 로컬 스토어에서만 사용되는 간단한 드롭 객체.
 * <p>백엔드 응답의 {@code itemDrop}는 {@code UserItem} 전체 엔티티.</p>
 */
export interface ItemDrop {
  itemId: number;
  name: string;
  rarity: string;
}

/**
 * 이탈 기록 엔티티 (로컬 상태용).
 */
export interface BattleExit {
  id: number;
  sessionId: number;
  exitAt: string;
  returnAt?: string;
  durationSec?: number;
  penaltyType: PenaltyType;
}
