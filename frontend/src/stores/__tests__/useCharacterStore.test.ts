import { useCharacterStore } from '../useCharacterStore';
import { Character } from '../../types/character';

const mockCharacter: Character = {
  id: 1,
  userId: 1,
  name: '용사',
  classType: 'WARRIOR',
  level: 5,
  exp: 200,
  expToNext: 559,
  statAtk: 15,
  statWis: 12,
  statDef: 10,
  statAgi: 11,
  statHp: 120,
  gold: 500,
  appearance: { hair: 'style1', outfit: 'outfit1', color: '#FF0000' },
  equippedItems: { helmet: null, armor: null, weapon: 1, accessory: null },
};

describe('useCharacterStore', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: null });
  });

  it('has null character initially', () => {
    expect(useCharacterStore.getState().character).toBeNull();
  });

  describe('setCharacter', () => {
    it('sets the character', () => {
      useCharacterStore.getState().setCharacter(mockCharacter);
      expect(useCharacterStore.getState().character).toEqual(mockCharacter);
    });
  });

  describe('addExp', () => {
    it('adds exp to current character', () => {
      useCharacterStore.getState().setCharacter(mockCharacter);
      useCharacterStore.getState().addExp(50);
      expect(useCharacterStore.getState().character!.exp).toBe(250);
    });

    it('does nothing when no character is set', () => {
      useCharacterStore.getState().addExp(50);
      expect(useCharacterStore.getState().character).toBeNull();
    });
  });

  describe('addGold', () => {
    it('adds gold to current character', () => {
      useCharacterStore.getState().setCharacter(mockCharacter);
      useCharacterStore.getState().addGold(100);
      expect(useCharacterStore.getState().character!.gold).toBe(600);
    });

    it('does nothing when no character is set', () => {
      useCharacterStore.getState().addGold(100);
      expect(useCharacterStore.getState().character).toBeNull();
    });
  });
});
