import { useQuestStore } from '../useQuestStore';
import { Quest } from '../../types/quest';

const createMockQuest = (id: number, overrides?: Partial<Quest>): Quest => ({
  id,
  userId: 1,
  originalTitle: `Task ${id}`,
  questTitle: `Quest ${id}`,
  questStory: `Story for quest ${id}`,
  category: 'WORK',
  grade: 'C',
  estimatedMin: 30,
  expReward: 50,
  goldReward: 30,
  status: 'ACTIVE',
  checkpoints: [],
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
  ...overrides,
});

describe('useQuestStore', () => {
  beforeEach(() => {
    useQuestStore.setState({ quests: [], activeQuest: null });
  });

  it('has correct initial state', () => {
    const state = useQuestStore.getState();
    expect(state.quests).toEqual([]);
    expect(state.activeQuest).toBeNull();
  });

  it('setQuests replaces the quest list', () => {
    const quests = [createMockQuest(1), createMockQuest(2)];
    useQuestStore.getState().setQuests(quests);
    expect(useQuestStore.getState().quests).toHaveLength(2);
    expect(useQuestStore.getState().quests[0].id).toBe(1);
  });

  it('setActiveQuest sets the active quest', () => {
    const quest = createMockQuest(1);
    useQuestStore.getState().setActiveQuest(quest);
    expect(useQuestStore.getState().activeQuest).toEqual(quest);
  });

  it('setActiveQuest can set to null', () => {
    const quest = createMockQuest(1);
    useQuestStore.getState().setActiveQuest(quest);
    useQuestStore.getState().setActiveQuest(null);
    expect(useQuestStore.getState().activeQuest).toBeNull();
  });

  it('addQuest prepends to the quest list', () => {
    useQuestStore.getState().setQuests([createMockQuest(1)]);
    useQuestStore.getState().addQuest(createMockQuest(2));
    const state = useQuestStore.getState();
    expect(state.quests).toHaveLength(2);
    expect(state.quests[0].id).toBe(2);
    expect(state.quests[1].id).toBe(1);
  });

  it('updateQuest updates matching quest by id', () => {
    useQuestStore.getState().setQuests([createMockQuest(1), createMockQuest(2)]);
    useQuestStore.getState().updateQuest(1, { status: 'COMPLETED' });
    const state = useQuestStore.getState();
    expect(state.quests[0].status).toBe('COMPLETED');
    expect(state.quests[1].status).toBe('ACTIVE');
  });

  it('updateQuest does not modify other quests', () => {
    useQuestStore.getState().setQuests([createMockQuest(1), createMockQuest(2)]);
    useQuestStore.getState().updateQuest(99, { status: 'COMPLETED' });
    const state = useQuestStore.getState();
    expect(state.quests[0].status).toBe('ACTIVE');
    expect(state.quests[1].status).toBe('ACTIVE');
  });
});
