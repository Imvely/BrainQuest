import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import ProgressBar from '../../components/common/ProgressBar';
import { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { ClassType } from '../../types/character';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;

interface QuizOption {
  text: string;
  class: ClassType;
}

interface QuizQuestion {
  id: number;
  scenario: string;
  options: QuizOption[];
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    scenario: '아침에 알람이 울렸다!',
    options: [
      { text: '5분만... 5분만...', class: 'WARRIOR' },
      { text: '바로 일어나서 준비 시작!', class: 'RANGER' },
      { text: '30분 뒤에 깜짝 기상', class: 'MAGE' },
    ],
  },
  {
    id: 2,
    scenario: '회의 중 갑자기\n떠오른 아이디어!',
    options: [
      { text: '바로 손들고 말한다', class: 'WARRIOR' },
      { text: '조용히 메모해둔다', class: 'RANGER' },
      { text: '...뭐였더라?', class: 'MAGE' },
      { text: '아이디어에서 딴생각으로...', class: 'MAGE' },
    ],
  },
  {
    id: 3,
    scenario: '집중이 잘 되는\n시간은?',
    options: [
      { text: '새벽이나 오전', class: 'WARRIOR' },
      { text: '오후', class: 'RANGER' },
      { text: '밤', class: 'MAGE' },
      { text: '예측 불가', class: 'MAGE' },
    ],
  },
  {
    id: 4,
    scenario: '할 일이 10개\n쌓였다!',
    options: [
      { text: '쉬운 것부터 하나씩', class: 'RANGER' },
      { text: '마감 순서대로 정리', class: 'WARRIOR' },
      { text: '...일단 멍', class: 'MAGE' },
      { text: '11번째 할 일을 추가한다', class: 'MAGE' },
    ],
  },
  {
    id: 5,
    scenario: '"5분만 쉬자"의\n결과는?',
    options: [
      { text: '정확히 5분 후 복귀', class: 'WARRIOR' },
      { text: '15분 정도 쉬었다', class: 'RANGER' },
      { text: '1시간이 지나있다', class: 'MAGE' },
      { text: '다음날이 되었다', class: 'MAGE' },
    ],
  },
];

const CLASS_CONFIG: Record<ClassType, {
  title: string;
  emoji: string;
  color: string;
  description: string;
  sessionPattern: string;
}> = {
  WARRIOR: {
    title: '워리어',
    emoji: '⚔️',
    color: Colors.ACCENT,
    description: '단시간 고집중형\n폭발적 집중력의 소유자',
    sessionPattern: '추천 세션: 15~25분',
  },
  MAGE: {
    title: '메이지',
    emoji: '🔮',
    color: Colors.PRIMARY,
    description: '긴 세션 몰입형\n깊은 몰입의 마법사',
    sessionPattern: '추천 세션: 25~40분',
  },
  RANGER: {
    title: '레인저',
    emoji: '🏹',
    color: Colors.SECONDARY,
    description: '유연 적응형\n변화무쌍한 적응의 달인',
    sessionPattern: '추천 세션: 유동적',
  },
};

export default function StyleQuizScreen() {
  const navigation = useNavigation<StackNavigationProp<OnboardingStackParamList>>();
  const flatListRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const [currentQ, setCurrentQ] = useState(0);
  const [scores, setScores] = useState<Record<ClassType, number>>({ WARRIOR: 0, MAGE: 0, RANGER: 0 });
  const [resultClass, setResultClass] = useState<ClassType | null>(null);

  const handleAnswer = useCallback((selectedClass: ClassType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newScores = { ...scores, [selectedClass]: scores[selectedClass] + 1 };
    setScores(newScores);

    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      const next = currentQ + 1;
      setCurrentQ(next);
      timerRef.current = setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
      }, 200);
    } else {
      // Determine result
      const sorted = (Object.entries(newScores) as [ClassType, number][])
        .sort((a, b) => b[1] - a[1]);
      setResultClass(sorted[0][0]);
    }
  }, [currentQ, scores]);

  const renderQuizCard = useCallback(({ item }: { item: QuizQuestion }) => (
    <View style={styles.card}>
      <Text style={styles.scenario}>{item.scenario}</Text>
      <View style={styles.optionsList}>
        {item.options.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.optionButton}
            onPress={() => handleAnswer(opt.class)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionText}>{opt.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [handleAnswer]);

  // --- Result ---
  if (resultClass) {
    const config = CLASS_CONFIG[resultClass];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>당신의 모험 스타일은</Text>
          <Text style={styles.resultEmoji}>{config.emoji}</Text>
          <Text style={[styles.resultTitle, { color: config.color }]}>{config.title}</Text>
          <Text style={styles.resultDescription}>{config.description}</Text>

          <View style={[styles.sessionBadge, { borderColor: config.color }]}>
            <Text style={[styles.sessionText, { color: config.color }]}>{config.sessionPattern}</Text>
          </View>

          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: config.color }]}
            onPress={() => navigation.navigate('CharacterCreate', { classType: resultClass })}
            activeOpacity={0.7}
          >
            <Text style={styles.createButtonText}>캐릭터 만들기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>스타일 퀴즈</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ProgressBar
        progress={(currentQ + 1) / QUIZ_QUESTIONS.length}
        color={Colors.SECONDARY}
        height={4}
        style={styles.progressBar}
      />

      <Text style={styles.counterText}>{currentQ + 1} / {QUIZ_QUESTIONS.length}</Text>

      <FlatList
        ref={flatListRef}
        data={QUIZ_QUESTIONS}
        renderItem={renderQuizCard}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + 24}
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContent}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + 24,
          offset: (CARD_WIDTH + 24) * index,
          index,
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  headerPlaceholder: {
    width: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
  },
  headerTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },
  progressBar: {
    marginHorizontal: 24,
    marginBottom: 8,
  },
  counterText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    marginBottom: 24,
  },
  flatListContent: {
    paddingHorizontal: 24,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 24,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 20,
    padding: 24,
    justifyContent: 'center',
  },
  scenario: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 32,
  },
  optionsList: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  optionText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
  },

  // --- Result ---
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  resultLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 16,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: 36,
    marginBottom: 16,
  },
  resultDescription: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  sessionBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 40,
  },
  sessionText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
  },
  createButton: {
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  createButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },
});
