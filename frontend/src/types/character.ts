export type ClassType = 'WARRIOR' | 'MAGE' | 'RANGER';
export type ItemSlot = 'HELMET' | 'ARMOR' | 'WEAPON' | 'ACCESSORY';
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

/**
 * 캐릭터 스탯 — 백엔드 {@code CharacterResponse.StatsResponse}.
 */
export interface CharacterStats {
  atk: number;
  wis: number;
  def: number;
  agi: number;
  hp: number;
}

/**
 * 캐릭터 — 백엔드 {@code CharacterResponse}.
 * <p><b>주요 변경사항</b>: 스탯은 중첩된 {@code stats} 객체로 반환되며,
 * flat 필드({@code statAtk} 등)는 백엔드 응답에 포함되지 않는다.
 * 레거시 코드 호환을 위해 flat 필드는 optional로 유지.</p>
 * <p>{@code equippedItems}는 슬롯명 lowercase → {@code ItemResponse} 매핑.</p>
 */
export interface Character {
  id: number;
  name: string;
  classType: ClassType;
  level: number;
  exp: number;
  expToNext: number;
  /** 백엔드 응답에서 온 실제 스탯 */
  stats: CharacterStats;
  gold: number;
  appearance: CharacterAppearance;
  /** 백엔드: {@code Map<String, ItemResponse>} (슬롯 소문자 키) */
  equippedItems: Record<string, Item>;

  // --- Legacy flat stat fields (optional, 백엔드 미포함) ---
  // TODO: 모든 콜사이트가 `stats` 중첩 객체로 전환되면 삭제 예정.
  statAtk?: number;
  statWis?: number;
  statDef?: number;
  statAgi?: number;
  statHp?: number;
  userId?: number;
}

export interface CharacterAppearance {
  hair: string;
  outfit: string;
  color: string;
  [key: string]: string;
}

/**
 * 아이템 마스터 데이터 — 백엔드 {@code ItemResponse}.
 */
export interface Item {
  id: number;
  name: string;
  description?: string;
  slot: ItemSlot;
  rarity: Rarity;
  /** {@code { atk, def, wis, agi, hp }} — 일부 또는 전부 */
  statBonus: Partial<CharacterStats>;
  imageUrl?: string;
}

export type StatBonus = Partial<CharacterStats>;

/**
 * 보유 아이템 — 백엔드 {@code UserItemResponse}.
 * <p>{@code userId}는 백엔드 응답에 포함되지 않는다.</p>
 */
export interface UserItem {
  id: number;
  item: Item;
  acquiredAt: string;
  source: 'BATTLE_DROP' | 'QUEST_REWARD' | 'LEVEL_UP' | 'SHOP';
  userId?: number; // legacy, 백엔드 미포함
}
