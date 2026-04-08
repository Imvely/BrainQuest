export type ClassType = 'WARRIOR' | 'MAGE' | 'RANGER';
export type ItemSlot = 'HELMET' | 'ARMOR' | 'WEAPON' | 'ACCESSORY';
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface Character {
  id: number;
  userId: number;
  name: string;
  classType: ClassType;
  level: number;
  exp: number;
  expToNext: number;
  statAtk: number;
  statWis: number;
  statDef: number;
  statAgi: number;
  statHp: number;
  gold: number;
  appearance: CharacterAppearance;
  equippedItems: EquippedItems;
}

export interface CharacterAppearance {
  hair: string;
  outfit: string;
  color: string;
}

export interface EquippedItems {
  helmet: number | null;
  armor: number | null;
  weapon: number | null;
  accessory: number | null;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  slot: ItemSlot;
  rarity: Rarity;
  statBonus: StatBonus;
  imageUrl?: string;
}

export interface StatBonus {
  atk: number;
  def: number;
  wis: number;
  agi: number;
  hp: number;
}

export interface UserItem {
  id: number;
  userId: number;
  item: Item;
  acquiredAt: string;
  source: 'BATTLE_DROP' | 'QUEST_REWARD' | 'LEVEL_UP' | 'SHOP';
}
