import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { submitCheckin, CheckinResponse } from '../../api/gate';
import EmojiSelector from '../../components/common/EmojiSelector';
import Toast from '../../components/common/Toast';

type CheckinType = 'MORNING' | 'EVENING';

const SLEEP_QUALITY_OPTIONS = [
  { value: 1, emoji: '😴', label: '나쁨' },
  { value: 2, emoji: '😐', label: '보통' },
  { value: 3, emoji: '😊', label: '좋음' },
];

const CONDITION_OPTIONS = [
  { value: 1, emoji: '😵', label: '최악' },
  { value: 2, emoji: '😣', label: '나쁨' },
  { value: 3, emoji: '😐', label: '보통' },
  { value: 4, emoji: '🙂', label: '좋음' },
  { value: 5, emoji: '🔥', label: '최고' },
];

const SCORE_OPTIONS = [
  { value: 1, emoji: '1️⃣', label: '매우 낮음' },
  { value: 2, emoji: '2️⃣', label: '낮음' },
  { value: 3, emoji: '3️⃣', label: '보통' },
  { value: 4, emoji: '4️⃣', label: '높음' },
  { value: 5, emoji: '5️⃣', label: '매우 높음' },
];

function getCheckinType(): CheckinType {
  return new Date().getHours() < 14 ? 'MORNING' : 'EVENING';
}

export default function CheckinScreen() {
  const navigation = useNavigation();
  const checkinType = useMemo(getCheckinType, []);

  // Morning fields
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);

  // Evening fields
  const [focusScore, setFocusScore] = useState<number | null>(null);
  const [impulsivityScore, setImpulsivityScore] = useState<number | null>(null);
  const [emotionScore, setEmotionScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');

  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Confetti animation
  const confettiScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  const confettiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confettiScale.value }],
    opacity: confettiOpacity.value,
  }));

  const playConfetti = useCallback(() => {
    confettiScale.value = withSequence(
      withSpring(1.2, { damping: 4 }),
      withDelay(800, withTiming(0, { duration: 300 })),
    );
    confettiOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(800, withTiming(0, { duration: 300 })),
    );
  }, [confettiScale, confettiOpacity]);

  const isMorningValid = checkinType === 'MORNING' && sleepQuality !== null && condition !== null;
  const isEveningValid = checkinType === 'EVENING' && focusScore !== null && impulsivityScore !== null && emotionScore !== null;
  const isValid = isMorningValid || isEveningValid;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);

    try {
      const response = await submitCheckin({
        checkinType,
        checkinDate: format(new Date(), 'yyyy-MM-dd'),
        ...(checkinType === 'MORNING'
          ? { sleepHours, sleepQuality: sleepQuality!, condition: condition! }
          : { focusScore: focusScore!, impulsivityScore: impulsivityScore!, emotionScore: emotionScore!, memo: memo || undefined }),
      });

      setResult(response.data);
      setCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      playConfetti();
      setShowToast(true);
    } catch {
      Alert.alert('체크인 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  // --- Completed State ---
  if (completed && result) {
    return (
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.confettiOverlay, confettiStyle]}>
          <Text style={styles.confettiText}>{'🎉'}</Text>
        </Animated.View>

        <Toast
          message={`+${result.reward.exp} EXP  +${result.reward.gold} Gold`}
          visible={showToast}
          onHide={() => setShowToast(false)}
          type="exp"
        />

        <View style={styles.completedContent}>
          <Text style={styles.completedEmoji}>{'✅'}</Text>
          <Text style={styles.completedTitle}>
            {checkinType === 'MORNING' ? '좋은 아침!' : '오늘도 수고했어요!'}
          </Text>
          <Text style={styles.completedSubtitle}>체크인 완료</Text>

          <View style={styles.streakCard}>
            <Text style={styles.streakLabel}>연속 체크인</Text>
            <Text style={styles.streakCount}>{result.streakCount}일</Text>
          </View>

          <View style={styles.rewardRow}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardValue}>+{result.reward.exp}</Text>
              <Text style={styles.rewardLabel}>EXP</Text>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardValue, { color: '#FDCB6E' }]}>+{result.reward.gold}</Text>
              <Text style={styles.rewardLabel}>Gold</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Form ---
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {checkinType === 'MORNING' ? '아침 체크인 ☀️' : '저녁 체크인 🌙'}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <ScrollView contentContainerStyle={styles.formContent}>
        {checkinType === 'MORNING' ? (
          <>
            {/* Sleep Hours */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>수면 시간</Text>
              <View style={styles.sliderRow}>
                <TouchableOpacity
                  style={styles.sliderBtn}
                  onPress={() => setSleepHours(Math.max(4, sleepHours - 0.5))}
                >
                  <Text style={styles.sliderBtnText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.sliderValue}>{sleepHours}시간</Text>
                <TouchableOpacity
                  style={styles.sliderBtn}
                  onPress={() => setSleepHours(Math.min(10, sleepHours + 0.5))}
                >
                  <Text style={styles.sliderBtnText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${((sleepHours - 4) / 6) * 100}%` }]} />
              </View>
            </View>

            {/* Sleep Quality */}
            <EmojiSelector
              label="수면의 질"
              options={SLEEP_QUALITY_OPTIONS}
              selected={sleepQuality}
              onSelect={setSleepQuality}
            />

            {/* Condition */}
            <EmojiSelector
              label="현재 컨디션"
              options={CONDITION_OPTIONS}
              selected={condition}
              onSelect={setCondition}
            />
          </>
        ) : (
          <>
            {/* Focus */}
            <EmojiSelector
              label="오늘의 집중력"
              options={SCORE_OPTIONS}
              selected={focusScore}
              onSelect={setFocusScore}
            />

            {/* Impulsivity */}
            <EmojiSelector
              label="충동성 수준"
              options={SCORE_OPTIONS}
              selected={impulsivityScore}
              onSelect={setImpulsivityScore}
            />

            {/* Emotion */}
            <EmojiSelector
              label="감정 안정도"
              options={SCORE_OPTIONS}
              selected={emotionScore}
              onSelect={setEmotionScore}
            />

            {/* Memo */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>한줄 메모</Text>
              <TextInput
                style={styles.memoInput}
                value={memo}
                onChangeText={setMemo}
                placeholder="오늘 하루 한마디..."
                placeholderTextColor={Colors.TEXT_MUTED}
                maxLength={200}
              />
            </View>
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={Colors.TEXT_PRIMARY} />
          ) : (
            <Text style={styles.submitButtonText}>체크인 완료</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  backBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
  },
  headerTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },
  formContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 12,
  },

  // Sleep Hours Slider
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sliderBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.BG_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  sliderBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
  },
  sliderValue: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXXL,
    color: Colors.TEXT_PRIMARY,
    marginHorizontal: 24,
    minWidth: 100,
    textAlign: 'center',
  },
  sliderTrack: {
    height: 6,
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 6,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 3,
  },

  // Memo
  memoInput: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },

  // Submit
  submitButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },

  // Confetti
  confettiOverlay: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    zIndex: 100,
  },
  confettiText: {
    fontSize: 80,
  },

  // Completed
  completedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  completedEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  completedTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXXL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  completedSubtitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 32,
  },
  streakCard: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  streakLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 4,
  },
  streakCount: {
    fontFamily: Fonts.BOLD,
    fontSize: 36,
    color: Colors.PRIMARY,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  rewardItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  rewardValue: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.PRIMARY,
  },
  rewardLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },
  rewardDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.BORDER,
  },
  doneButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  doneButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
});
