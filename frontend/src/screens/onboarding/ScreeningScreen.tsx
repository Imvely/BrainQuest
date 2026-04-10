import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { submitScreening, ScreeningResult } from '../../api/gate';
import ProgressBar from '../../components/common/ProgressBar';
import { OnboardingStackParamList } from '../../navigation/OnboardingStack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- ASRS-v1.1 한국어 6문항 ---
const ASRS_QUESTIONS = [
  {
    id: 'q1',
    text: '어떤 일의 어려운 부분은 끝냈고, 마무리만 남았을 때 마무리를 짓지 못한 적이 있습니까?',
    tooltip: '작업 완료의 어려움은 ADHD의 핵심 증상 중 하나인 실행 기능 저하와 관련됩니다.',
  },
  {
    id: 'q2',
    text: '체계적으로 일을 해야 할 때 순서대로 정리하기 어려운 적이 있습니까?',
    tooltip: '조직화 능력의 어려움은 주의력 결핍과 관련된 대표적인 증상입니다.',
  },
  {
    id: 'q3',
    text: '약속이나 할 일을 잊어버린 적이 있습니까?',
    tooltip: '작업 기억력의 저하는 ADHD에서 흔히 관찰되는 인지적 특성입니다.',
  },
  {
    id: 'q4',
    text: '복잡한 생각을 요하는 일을 할 때 시작을 피하거나 미룬 적이 있습니까?',
    tooltip: '과제 시작의 어려움(시작 지연)은 ADHD의 실행 기능 장애와 밀접합니다.',
  },
  {
    id: 'q5',
    text: '오래 앉아 있을 때 손발을 만지작거리거나 몸을 꿈틀거린 적이 있습니까?',
    tooltip: '신체적 안절부절못함은 과잉행동-충동성 유형의 ADHD 증상입니다.',
  },
  {
    id: 'q6',
    text: '마치 모터가 달린 것처럼 과도하게 활동적이거나 뭔가를 하지 않으면 안 되는 것처럼 느낀 적이 있습니까?',
    tooltip: '내적 불안감과 과도한 활동성은 성인 ADHD에서 자주 나타나는 증상입니다.',
  },
] as const;

const SCALE_OPTIONS = [
  { value: 0, label: '전혀\n아니다' },
  { value: 1, label: '거의\n아니다' },
  { value: 2, label: '가끔\n그렇다' },
  { value: 3, label: '자주\n그렇다' },
  { value: 4, label: '매우\n그렇다' },
] as const;

type Phase = 'selection' | 'diagnosis' | 'quiz' | 'result';

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (score <= 9) return 'LOW';
  if (score <= 13) return 'MEDIUM';
  return 'HIGH';
}

const RISK_CONFIG = {
  LOW: { color: Colors.SUCCESS, label: '낮은 위험', message: '현재 ADHD 관련 증상이 낮은 수준입니다.' },
  MEDIUM: { color: Colors.WARNING, label: '중간 위험', message: 'ADHD 관련 증상이 일부 관찰됩니다.\n전문가 상담을 고려해보세요.' },
  HIGH: { color: Colors.ERROR, label: '높은 위험', message: 'ADHD 관련 증상이 높은 수준입니다.\n전문가 평가를 권장합니다.' },
} as const;

