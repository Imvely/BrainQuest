import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    getParent: mockGetParent,
  }),
  useRoute: () => ({ params: undefined }),
}));

// ---------------------------------------------------------------------------
// Battle store mock — mutable object so each test can reconfigure
// ---------------------------------------------------------------------------
const createDefaultStore = () => ({
  phase: 'SETUP' as string,
  sessionId: null as number | null,
  questId: null as number | null,
  checkpointId: null as number | null,
  plannedMin: 25,
  remainingSeconds: 1500,
  startedAt: null as number | null,
  monsterType: 'SLIME_E',
  monsterMaxHp: 100,
  monsterRemainingHp: 100,
  characterHp: 100,
  characterMaxHp: 100,
  comboCount: 0,
  maxCombo: 0,
  exitCount: 0,
  totalExitSec: 0,
  result: null as string | null,
  expEarned: 0,
  goldEarned: 0,
  itemDrops: [] as any[],
  levelUp: false,
  newLevel: null as number | null,
  checkpointCompleted: false,
  isPerfectFocus: false,
  lastPenalty: null,
  setPhase: jest.fn(),
  setPlannedMin: jest.fn(),
  setRemainingSeconds: jest.fn(),
  startFighting: jest.fn(),
  incrementCombo: jest.fn(),
  applyDamage: jest.fn(),
  handleExit: jest.fn(),
  handleReturn: jest.fn(),
  setResult: jest.fn(),
  reset: jest.fn(),
});

let mockBattleStore = createDefaultStore();

jest.mock('../../../stores/useBattleStore', () => ({
  useBattleStore: Object.assign(
    jest.fn((selector?: any) =>
      selector ? selector(mockBattleStore) : mockBattleStore,
    ),
    {
      setState: jest.fn(),
      getState: jest.fn(() => mockBattleStore),
    },
  ),
}));

// ---------------------------------------------------------------------------
// Character store mock
// ---------------------------------------------------------------------------
jest.mock('../../../stores/useCharacterStore', () => ({
  useCharacterStore: jest.fn((selector?: any) => {
    const state = {
      character: {
        id: 1,
        name: 'Hero',
        classType: 'WARRIOR',
        level: 5,
        exp: 200,
        expToNext: 500,
        statAtk: 20,
        statWis: 10,
        statDef: 10,
        statAgi: 10,
        statHp: 100,
        gold: 100,
        appearance: {},
        equippedItems: {},
      },
    };
    return selector ? selector(state) : state;
  }),
}));

// ---------------------------------------------------------------------------
// Timeline store mock
// ---------------------------------------------------------------------------
jest.mock('../../../stores/useTimelineStore', () => ({
  useTimelineStore: jest.fn((selector?: any) => {
    const state = { nextBlock: null };
    return selector ? selector(state) : state;
  }),
}));

// ---------------------------------------------------------------------------
// Battle hooks mock
// ---------------------------------------------------------------------------
const mockStartMutate = jest.fn();
const mockEndMutate = jest.fn();
const mockExitMutate = jest.fn();
const mockReturnMutate = jest.fn();

jest.mock('../../../hooks/useBattle', () => ({
  useStartBattle: jest.fn(() => ({
    mutate: mockStartMutate,
    isPending: false,
  })),
  useEndBattle: jest.fn(() => ({
    mutate: mockEndMutate,
    isPending: false,
  })),
  useRecordExit: jest.fn(() => ({
    mutate: mockExitMutate,
    isPending: false,
  })),
  useRecordReturn: jest.fn(() => ({
    mutate: mockReturnMutate,
    isPending: false,
  })),
}));

// ---------------------------------------------------------------------------
// Battle timer mock
// ---------------------------------------------------------------------------
jest.mock('../../../hooks/useBattleTimer', () => ({
  useBattleTimer: jest.fn(() => ({
    resetComboTracker: jest.fn(),
  })),
}));

