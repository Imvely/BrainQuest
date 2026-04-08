import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CharacterCreateScreen from '../CharacterCreateScreen';
import { createCharacter } from '../../../api/character';

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

describe('CharacterCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Rendering ---
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<CharacterCreateScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays header and create button', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('캐릭터 생성')).toBeTruthy();
      expect(getByText('모험 시작!')).toBeTruthy();
    });

    it('shows class label from route params', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText(/워리어/)).toBeTruthy();
    });

    it('shows name input with placeholder', () => {
      const { getByPlaceholderText } = render(<CharacterCreateScreen />);
      expect(getByPlaceholderText('모험가의 이름 (최대 12자)')).toBeTruthy();
    });

    it('shows character counter starting at 0/12', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('0/12')).toBeTruthy();
    });

    it('shows section labels', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('이름')).toBeTruthy();
      expect(getByText('헤어 스타일')).toBeTruthy();
      expect(getByText('의상')).toBeTruthy();
      expect(getByText('색상 테마')).toBeTruthy();
    });

    it('shows 6 hair options', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('숏컷')).toBeTruthy();
      expect(getByText('포니테일')).toBeTruthy();
    });

    it('shows 4 outfit options', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      expect(getByText('경갑옷')).toBeTruthy();
      expect(getByText('평상복')).toBeTruthy();
    });
  });

  // --- 2. Form interactions ---
  describe('form interactions', () => {
    it('updates name input and character counter', () => {
      const { getByPlaceholderText, getByText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '용사');
      expect(getByText('2/12')).toBeTruthy();
    });

    it('calls goBack when back button pressed', () => {
      const { getByText } = render(<CharacterCreateScreen />);
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // --- 3. Form validation ---
  describe('validation', () => {
    it('shows alert when name is empty', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<CharacterCreateScreen />);

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(alertSpy).toHaveBeenCalledWith('이름을 입력해주세요');
      expect(mockCreateCharacter).not.toHaveBeenCalled();
    });

    it('shows alert when name is only spaces', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '   ');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(alertSpy).toHaveBeenCalledWith('이름을 입력해주세요');
    });
  });

  // --- 4. API success ---
  describe('create success', () => {
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

    it('calls createCharacter API with correct params', async () => {
      mockCreateCharacter.mockResolvedValueOnce({ data: mockCharacter } as any);
      const { getByText, getByPlaceholderText } = render(<CharacterCreateScreen />);
      fireEvent.changeText(getByPlaceholderText('모험가의 이름 (최대 12자)'), '용사');

      await act(async () => {
        fireEvent.press(getByText('모험 시작!'));
      });

      expect(mockCreateCharacter).toHaveBeenCalledWith({
        name: '용사',
        classType: 'WARRIOR',
        appearance: expect.objectContaining({ hair: 'short_a', outfit: 'armor_light' }),
      });
    });

    it('updates stores on success', async () => {
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

  // --- 5. API failure ---
  describe('create failure', () => {
    it('shows error alert on API failure', async () => {
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

      expect(mockSetHasCharacter).not.toHaveBeenCalled();
    });
  });
});
