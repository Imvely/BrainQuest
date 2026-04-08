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
    scenario: '던전 입구에 도착했다!\n어떻게 진입할까?',
    options: [
      { text: '정면 돌파! 곧바로 뛰어든다', class: 'WARRIOR' },
      { text: '지도를 꼼꼼히 분석한 후 들어간다', class: 'MAGE' },
      { text: '상황 봐가며 유연하게 움직인다', class: 'RANGER' },
    ],
  },
  {
    id: 2,
    scenario: '보스 몬스터가 나타났다!\n전투 스타일은?',
    options: [
      { text: '짧고 강한 연타로 순식간에 끝낸다', class: 'WARRIOR' },
      { text: '패턴을 파악하고 전략적으로 공략한다', class: 'MAGE' },
      { text: '거리를 유지하며 빈틈을 노린다', class: 'RANGER' },
    ],
  },
  {
    id: 3,
    scenario: '퀘스트 보상으로 자유 시간을 얻었다!\n뭘 하고 싶어?',
    options: [
      { text: '바로 다음 퀘스트를 시작한다', class: 'WARRIOR' },
      { text: '장비 강화와 스킬 연구에 투자한다', class: 'MAGE' },
      { text: '마을을 탐험하며 새로운 것을 찾는다', class: 'RANGER' },
    ],
  },
  {
    id: 4,
    scenario: '파티원이 어려움에 처했다!\n어떻게 도울까?',
    options: [
      { text: '즉시 달려가서 직접 해결한다', class: 'WARRIOR' },
      { text: '문제를 분석해서 최적의 해법을 알려준다', class: 'MAGE' },
      { text: '상황에 맞게 지원 방식을 바꿔가며 돕는다', class: 'RANGER' },
    ],
  },
  {
    id: 5,
    scenario: '집중이 흐트러질 때\n나만의 리셋 방법은?',
    options: [
      { text: '짧은 운동이나 스트레칭으로 에너지를 태운다', class: 'WARRIOR' },
      { text: '조용한 곳에서 머리를 정리한다', class: 'MAGE' },
      { text: '장소나 활동을 바꿔본다', class: 'RANGER' },
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
    description: '짧고 강렬한 집중이 강점!\n빠른 전투로 몬스터를 쓰러뜨리는 타입.',
    sessionPattern: '추천 세션: 15~25분',
  },
  MAGE: {
    title: '메이지',
    emoji: '🔮',
    color: Colors.PRIMARY,
    description: '깊은 몰입이 강점!\n한 번 집중하면 오래 유지하는 타입.',
    sessionPattern: '추천 세션: 25~40분',
  },
  RANGER: {
    title: '레인저',
    emoji: '🏹',
    color: Colors.SECONDARY,
    description: '유연한 적응력이 강점!\n상황에 맞게 전략을 바꾸는 타입.',
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