import BattleScreen from '../BattleScreen';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BattleScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBattleStore = createDefaultStore();
  });

  // =========================================================================
  // SETUP PHASE
  // =========================================================================
  describe('SETUP phase', () => {
    it('renders "전투 준비" title', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('전투 준비')).toBeTruthy();
    });

    it('shows all time selection buttons (15분, 25분 ★, 40분, 50분)', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('15분')).toBeTruthy();
      expect(getByText('25분 ★')).toBeTruthy();
      expect(getByText('40분')).toBeTruthy();
      expect(getByText('50분')).toBeTruthy();
    });

    it('shows "전투 시작!" button', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('전투 시작!')).toBeTruthy();
    });

    it('tapping time button updates monster selection', () => {
      const { getByText } = render(<BattleScreen />);
      // Default 25min = grade D = 고블린
      expect(getByText('고블린')).toBeTruthy();
      expect(getByText('등급 D')).toBeTruthy();

      // Tap 50분 => grade C = 오크
      fireEvent.press(getByText('50분'));
      expect(getByText('오크')).toBeTruthy();
      expect(getByText('등급 C')).toBeTruthy();
    });

    it('shows monster HP and reward info for selected grade', () => {
      const { getByText } = render(<BattleScreen />);
      // Default 25min = grade D: HP 300, EXP 25, Gold 15, drop 10%
      expect(getByText('HP 300')).toBeTruthy();
      expect(getByText('EXP +25')).toBeTruthy();
      expect(getByText('Gold +15')).toBeTruthy();
    });

    it('tapping 15분 shows grade D monster (슬라임 for E would be <=10)', () => {
      const { getByText } = render(<BattleScreen />);
      fireEvent.press(getByText('15분'));
      // 15min => grade D (<=30) => 고블린
      expect(getByText('고블린')).toBeTruthy();
    });

    it('shows custom stepper when 커스텀 is toggled', () => {
      const { getByText } = render(<BattleScreen />);
      fireEvent.press(getByText('커스텀'));
      expect(getByText('+5')).toBeTruthy();
      expect(getByText('-5')).toBeTruthy();
    });

    it('shows independent battle subtitle when no questId', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText(/독립 전투/)).toBeTruthy();
    });

    it('pressing "전투 시작!" calls setPlannedMin and setPhase on store', () => {
      const { getByText } = render(<BattleScreen />);
      fireEvent.press(getByText('전투 시작!'));
      expect(mockBattleStore.setPlannedMin).toHaveBeenCalledWith(25);
      expect(mockBattleStore.setPhase).toHaveBeenCalledWith('COUNTDOWN');
    });
  });

  // =========================================================================
  // COUNTDOWN PHASE
  // =========================================================================
  describe('COUNTDOWN phase', () => {
    it('renders countdown number when phase is COUNTDOWN', () => {
      mockBattleStore.phase = 'COUNTDOWN';
      const { getByText } = render(<BattleScreen />);
      // The initial countdown number is 3 (from local state default)
      expect(getByText('3')).toBeTruthy();
    });
  });

  // =========================================================================
  // FIGHTING PHASE
  // =========================================================================
  describe('FIGHTING phase', () => {
    beforeEach(() => {
      mockBattleStore.phase = 'FIGHTING';
      mockBattleStore.sessionId = 42;
      mockBattleStore.monsterMaxHp = 300;
      mockBattleStore.monsterRemainingHp = 250;
      mockBattleStore.characterHp = 100;
      mockBattleStore.characterMaxHp = 100;
      mockBattleStore.startedAt = Date.now();
      mockBattleStore.remainingSeconds = 1200;
      mockBattleStore.plannedMin = 25;
    });

    it('shows monster HP bar with HP label', () => {
      const { getAllByText } = render(<BattleScreen />);
      // HpBar component renders "HP" label
      const hpLabels = getAllByText('HP');
      expect(hpLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('shows monster HP values (current/max)', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('250/300')).toBeTruthy();
    });

    it('shows combo gauge', () => {
      mockBattleStore.comboCount = 3;
      const { getByText } = render(<BattleScreen />);
      // ComboGauge renders "x{count}" when count > 0
      expect(getByText('x3')).toBeTruthy();
    });

    it('shows "포기하기" button', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('포기하기')).toBeTruthy();
    });

    it('pressing "포기하기" shows confirmation alert', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<BattleScreen />);
      fireEvent.press(getByText('포기하기'));
      expect(alertSpy).toHaveBeenCalledWith(
        '전투 포기',
        expect.stringContaining('보상을 받을 수 없습니다'),
        expect.any(Array),
      );
      alertSpy.mockRestore();
    });

    it('shows remaining time as formatted mm:ss', () => {
      mockBattleStore.remainingSeconds = 1200; // 20:00
      const { getByText } = render(<BattleScreen />);
      expect(getByText('20:00')).toBeTruthy();
    });

    it('shows character HP bar', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('100/100')).toBeTruthy();
    });

    it('shows monster name for the fight grade', () => {
      mockBattleStore.plannedMin = 25; // grade D => 고블린
      const { getByText } = render(<BattleScreen />);
      expect(getByText('고블린')).toBeTruthy();
    });
  });

  // =========================================================================
  // RESULT PHASE — VICTORY
  // =========================================================================
  describe('RESULT phase - VICTORY', () => {
    beforeEach(() => {
      mockBattleStore.phase = 'RESULT';
      mockBattleStore.result = 'VICTORY';
      mockBattleStore.expEarned = 150;
      mockBattleStore.goldEarned = 80;
      mockBattleStore.exitCount = 1;
      mockBattleStore.maxCombo = 3;
      mockBattleStore.plannedMin = 25;
      mockBattleStore.itemDrops = [];
      mockBattleStore.isPerfectFocus = false;
    });

    it('shows "VICTORY!" text', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('VICTORY!')).toBeTruthy();
    });

    it('shows earned EXP and Gold', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('EXP +150')).toBeTruthy();
      expect(getByText('Gold +80')).toBeTruthy();
    });

    it('shows battle stats (session time, exit count, max combo, monster name)', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('25분')).toBeTruthy();
      expect(getByText('1회')).toBeTruthy();
      expect(getByText('x3')).toBeTruthy();
    });

    it('shows "다음 전투!" and "홈으로" buttons', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('다음 전투!')).toBeTruthy();
      expect(getByText('홈으로')).toBeTruthy();
    });

    it('pressing "다음 전투!" resets the store', () => {
      const { getByText } = render(<BattleScreen />);
      fireEvent.press(getByText('다음 전투!'));
      expect(mockBattleStore.reset).toHaveBeenCalled();
    });

    it('pressing "홈으로" resets store and navigates to Map', () => {
      const { getByText } = render(<BattleScreen />);
      fireEvent.press(getByText('홈으로'));
      expect(mockBattleStore.reset).toHaveBeenCalled();
      expect(mockGetParent).toHaveBeenCalled();
    });

    it('shows item drops when present', () => {
      mockBattleStore.itemDrops = [
        { itemId: 1, name: '전사의 검', rarity: 'RARE' },
      ];
      const { getByText } = render(<BattleScreen />);
      expect(getByText('전사의 검')).toBeTruthy();
      expect(getByText('RARE')).toBeTruthy();
    });

    it('shows "Perfect Focus!" badge when isPerfectFocus is true', () => {
      mockBattleStore.isPerfectFocus = true;
      const { getByText } = render(<BattleScreen />);
      expect(getByText(/Perfect Focus/)).toBeTruthy();
    });

    it('shows LEVEL UP banner when levelUp is true', () => {
      mockBattleStore.levelUp = true;
      mockBattleStore.newLevel = 6;
      const { getByText } = render(<BattleScreen />);
      expect(getByText('LEVEL UP!')).toBeTruthy();
      expect(getByText('Lv. 6')).toBeTruthy();
    });
  });

  // =========================================================================
  // RESULT PHASE — DEFEAT
  // =========================================================================
  describe('RESULT phase - DEFEAT', () => {
    beforeEach(() => {
      mockBattleStore.phase = 'RESULT';
      mockBattleStore.result = 'DEFEAT';
      mockBattleStore.expEarned = 10;
      mockBattleStore.goldEarned = 5;
    });

    it('shows defeat title "아쉽게 놓쳤어요..."', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('아쉽게 놓쳤어요...')).toBeTruthy();
    });

    it('shows encouraging message', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText(/다시 도전하는 것 자체가 경험치입니다/)).toBeTruthy();
    });

    it('shows reduced EXP and Gold', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('EXP +10')).toBeTruthy();
      expect(getByText('Gold +5')).toBeTruthy();
    });

    it('shows "다시 도전!" and "나중에 하기" buttons', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('다시 도전!')).toBeTruthy();
      expect(getByText('나중에 하기')).toBeTruthy();
    });
  });

  // =========================================================================
  // RESULT PHASE — ABANDON
  // =========================================================================
  describe('RESULT phase - ABANDON', () => {
    beforeEach(() => {
      mockBattleStore.phase = 'RESULT';
      mockBattleStore.result = 'ABANDON';
    });

    it('shows abandon title "전투를 포기했습니다"', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('전투를 포기했습니다')).toBeTruthy();
    });

    it('shows "보상 없음" message', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('보상 없음')).toBeTruthy();
    });

    it('shows "홈으로" button', () => {
      const { getByText } = render(<BattleScreen />);
      expect(getByText('홈으로')).toBeTruthy();
    });
  });
});