export default function ScreeningScreen() {
  const navigation = useNavigation<StackNavigationProp<OnboardingStackParamList>>();

  const [phase, setPhase] = useState<Phase>('selection');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [diagnosisDate, setDiagnosisDate] = useState('');

  const shareCardRef = useRef<ViewShot>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Animated gauge
  const gaugeProgress = useSharedValue(0);
  const GAUGE_SIZE = 180;
  const STROKE_WIDTH = 12;
  const RADIUS = (GAUGE_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - gaugeProgress.value),
  }));

  const handleSelectOption = useCallback(async (value: number) => {
    const question = ASRS_QUESTIONS[currentQ];
    const newAnswers = { ...answers, [question.id]: value };
    setAnswers(newAnswers);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentQ < ASRS_QUESTIONS.length - 1) {
      timerRef.current = setTimeout(() => setCurrentQ((prev) => prev + 1), 300);
    } else {
      // All questions answered — submit
      setSubmitting(true);
      const totalScore = Object.values(newAnswers).reduce((a, b) => a + b, 0);
      const riskLevel = getRiskLevel(totalScore);

      try {
        const response = await submitScreening({
          testType: 'ASRS_6',
          answers: newAnswers,
        });
        setResult(response.data);
      } catch {
        // Offline fallback — show local result
        setResult({
          id: 0,
          testType: 'ASRS_6',
          totalScore,
          riskLevel,
          createdAt: new Date().toISOString(),
        });
      } finally {
        setSubmitting(false);
        setPhase('result');
        // Animate gauge
        gaugeProgress.value = withTiming(totalScore / 24, {
          duration: 1200,
          easing: Easing.out(Easing.cubic),
        });
      }
    }
  }, [currentQ, answers, gaugeProgress]);

  const handleShare = useCallback(async () => {
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('공유 불가', '이 기기에서는 공유 기능을 사용할 수 없습니다.');
      }
    } catch {
      Alert.alert('공유 실패', '카드 캡처 중 오류가 발생했습니다.');
    }
  }, []);

  // --- Selection Phase ---
  if (phase === 'selection') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.selectionContent}>
          <Text style={styles.selectionTitle}>시작하기 전에</Text>
          <Text style={styles.selectionSubtitle}>나에 대해 알려주세요</Text>

          <View style={styles.selectionCards}>
            <TouchableOpacity
              style={styles.selectionCard}
              onPress={() => setPhase('quiz')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardEmoji}>{'🔍'}</Text>
              <Text style={styles.cardTitle}>혹시 나도?</Text>
              <Text style={styles.cardDesc}>간단한 스크리닝 테스트로{'\n'}확인해볼게요</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectionCard}
              onPress={() => setPhase('diagnosis')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardEmoji}>{'📋'}</Text>
              <Text style={styles.cardTitle}>이미 진단받았어요</Text>
              <Text style={styles.cardDesc}>진단 정보 입력 후{'\n'}스타일 퀴즈로</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.selectionCard}
              onPress={() => navigation.navigate('StyleQuiz')}
              activeOpacity={0.7}
            >
              <Text style={styles.cardEmoji}>{'👀'}</Text>
              <Text style={styles.cardTitle}>그냥 둘러볼게요</Text>
              <Text style={styles.cardDesc}>스크리닝 없이{'\n'}바로 시작</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // --- Diagnosis Phase ---
  if (phase === 'diagnosis') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={() => setPhase('selection')} style={styles.backBtn}>
            <Text style={styles.backText}>{'<'}</Text>
          </TouchableOpacity>
          <View style={styles.headerPlaceholder} />
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.diagnosisContent}>
          <Text style={styles.selectionTitle}>진단 정보</Text>
          <Text style={styles.selectionSubtitle}>이미 ADHD 진단을 받으셨군요</Text>

          <View style={styles.diagnosisForm}>
            <Text style={styles.diagnosisLabel}>진단 시기 (선택)</Text>
            <TextInput
              style={styles.diagnosisInput}
              value={diagnosisDate}
              onChangeText={setDiagnosisDate}
              placeholder="예: 2024-06"
              placeholderTextColor={Colors.TEXT_MUTED}
            />
          </View>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigation.navigate('StyleQuiz')}
            activeOpacity={0.7}
          >
            <Text style={styles.continueButtonText}>다음으로</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Quiz Phase ---
  if (phase === 'quiz') {
    const question = ASRS_QUESTIONS[currentQ];
    const selectedValue = answers[question.id];

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.quizHeader}>
          <TouchableOpacity
            onPress={() => {
              if (currentQ > 0) setCurrentQ((prev) => prev - 1);
              else setPhase('selection');
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.quizCounter}>{currentQ + 1} / {ASRS_QUESTIONS.length}</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ProgressBar
          progress={(currentQ + 1) / ASRS_QUESTIONS.length}
          color={Colors.PRIMARY}
          height={4}
          style={styles.progressBar}
        />

        <ScrollView style={styles.quizBody} contentContainerStyle={styles.quizBodyContent}>
          <View style={styles.questionArea}>
            <View style={styles.questionRow}>
              <Text style={styles.questionText}>{question.text}</Text>
              <TouchableOpacity onPress={() => setTooltipVisible(true)} style={styles.tooltipBtn}>
                <Text style={styles.tooltipIcon}>?</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.scaleRow}>
            {SCALE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.scaleButton,
                  selectedValue === opt.value && styles.scaleButtonActive,
                ]}
                onPress={() => handleSelectOption(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.scaleValue,
                  selectedValue === opt.value && styles.scaleValueActive,
                ]}>
                  {opt.value}
                </Text>
                <Text style={[
                  styles.scaleLabel,
                  selectedValue === opt.value && styles.scaleLabelActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {submitting && (
            <View style={styles.submittingArea}>
              <Text style={styles.submittingText}>결과 분석 중...</Text>
            </View>
          )}
        </ScrollView>

        {/* Tooltip Modal */}
        <Modal visible={tooltipVisible} transparent animationType="slide">
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setTooltipVisible(false)} activeOpacity={1}>
            <View style={styles.tooltipSheet}>
              <View style={styles.tooltipHandle} />
              <Text style={styles.tooltipTitle}>이 문항에 대해</Text>
              <Text style={styles.tooltipBody}>{question.tooltip}</Text>
              <TouchableOpacity style={styles.tooltipClose} onPress={() => setTooltipVisible(false)}>
                <Text style={styles.tooltipCloseText}>확인</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  // --- Result Phase ---
  const totalScore = result?.totalScore ?? 0;
  const riskLevel = result?.riskLevel ?? getRiskLevel(totalScore);
  const riskConfig = RISK_CONFIG[riskLevel];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.resultContent}>
        <Text style={styles.resultTitle}>스크리닝 결과</Text>

        {/* Animated Gauge */}
        <View style={styles.gaugeContainer}>
          <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
            <Circle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={RADIUS}
              stroke={Colors.BG_INPUT}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <AnimatedCircle
              cx={GAUGE_SIZE / 2}
              cy={GAUGE_SIZE / 2}
              r={RADIUS}
              stroke={riskConfig.color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              animatedProps={animatedCircleProps}
              transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.gaugeCenter}>
            <Text style={styles.gaugeScore}>{totalScore}</Text>
            <Text style={styles.gaugeMax}>/ 24</Text>
          </View>
        </View>

        {/* Risk Badge */}
        <View style={[styles.riskBadge, { backgroundColor: riskConfig.color + '22', borderColor: riskConfig.color }]}>
          <Text style={[styles.riskBadgeText, { color: riskConfig.color }]}>{riskConfig.label}</Text>
        </View>
        <Text style={styles.riskMessage}>{riskConfig.message}</Text>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            이 결과는 의료 진단이 아닌 선별 도구입니다.{'\n'}
            정확한 진단은 전문의와 상담하세요.
          </Text>
        </View>

        {/* Share Card (capturable) */}
        <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1 }}>
          <View style={styles.shareCard}>
            <Text style={styles.shareCardLogo}>BrainQuest</Text>
            <Text style={styles.shareCardSubtitle}>ADHD 자가 스크리닝 결과</Text>
            <View style={styles.shareCardScoreRow}>
              <Text style={[styles.shareCardScore, { color: riskConfig.color }]}>{totalScore}</Text>
              <Text style={styles.shareCardMax}>/24</Text>
            </View>
            <View style={[styles.shareCardBadge, { backgroundColor: riskConfig.color }]}>
              <Text style={styles.shareCardBadgeText}>{riskConfig.label}</Text>
            </View>
            <Text style={styles.shareCardCTA}>나도 테스트하기</Text>
          </View>
        </ViewShot>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
          <Text style={styles.shareButtonText}>결과 카드 공유하기</Text>
        </TouchableOpacity>

        {riskLevel === 'HIGH' && (
          <TouchableOpacity
            style={styles.clinicButton}
            onPress={() => {
              Linking.openURL('https://map.naver.com/v5/search/정신건강의학과').catch(() => {
                Alert.alert('안내', '브라우저를 열 수 없습니다.');
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.clinicButtonText}>가까운 정신건강의학과 찾기</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('StyleQuiz')}
          activeOpacity={0.7}
        >
          <Text style={styles.continueButtonText}>다음 단계로</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },

  // --- Selection ---
  selectionContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  selectionTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXXL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  selectionSubtitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 32,
  },
  selectionCards: {
    gap: 12,
  },
  selectionCard: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  cardEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardDesc: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 20,
  },

  // --- Diagnosis ---
  diagnosisContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  diagnosisForm: {
    marginTop: 32,
    marginBottom: 32,
  },
  diagnosisLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 10,
  },
  diagnosisInput: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },

  // --- Quiz ---
  quizHeader: {
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
  quizCounter: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
  },
  progressBar: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  quizBody: {
    flex: 1,
  },
  quizBodyContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  questionArea: {
    marginBottom: 48,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  questionText: {
    flex: 1,
    fontFamily: Fonts.REGULAR,
    fontSize: 16,
    color: Colors.TEXT_PRIMARY,
    lineHeight: 26,
  },
  tooltipBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.BG_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  tooltipIcon: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.PRIMARY,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  scaleButton: {
    flex: 1,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  scaleButtonActive: {
    backgroundColor: Colors.PRIMARY + '33',
    borderColor: Colors.PRIMARY,
  },
  scaleValue: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_MUTED,
    marginBottom: 4,
  },
  scaleValueActive: {
    color: Colors.PRIMARY,
  },
  scaleLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 14,
  },
  scaleLabelActive: {
    color: Colors.PRIMARY,
  },
  submittingArea: {
    marginTop: 32,
    alignItems: 'center',
  },
  submittingText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
  },

  // --- Tooltip Modal ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.OVERLAY,
  },
  tooltipSheet: {
    backgroundColor: Colors.BG_SECONDARY,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  tooltipHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.BORDER,
    alignSelf: 'center',
    marginBottom: 20,
  },
  tooltipTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 12,
  },
  tooltipBody: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    lineHeight: 22,
    marginBottom: 24,
  },
  tooltipClose: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltipCloseText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },

  // --- Result ---
  resultContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: 'center',
  },
  resultTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 32,
  },
  gaugeContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeScore: {
    fontFamily: Fonts.BOLD,
    fontSize: 48,
    color: Colors.TEXT_PRIMARY,
  },
  gaugeMax: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_MUTED,
  },
  riskBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  riskBadgeText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
  },
  riskMessage: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  disclaimer: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  disclaimerText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },

  // --- Share Card ---
  shareCard: {
    backgroundColor: Colors.BG_SECONDARY,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: SCREEN_WIDTH - 48,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    marginBottom: 24,
  },
  shareCardLogo: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.PRIMARY,
    marginBottom: 4,
  },
  shareCardSubtitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 16,
  },
  shareCardScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  shareCardScore: {
    fontFamily: Fonts.BOLD,
    fontSize: 44,
  },
  shareCardMax: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XL,
    color: Colors.TEXT_MUTED,
  },
  shareCardBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  shareCardBadgeText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_PRIMARY,
  },
  shareCardCTA: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },

  // --- Buttons ---
  shareButton: {
    backgroundColor: Colors.SECONDARY,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  shareButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
  clinicButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.ERROR,
  },
  clinicButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.ERROR,
  },
  continueButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  continueButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
});
