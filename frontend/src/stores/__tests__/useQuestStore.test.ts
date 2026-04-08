import { useQuestStore } from '../useQuestStore';
import { Quest } from '../../types/quest';

const mockQuest: Quest = {
  id: 1,
  userId: 1,
  originalTitle: '보고서 작성',
  questTitle: '지식의 두루마리 작성',
  questStory: '왕국의 기록을 남기는 중대한 임무입니다.',
  category: 'WORK',
  grade: 'C',
  estimatedMin: 60,
  expReward: 50,
  goldReward: 30,
  status: 'ACTIVE',
  checkpoints: [],
  createdAt: '2026-04-08T00:00:00',
  updatedAt: '2026-04-08T00:00:00',
};

describe('useQuestStore', () => {
  beforeEach(() => {
    useQuestStore.setState({ quests: [], activeQuest: null });
  });

  describe('setQuests', () => {
    it('sets the quest list', () => {
      useQuestStore.getState().setQuests([mockQuest]);
      expect(useQuestStore.getState().quests).toHaveLength(1);
    });
  });

  describe('addQuest', () => {
    it('prepends a quest to the list', () => {
      const quest2 = { ...mockQuest, id: 2, questTitle: '두 번째 퀘스트' };
      useQuestStore.getState().setQuests([mockQuest]);
      useQuestStore.getState().addQuest(quest2);
      expect(useQuestStore.getState().quests).toHaveLength(2);
      expect(useQuestStore.getState().quests[0].id).toBe(2);
    });
  });

  describe('updateQuest', () => {
    it('updates a quest by id', () => {
      useQuestStore.getState().setQuests([mockQuest]);
      useQuestStore.getState().updateQuest(1, { status: 'COMPLETED' });
      expect(useQuestStore.getState().quests[0].status).toBe('COMPLETED');
    });

    it('does not affect other quests', () => {
      const quest2 = { ...mockQuest, id: 2 };
      useQuestStore.getState().setQuests([mockQuest, quest2]);
      useQuestStore.getState().updateQuest(1, { status: 'COMPLETED' });
      expect(useQuestStore.getState().quests[1].status).toBe('ACTIVE');
    });
  });

  describe('setActiveQuest', () => {
    it('sets active quest', () => {
      useQuestStore.getState().setActiveQuest(mockQuest);
      expect(useQuestStore.getState().activeQuest).toEqual(mockQuest);
    });

    it('clears active quest with null', () => {
      useQuestStore.getState().setActiveQuest(mockQuest);
      useQuestStore.getState().setActiveQuest(null);
      expect(useQuestStore.getState().activeQuest).toBeNull();
    });
  });
});
