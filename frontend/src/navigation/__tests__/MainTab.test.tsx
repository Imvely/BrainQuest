import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Colors } from '../../constants/colors';

// ---------------------------------------------------------------------------
// Override global react-native-safe-area-context mock so that bottom-tabs
// can access SafeAreaInsetsContext.Consumer and SafeAreaProvider.
// ---------------------------------------------------------------------------

jest.mock('react-native-safe-area-context', () => {
  const RN = require('react-native');
  const React = require('react');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(insets);
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: RN.View,
    useSafeAreaInsets: () => insets,
    SafeAreaInsetsContext,
    initialWindowMetrics: { frame, insets },
  };
});

// ---------------------------------------------------------------------------
// Mock ALL 13 screen components imported by MainTab.tsx
// ---------------------------------------------------------------------------

jest.mock('../../screens/map/TimelineScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>TimelineScreen</Text>;
});

jest.mock('../../screens/quest/QuestBoardScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>QuestBoardScreen</Text>;
});

jest.mock('../../screens/quest/QuestDetailScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>QuestDetailScreen</Text>;
});

jest.mock('../../screens/quest/QuestCreateScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>QuestCreateScreen</Text>;
});

jest.mock('../../screens/battle/BattleScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>BattleScreen</Text>;
});

jest.mock('../../screens/battle/BattleResultScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>BattleResultScreen</Text>;
});

jest.mock('../../screens/sky/EmotionRecordScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>EmotionRecordScreen</Text>;
});

jest.mock('../../screens/sky/EmotionCalendarScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>EmotionCalendarScreen</Text>;
});

jest.mock('../../screens/sky/WeeklySummaryScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>WeeklySummaryScreen</Text>;
});

jest.mock('../../screens/character/CharacterScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>CharacterScreen</Text>;
});

jest.mock('../../screens/character/InventoryScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>InventoryScreen</Text>;
});

jest.mock('../../screens/gate/CheckinScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>CheckinScreen</Text>;
});

jest.mock('../../screens/gate/MedicationScreen', () => {
  const { Text } = require('react-native');
  return () => <Text>MedicationScreen</Text>;
});

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are set up
// ---------------------------------------------------------------------------

import MainTab from '../MainTab';

// ---------------------------------------------------------------------------
// Helper: wrap component in NavigationContainer
// ---------------------------------------------------------------------------

