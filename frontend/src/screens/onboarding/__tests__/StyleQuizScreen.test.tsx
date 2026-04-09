import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import StyleQuizScreen from '../StyleQuizScreen';

// --- Mocks ---

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// --- Tests ---

describe('StyleQuizScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // 1. Initial Rendering
  // ===========================================
  describe('rendering', () => {
    it('renders first question "아침에 알람이 울렸다!"', () => {
      const { getByText } = render(<StyleQuizScreen />);
      expect(getByText(/아침에 알람이 울렸다/)).toBeTruthy();
    });

    it('renders 3 options for Q1', () => {
      const { getByText } = render(<StyleQuizScreen />);
      expect(getByText('5분만... 5분만...')).toBeTruthy();
      expect(getByText('바로 일어나서 준비 시작!')).toBeTruthy();
      expect(getByText('30분 뒤에 깜짝 기상')).toBeTruthy();
    });

    it('renders back button and progress bar', () => {
      const { getByText } = render(<StyleQuizScreen />);
      expect(getByText('<')).toBeTruthy();
      expect(getByText('스타일 퀴즈')).toBeTruthy();
    });

    it('shows counter "1 / 5"', () => {
      const { getByText } = render(<StyleQuizScreen />);
      expect(getByText('1 / 5')).toBeTruthy();
    });
  });

  // ===========================================
  // 2. Quiz Progression
  // ===========================================
  describe('quiz progression', () => {
    it('tapping option advances to next question', () => {
      const { getByText } = render(<StyleQuizScreen />);
      fireEvent.press(getByText('5분만... 5분만...'));
      expect(getByText('2 / 5')).toBeTruthy();
    });

    it('Q2 has 4 options', () => {
      const { getByText } = render(<StyleQuizScreen />);
      // Answer Q1 to advance to Q2
      fireEvent.press(getByText('5분만... 5분만...'));

      expect(getByText(/떠오른 아이디어/)).toBeTruthy();
      expect(getByText('바로 손들고 말한다')).toBeTruthy();
      expect(getByText('조용히 메모해둔다')).toBeTruthy();
      expect(getByText('...뭐였더라?')).toBeTruthy();
      expect(getByText('아이디어에서 딴생각으로...')).toBeTruthy();
    });

    it('advances through all questions to Q5', () => {
      const { getByText } = render(<StyleQuizScreen />);
      // Q1 -> Q2
      fireEvent.press(getByText('5분만... 5분만...'));
      expect(getByText('2 / 5')).toBeTruthy();

      // Q2 -> Q3
      fireEvent.press(getByText('바로 손들고 말한다'));
      expect(getByText('3 / 5')).toBeTruthy();

      // Q3 -> Q4
      fireEvent.press(getByText(/새벽이나 오전/));
      expect(getByText('4 / 5')).toBeTruthy();

      // Q4 -> Q5
      fireEvent.press(getByText(/마감 순서대로 정리/));
      expect(getByText('5 / 5')).toBeTruthy();
    });
  });

  // ===========================================
  // 3. Result Screen - Class Determination
  // ===========================================
  describe('class determination', () => {
    // Helper to answer all 5 questions with a specific class
    function answerAllWarrior(rendered: ReturnType<typeof render>) {
      const { getByText } = rendered;
      // Q1: WARRIOR
      fireEvent.press(getByText('5분만... 5분만...'));
      // Q2: WARRIOR
      fireEvent.press(getByText('바로 손들고 말한다'));
      // Q3: WARRIOR
      fireEvent.press(getByText(/새벽이나 오전/));
      // Q4: WARRIOR
      fireEvent.press(getByText(/마감 순서대로 정리/));
      // Q5: WARRIOR
      fireEvent.press(getByText(/정확히 5분 후 복귀/));
    }

    function answerAllMage(rendered: ReturnType<typeof render>) {
      const { getByText } = rendered;
      // Q1: MAGE
      fireEvent.press(getByText('30분 뒤에 깜짝 기상'));
      // Q2: MAGE
      fireEvent.press(getByText('...뭐였더라?'));
      // Q3: MAGE
      fireEvent.press(getByText('밤'));
      // Q4: MAGE
      fireEvent.press(getByText('...일단 멍'));
      // Q5: MAGE
      fireEvent.press(getByText('1시간이 지나있다'));
    }

    function answerAllRanger(rendered: ReturnType<typeof render>) {
      const { getByText } = rendered;
      // Q1: RANGER
      fireEvent.press(getByText('바로 일어나서 준비 시작!'));
      // Q2: RANGER
      fireEvent.press(getByText('조용히 메모해둔다'));
      // Q3: RANGER
      fireEvent.press(getByText('오후'));
      // Q4: RANGER
      fireEvent.press(getByText(/쉬운 것부터 하나씩/));
      // Q5: RANGER
      fireEvent.press(getByText(/15분 정도 쉬었다/));
    }

    it('after all 5 answers shows result screen', () => {
      const rendered = render(<StyleQuizScreen />);
      answerAllWarrior(rendered);
      expect(rendered.getByText('당신의 모험 스타일은')).toBeTruthy();
    });

    it('all WARRIOR answers shows 워리어 result', () => {
      const rendered = render(<StyleQuizScreen />);
      answerAllWarrior(rendered);
      expect(rendered.getByText('워리어')).toBeTruthy();
    });

    it('all MAGE answers shows 메이지 result', () => {
      const rendered = render(<StyleQuizScreen />);
      answerAllMage(rendered);
      expect(rendered.getByText('메이지')).toBeTruthy();
    });

    it('all RANGER answers shows 레인저 result', () => {
      const rendered = render(<StyleQuizScreen />);
      answerAllRanger(rendered);
      expect(rendered.getByText('레인저')).toBeTruthy();
    });

    it('result shows class emoji, title, description, and session pattern', () => {
      const rendered = render(<StyleQuizScreen />);
      answerAllWarrior(rendered);
      expect(rendered.getByText('당신의 모험 스타일은')).toBeTruthy();
      expect(rendered.getByText('워리어')).toBeTruthy();
      expect(rendered.getByText(/폭발적 집중력의 소유자/)).toBeTruthy();
      expect(rendered.getByText(/추천 세션: 15~25분/)).toBeTruthy();
    });

    it('MAGE result shows correct description and session pattern', () => {
      const rendered = render(<StyleQuizScreen />);
      answerAllMage(rendered);
      expect(rendered.getByText('메이지')).toBeTruthy();
      expect(rendered.getByText(/깊은 몰입의 마법사/)).toBeTruthy();
      expect(rendered.getByText(/추천 세션: 25~40분/)).toBeTruthy();
    });

    it('RANGER result shows correct description and session pattern', () => {
      const rendered = render(<StyleQuizScreen />);
      answerAllRanger(rendered);
      expect(rendered.getByText('레인저')).toBeTruthy();
      expect(rendered.getByText(/변화무쌍한 적응의 달인/)).toBeTruthy();
      expect(rendered.getByText(/추천 세션: 유동적/)).toBeTruthy();
    });
  });

  // ===========================================
  // 4. Result Screen - Navigation
  // ===========================================
  describe('result screen navigation', () => {
    function answerAllWarrior(rendered: ReturnType<typeof render>) {
      const { getByText } = rendered;
      fireEvent.press(getByText('5분만... 5분만...'));
      fireEvent.press(getByText('바로 손들고 말한다'));
      fireEvent.press(getByText(/새벽이나 오전/));
      fireEvent.press(getByText(/마감 순서대로 정리/));
      fireEvent.press(getByText(/정확히 5분 후 복귀/));
    }

    it('"캐릭터 만들기" button navigates to CharacterCreate with classType', () => {
      const rendered = render(<StyleQuizScreen />);
      answerAllWarrior(rendered);
      fireEvent.press(rendered.getByText('캐릭터 만들기'));
      expect(mockNavigate).toHaveBeenCalledWith('CharacterCreate', { classType: 'WARRIOR' });
    });
  });

  // ===========================================
  // 5. Back Navigation
  // ===========================================
  describe('back navigation', () => {
    it('back button on quiz calls navigation.goBack()', () => {
      const { getByText } = render(<StyleQuizScreen />);
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
