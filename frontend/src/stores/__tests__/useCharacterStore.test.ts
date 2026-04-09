import { useCharacterStore } from '../useCharacterStore';
import { Character } from '../../types/character';

const mockCharacter: Character = {
  id: 1,
  userId: 1,
  name: 'Hero',
  classType: 'WARRIOR',
  level: 5,
  exp: 50,
  expToNext: 559,
  statAtk: 15,
  statWis: 12,
  statDef: 10,
  statAgi: 10,
  statHp: 100,
  gold: 200,
  appearance: { hair: 'style1', outfit: 'outfit1', color: '#FF0000' },
  equippedItems: { helmet: null, armor: null, weapon: null, accessory: null },
};

describe('useCharacterStore', () => {
  beforeEach(() => {
    useCharacterStore.setState({ character: null });
  });

  it('has initial state with character=null', () => {
    const state = useCharacterStore.getState();
    expect(state.character).toBeNull();
  });

  it('setCharacter stores character object', () => {
    useCharacterStore.getState().setCharacter(mockCharacter);
    const state = useCharacterStore.getState();
    expect(state.character).toEqual(mockCharacter);
  });

  it('addExp increases character exp', () => {
    useCharacterStore.getState().setCharacter(mockCharacter);
    useCharacterStore.getState().addExp(30);
    const state = useCharacterStore.getState();
    expect(state.character!.exp).toBe(80);
  });

  it('addGold increases character gold', () => {
    useCharacterStore.getState().setCharacter(mockCharacter);
    useCharacterStore.getState().addGold(100);
    const state = useCharacterStore.getState();
    expect(state.character!.gold).toBe(300);
  });

  it('addExp with null character does nothing', () => {
    useCharacterStore.getState().addExp(30);
    const state = useCharacterStore.getState();
    expect(state.character).toBeNull();
  });

  it('addGold with null character does nothing', () => {
    useCharacterStore.getState().addGold(100);
    const state = useCharacterStore.getState();
    expect(state.character).toBeNull();
  });
});
