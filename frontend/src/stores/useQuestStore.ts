import { create } from 'zustand';
import { Quest } from '../types/quest';

interface QuestState {
  quests: Quest[];
  activeQuest: Quest | null;
  setQuests: (quests: Quest[]) => void;
  setActiveQuest: (quest: Quest | null) => void;
  addQuest: (quest: Quest) => void;
  updateQuest: (id: number, updates: Partial<Quest>) => void;
}

export const useQuestStore = create<QuestState>((set) => ({
  quests: [],
  activeQuest: null,

  setQuests: (quests) => set({ quests }),
  setActiveQuest: (quest) => set({ activeQuest: quest }),

  addQuest: (quest) =>
    set((state) => ({ quests: [quest, ...state.quests] })),

  updateQuest: (id, updates) =>
    set((state) => ({
      quests: state.quests.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    })),
}));
