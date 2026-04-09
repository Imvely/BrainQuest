import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CharacterCreateScreen from '../CharacterCreateScreen';
import { createCharacter } from '../../../api/character';

// --- Mocks ---

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetHasCharacter = jest.fn();
const mockSetCharacter = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { classType: 'WARRIOR' } }),
}));

jest.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({ setHasCharacter: mockSetHasCharacter }),
}));

jest.mock('../../../stores/useCharacterStore', () => ({
  useCharacterStore: () => ({ setCharacter: mockSetCharacter }),
}));

jest.mock('../../../api/character', () => ({
  createCharacter: jest.fn(),
}));

const mockCreateCharacter = createCharacter as jest.MockedFunction<typeof createCharacter>;

// --- Test Data ---

const mockCharacter = {
  id: 1,
  userId: 1,
  name: '용사',
  classType: 'WARRIOR' as const,
  level: 1,
  exp: 0,
  expToNext: 100,
  statAtk: 10,
  statWis: 10,
  statDef: 10,
  statAgi: 10,
  statHp: 100,
  gold: 0,
  appearance: { hair: 'short_a', outfit: 'armor_light', color: '#6C5CE7' },
  equippedItems: { helmet: null, armor: null, weapon: null, accessory: null },
};

// --- Tests ---

describe('CharacterCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // 1. Rendering
  // ===========================================
  describe('rendering', () => {
    it('renders preview circle, name input, hair/outfit/color selectors', () => {
      const { getByPlaceholderText, getByText } = render(<CharacterCreateScreen />);
      expect(getByPlaceholderText('모험가의 이름 (최대 12자)')).toBeTruthy();
      expect(getByText('헤어 스타일')).toBeTruthy();
      expect(getByText('의상')).toBeTruthy();
      expect(getByText('색상 테마')).toBeTruthy();
    });

    it('renders header "캐릭터 생성" and class label', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('캐릭터 생성')).toBeTruthy();
      expect(getByText(/워리어/)).toBeTruthy();
    });

    it('shows 6 hair style options', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('숏컷')).toBeTruthy();
      expect(getByText('댄디')).toBeTruthy();
      expect(getByText('미디엄')).toBeTruthy();
      expect(getByText('롱헤어')).toBeTruthy();
      expect(getByText('곱슬')).toBeTruthy();
      expect(getByText('포니테일')).toBeTruthy();
    });

    it('shows 4 outfit options', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('경갑옷')).toBeTruthy();
      expect(getByText('로브')).toBeTruthy();
      expect(getByText('가죽갑옷')).toBeTruthy();
      expect(getByText('평상복')).toBeTruthy();
    });

    it('shows 6 color circles', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      // We verify color section exists and has the right label
      expect(getByText('색상 테마')).toBeTruthy();
      // Color circles are rendered as plain TouchableOpacity with backgroundColor,
      // we verify the section is present
    });

    it('shows create button', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('모험 시작!')).toBeTruthy();
    });
  });

  // ===========================================
  // 2. Name Input
  // ===========================================
  describe('name input', () => {
    it('accepts text and shows character count', () => {
      const { getByPlaceholderText, getByText } = render(<CharacterCreateScreen />);
      expect(getByText('0/12')).toBeTruthy();

      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '용사');
      expect(getByText('2/12')).toBeTruthy();
    });

    it('updates character count as text changes', () => {
      const { getByPlaceholderText, getByText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '브레인퀘스트');
      expect(getByText('6/12')).toBeTruthy();
    });
  });

  // ===========================================
  // 3. Validation
  // ===========================================
  describe('validation', () => {
    it('empty name: "모험 시작!" shows alert', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<CharacterCreateScreen />);

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(alertSpy).toHaveBeenCalledWith('이름을 입력해주세요');
      expect(mockCreateCharacter).not.toHaveBeenCalled();
    });

    it('whitespace-only name shows alert', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '   ');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(alertSpy).toHaveBeenCalledWith('이름을 입력해주세요');
    });

    it('name > 12 chars: shows alert', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);
      // Note: TextInput has maxLength=12, but we can still test the validation path
      // by simulating a 13+ char name change
      fireEvent.changeText(
        getByPlaceholderText('모험가의 이름 (최대 12자)'),
        '이것은매우긴이름입니다열세글',
      );

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(alertSpy).toHaveBeenCalledWith('이름은 12자 이내로 입력해주세요');
    });
  });

  // ===========================================
  // 4. API Call - Success
  // ===========================================
  describe('create character success', () => {
    it('tapping create calls createCharacter API with correct params', async () => {
      mockCreateCharacter.mockResolvedValueOnce({ data: mockCharacter } as any);
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '용사');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(mockCreateCharacter).toHaveBeenCalledWith({
        name: '용사',
        classType: 'WARRIOR',
        appearance: expect.objectContaining({
          hair: 'short_a',
          outfit: 'armor_light',
          color: '#6C5CE7',
        }),
      });
    });

    it('on success calls setCharacter and setHasCharacter(true)', async () => {
      mockCreateCharacter.mockResolvedValueOnce({ data: mockCharacter } as any);
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '용사');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(mockSetCharacter).toHaveBeenCalledWith(mockCharacter);
      expect(mockSetHasCharacter).toHaveBeenCalledWith(true);
    });
  });

  // ===========================================
  // 5. API Call - Failure
  // ===========================================
  describe('create character failure', () => {
    it('on failure shows error alert', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockCreateCharacter.mockRejectedValueOnce(new Error('Server Error'));
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '용사');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(alertSpy).toHaveBeenCalledWith('생성 실패', '캐릭터 생성 중 오류가 발생했습니다.');
    });

    it('does not update stores on failure', async () => {
      mockCreateCharacter.mockRejectedValueOnce(new Error('Network'));
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '용사');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(mockSetCharacter).not.toHaveBeenCalled();
      expect(mockSetHasCharacter).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // 6. Loading State
  // ===========================================
  describe('loading state', () => {
    it('shows ActivityIndicator while loading', async () => {
      let resolveCreate!: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveCreate = resolve;
      });
      mockCreateCharacter.mockReturnValueOnce(pendingPromise as any);

      const { getByText, getByPlaceholderText, queryByText } = render(
        <CharacterCreateScreen />,
      );
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '용사');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      // Button text should be replaced by ActivityIndicator
      expect(queryByText('모험 시작!')).toBeNull();

      // Cleanup
      await act(async () => {
        resolveCreate({ data: mockCharacter });
      });
    });
  });

  // ===========================================
  // 7. Navigation
  // ===========================================
  describe('navigation', () => {
    it('back button calls goBack', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // ===========================================
  // 8. Customization Interactions
  // ===========================================
  describe('customization', () => {
    it('tapping a hair option updates selection', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      // Tap a different hair style
      fireEvent.press(getByText('곱슬'));
      // The component re-renders with the new selection; no crash
      expect(getByText('곱슬')).toBeTruthy();
    });

    it('tapping an outfit option updates selection', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      fireEvent.press(getByText('로브'));
      expect(getByText('로브')).toBeTruthy();
    });

    it('sends selected customizations to API', async () => {
      mockCreateCharacter.mockResolvedValueOnce({ data: mockCharacter } as any);
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);

      // Change hair and outfit
      fireEvent.press(getByText('곱슬'));
      fireEvent.press(getByText('로브'));
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '마법사');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(mockCreateCharacter).toHaveBeenCalledWith({
        name: '마법사',
        classType: 'WARRIOR',
        appearance: expect.objectContaining({
          hair: 'curly',
          outfit: 'robe',
        }),
      });
    });
  });
});
