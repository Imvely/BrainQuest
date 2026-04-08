import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import StyleQuizScreen from '../StyleQuizScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

describe('StyleQuizScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Rendering ---
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<StyleQuizScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays header title', () => {
      const { getByText } = render(<StyleQuizScreen />);
      expect(getByText('스타일 퀴즈')).toBeTruthy();
    });

    it('shows progress counter starting at 1/5', () => {
      const { getByText } = render(<StyleQuizScreen />);
      expect(getByText('1 / 5')).toBeTruthy();
    });

    it('displays first scenario', () => {
      const { getByText } = render(<StyleQuizScreen />);
      expect(getByText(/던전 입구에 도착했다/)).toBeTruthy();
    });

    it('shows 3 answer options', () => {
      const { getByText } = render(<StyleQuizScreen />);
      expect(getByText('정면 돌파! 곧바로 뛰어든다')).toBeTruthy();
      expect(getByText('지도를 꼼꼼히 분석한 후 들어간다')).toBeTruthy();
      expect(getByText('상황 봐가며 유연하게 움직인다')).toBeTruthy();
    });
  });

  // --- 2. Quiz progression ---
  describe('quiz progression', () => {
    it('advances to Q2 after answering Q1', () => {
      const { getByText } = render(<StyleQuizScreen />);
      fireEvent.press(getByText('정면 돌파! 곧바로 뛰어든다'));
      expect(getByText('2 / 5')).toBeTruthy();
      expect(getByText(/보스 몬스터가 나타났다/)).toBeTruthy();
    });

    it('advances through all 5 questions', () => {
      const { getByText } = render(<StyleQuizScreen />);
      // Q1 -> WARRIOR
      fireEvent.press(getByText('정면 돌파! 곧바로 뛰어든다'));
      // Q2 -> WARRIOR
      fireEvent.press(getByText('짧고 강한 연타로 순식간에 끝낸다'));
      // Q3 -> WARRIOR
      fireEvent.press(getByText('바로 다음 퀘스트를 시작한다'));
      // Q4 -> WARRIOR
      fireEvent.press(getByText('즉시 달려가서 직접 해결한다'));
      // Q5 -> WARRIOR (should show result)
      fireEvent.press(getByText('짧은 운동이나 스트레칭으로 에너지를 태운다'));

      // Result should appear
      expect(getByText('당신의 모험 스타일은')).toBeTruthy();
      expect(getByText('워리어')).toBeTruthy();
    });
  });

  // --- 3. Class determination ---
  describe('class determination', () => {
    it('returns WARRIOR when most answers are WARRIOR', () => {
      const { getByText } = render(<StyleQuizScreen />);
      // All WARRIOR answers
      fireEvent.press(getByText('정면 돌파! 곧바로 뛰어든다'));
      fireEvent.press(getByText('짧고 강한 연타로 순식간에 끝낸다'));
      fireEvent.press(getByText('바로 다음 퀘스트를 시작한다'));
      fireEvent.press(getByText('즉시 달려가서 직접 해결한다'));
      fireEvent.press(getByText('짧은 운동이나 스트레칭으로 에너지를 태운다'));

      expect(getByText('워리어')).toBeTruthy();
      expect(getByText(/추천 세션: 15~25분/)).toBeTruthy();
    });

    it('returns MAGE when most answers are MAGE', () => {
      const { getByText } = render(<StyleQuizScreen />);
      // All MAGE answers
      fireEvent.press(getByText('지도를 꼼꼼히 분석한 후 들어간다'));
      fireEvent.press(getByText('패턴을 파악하고 전략적으로 공략한다'));
      fireEvent.press(getByText('장비 강화와 스킬 연구에 투자한다'));
      fireEvent.press(getByText('문제를 분석해서 최적의 해법을 알려준다'));
      fireEvent.press(getByText('조용한 곳에서 머리를 정리한다'));

      expect(getByText('메이지')).toBeTruthy();
      expect(getByText(/추천 세션: 25~40분/)).toBeTruthy();
    });

    it('returns RANGER when most answers are RANGER', () => {
      const { getByText } = render(<StyleQuizScreen />);
      // All RANGER answers
      fireEvent.press(getByText('상황 봐가며 유연하게 움직인다'));
      fireEvent.press(getByText('거리를 유지하며 빈틈을 노린다'));
      fireEvent.press(getByText('마을을 탐험하며 새로운 것을 찾는다'));
      fireEvent.press(getByText('상황에 맞게 지원 방식을 바꿔가며 돕는다'));
      fireEvent.press(getByText('장소나 활동을 바꿔본다'));

      expect(getByText('레인저')).toBeTruthy();
      expect(getByText(/추천 세션: 유동적/)).toBeTruthy();
    });
  });

  // --- 4. Result screen interactions ---
  describe('result screen', () => {
    function completeAsWarrior(rendered: ReturnType<typeof render>) {
      const { getByText } = rendered;
      fireEvent.press(getByText('정면 돌파! 곧바로 뛰어든다'));
      fireEvent.press(getByText('짧고 강한 연타로 순식간에 끝낸다'));
      fireEvent.press(getByText('바로 다음 퀘스트를 시작한다'));
      fireEvent.press(getByText('즉시 달려가서 직접 해결한다'));
      fireEvent.press(getByText('짧은 운동이나 스트레칭으로 에너지를 태운다'));
    }

    it('shows class description', () => {
      const rendered = render(<StyleQuizScreen />);
      completeAsWarrior(rendered);
      expect(rendered.getByText(/짧고 강렬한 집중이 강점/)).toBeTruthy();
    });

    it('navigates to CharacterCreate with classType on button press', () => {
      const rendered = render(<StyleQuizScreen />);
      completeAsWarrior(rendered);
      fireEvent.press(rendered.getByText('캐릭터 만들기'));
      expect(mockNavigate).toHaveBeenCalledWith('CharacterCreate', { classType: 'WARRIOR' });
    });
  });

  // --- 5. Back navigation ---
  describe('navigation', () => {
    it('calls goBack when back button pressed', () => {
      const { getByText } = render(<StyleQuizScreen />);
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