function renderMainTab() {
  return render(
    <NavigationContainer>
      <MainTab />
    </NavigationContainer>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MainTab', () => {
  it('renders without crashing', () => {
    const { toJSON } = renderMainTab();
    expect(toJSON()).toBeTruthy();
  });

  it('displays all 5 tab labels', () => {
    const { getByText } = renderMainTab();
    expect(getByText('MAP')).toBeTruthy();
    expect(getByText('QUEST')).toBeTruthy();
    expect(getByText('BATTLE')).toBeTruthy();
    expect(getByText('SKY')).toBeTruthy();
    expect(getByText('MORE')).toBeTruthy();
  });

  it('has correct accessibility labels on all tabs', () => {
    const { getByLabelText } = renderMainTab();
    expect(getByLabelText('타임라인')).toBeTruthy();
    expect(getByLabelText('퀘스트')).toBeTruthy();
    expect(getByLabelText('전투')).toBeTruthy();
    expect(getByLabelText('감정 날씨')).toBeTruthy();
    expect(getByLabelText('더보기')).toBeTruthy();
  });

  it('shows TimelineScreen as the default/initial tab', () => {
    const { getByText, queryByText } = renderMainTab();
    // Map tab's initial screen should be visible
    expect(getByText('TimelineScreen')).toBeTruthy();
    // Other tab screens should not be rendered yet
    expect(queryByText('QuestBoardScreen')).toBeNull();
    expect(queryByText('BattleScreen')).toBeNull();
  });

  it('switches to QUEST tab and shows QuestBoardScreen', async () => {
    const { getByText, getByLabelText } = renderMainTab();
    fireEvent.press(getByLabelText('퀘스트'));
    await waitFor(() => {
      expect(getByText('QuestBoardScreen')).toBeTruthy();
    });
  });

  it('switches to BATTLE tab and shows BattleScreen', async () => {
    const { getByText, getByLabelText } = renderMainTab();
    fireEvent.press(getByLabelText('전투'));
    await waitFor(() => {
      expect(getByText('BattleScreen')).toBeTruthy();
    });
  });

  it('switches to SKY tab and shows EmotionCalendarScreen', async () => {
    const { getByText, getByLabelText } = renderMainTab();
    fireEvent.press(getByLabelText('감정 날씨'));
    await waitFor(() => {
      expect(getByText('EmotionCalendarScreen')).toBeTruthy();
    });
  });

  it('switches to MORE tab and shows CharacterScreen', async () => {
    const { getByText, getByLabelText } = renderMainTab();
    fireEvent.press(getByLabelText('더보기'));
    await waitFor(() => {
      expect(getByText('CharacterScreen')).toBeTruthy();
    });
  });

  it('can navigate back to MAP tab after switching away', async () => {
    const { getByText, getByLabelText } = renderMainTab();
    // Navigate away from MAP
    fireEvent.press(getByLabelText('퀘스트'));
    await waitFor(() => {
      expect(getByText('QuestBoardScreen')).toBeTruthy();
    });
    // Navigate back to MAP
    fireEvent.press(getByLabelText('타임라인'));
    await waitFor(() => {
      expect(getByText('TimelineScreen')).toBeTruthy();
    });
  });

  it('tab bar has the correct background color style', () => {
    const { getByText } = renderMainTab();
    // Find the tab bar container by traversing from a known tab label.
    // The tab bar wrapper applies BG_SECONDARY (#1A1340) as backgroundColor.
    const mapLabel = getByText('MAP');
    // Walk up to find an ancestor with the expected background color.
    let node = mapLabel;
    let foundBgColor = false;
    while (node.parent) {
      node = node.parent as any;
      const style = node.props?.style;
      if (style) {
        const flatStyle = Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : style;
        if (flatStyle.backgroundColor === Colors.BG_SECONDARY) {
          foundBgColor = true;
          break;
        }
      }
    }
    expect(foundBgColor).toBe(true);
  });

  it('renders all 5 tabs without throwing errors during sequential switching', async () => {
    const { getByText, getByLabelText } = renderMainTab();

    // Start at MAP
    expect(getByText('TimelineScreen')).toBeTruthy();

    // Cycle through every tab
    const tabs: Array<{ label: string; screen: string }> = [
      { label: '퀘스트', screen: 'QuestBoardScreen' },
      { label: '전투', screen: 'BattleScreen' },
      { label: '감정 날씨', screen: 'EmotionCalendarScreen' },
      { label: '더보기', screen: 'CharacterScreen' },
      { label: '타임라인', screen: 'TimelineScreen' },
    ];

    for (const { label, screen } of tabs) {
      fireEvent.press(getByLabelText(label));
      await waitFor(() => {
        expect(getByText(screen)).toBeTruthy();
      });
    }
  });

  it('Battle tab icon container has ACCENT border color', () => {
    const { getByLabelText } = renderMainTab();
    const battleTab = getByLabelText('전투');
    // The BattleTabIcon uses a circular container with ACCENT border.
    // Search inside the battle tab for a View with borderColor === ACCENT.
    function findAccentBorder(node: any): boolean {
      const style = node.props?.style;
      if (style) {
        const flatStyle = Array.isArray(style)
          ? Object.assign({}, ...style.filter(Boolean))
          : style;
        if (flatStyle.borderColor === Colors.ACCENT) {
          return true;
        }
      }
      if (node.children) {
        for (const child of node.children) {
          if (typeof child === 'object' && findAccentBorder(child)) {
            return true;
          }
        }
      }
      return false;
    }
    expect(findAccentBorder(battleTab)).toBe(true);
  });
});
