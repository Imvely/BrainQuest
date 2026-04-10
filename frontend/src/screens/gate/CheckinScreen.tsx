import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
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
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import LottieView from 'lottie-react-native';
import { format, subDays } from 'date-fns';

import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { STREAK_BONUS } from '../../constants/game';
import {
  submitCheckin,
  getTodayCheckins,
  getStreaks,
  getMedications,
  createMedLog,
} from '../../api/gate';
import { getTimeline } from '../../api/map';
import type { CheckinResponse, CheckinRecord, Medication, DailySummary } from '../../api/gate';
import { useGateStore } from '../../stores/useGateStore';
import type { TimeBlock } from '../../types/timeline';
import Toast from '../../components/common/Toast';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type CheckinType = 'MORNING' | 'EVENING';

function getCheckinType(): CheckinType {
  const h = new Date().getHours();
  return h >= 4 && h <= 13 ? 'MORNING' : 'EVENING';
}

const SLEEP_QUALITY_OPTIONS = [
  { value: 1, emoji: '😫', label: '나쁨' },
  { value: 2, emoji: '😐', label: '보통' },
  { value: 3, emoji: '😊', label: '좋음' },
];

const CONDITION_OPTIONS = [
  { value: 1, emoji: '😫', label: '최악' },
  { value: 2, emoji: '😕', label: '나쁨' },
  { value: 3, emoji: '😐', label: '보통' },
  { value: 4, emoji: '😊', label: '좋음' },
  { value: 5, emoji: '🔥', label: '최고' },
];

const FOCUS_OPTIONS = [
  { value: 1, emoji: '😫', label: '최악' },
  { value: 2, emoji: '😕', label: '나쁨' },
  { value: 3, emoji: '😐', label: '보통' },
  { value: 4, emoji: '😊', label: '좋음' },
  { value: 5, emoji: '🔥', label: '최고' },
];

const IMPULSIVITY_OPTIONS = [
  { value: 1, emoji: '😤', label: '심함' },
  { value: 2, emoji: '😠', label: '많음' },
  { value: 3, emoji: '😐', label: '보통' },
  { value: 4, emoji: '😌', label: '적음' },
  { value: 5, emoji: '😊', label: '없음' },
];

const EMOTION_OPTIONS = [
  { value: 1, emoji: '🌧️', label: '폭풍' },
  { value: 2, emoji: '☁️', label: '흐림' },
  { value: 3, emoji: '😐', label: '보통' },
  { value: 4, emoji: '⛅', label: '맑음' },
  { value: 5, emoji: '☀️', label: '쾌청' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface EmojiRowProps {
  label: string;
  options: { value: number; emoji: string; label: string }[];
  selected: number | null;
  onSelect: (v: number) => void;
}

function EmojiRow({ label, options, selected, onSelect }: EmojiRowProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.emojiRow}>
        {options.map((opt) => {
          const isActive = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel={`${label} ${opt.label}`}
              style={[styles.emojiBtn, isActive && styles.emojiBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(opt.value);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.emojiBtnText, isActive && styles.emojiBtnTextActive]}>
                {opt.emoji}
              </Text>
              <Text style={[styles.emojiBtnLabel, isActive && styles.emojiBtnLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// CheckinScreen
// ---------------------------------------------------------------------------

export default function CheckinScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const queryClient = useQueryClient();
  const checkinType = useMemo(getCheckinType, []);
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const yesterday = useMemo(() => format(subDays(new Date(), 1), 'yyyy-MM-dd'), []);

  const {
    todayMorningCheckin,
    todayEveningCheckin,
    yesterdayEveningCheckin,
    setTodayCheckin,
    setYesterdayEveningCheckin,
    setStreaks,
    setMedications,
    medications,
  } = useGateStore();

  // --- State ---
  const [initialLoading, setInitialLoading] = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [missedEvening, setMissedEvening] = useState(false);
  const [fillMissedEvening, setFillMissedEvening] = useState(false);

  // Morning fields
  const [sleepHours, setSleepHours] = useState(7.0);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [condition, setCondition] = useState<number | null>(null);
  const [medTaken, setMedTaken] = useState<Record<number, boolean>>({});

  // Evening fields
  const [focusScore, setFocusScore] = useState<number | null>(null);
  const [impulsivityScore, setImpulsivityScore] = useState<number | null>(null);
  const [emotionScore, setEmotionScore] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [showMemo, setShowMemo] = useState(false);

  // Submit
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<CheckinResponse | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [streakBonusMsg, setStreakBonusMsg] = useState<string | null>(null);

  // Evening summary modal
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);

  const autoNavTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Confetti
  const confettiScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);
  const confettiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confettiScale.value }],
    opacity: confettiOpacity.value,
  }));

  // --- Init: check today's checkins, streaks, meds ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [todayRes, yesterdayRes, streakRes, medRes] = await Promise.all([
          getTodayCheckins(today),
          checkinType === 'MORNING' ? getTodayCheckins(yesterday) : Promise.resolve(null),
          getStreaks(),
          getMedications(),
        ]);

        if (cancelled) return;

        const todayRecords = todayRes.data ?? [];
        const morning = todayRecords.find((r: CheckinRecord) => r.checkinType === 'MORNING') ?? null;
        const evening = todayRecords.find((r: CheckinRecord) => r.checkinType === 'EVENING') ?? null;
        setTodayCheckin('MORNING', morning);
        setTodayCheckin('EVENING', evening);

        // Check missed evening yesterday
        if (checkinType === 'MORNING' && yesterdayRes) {
          const yesterdayRecords = yesterdayRes.data ?? [];
          const yEvening = yesterdayRecords.find((r: CheckinRecord) => r.checkinType === 'EVENING') ?? null;
          setYesterdayEveningCheckin(yEvening);
          if (!yEvening) setMissedEvening(true);
        }

        if (streakRes.data) setStreaks(streakRes.data);

        const activeMeds = (medRes.data ?? []).filter((m: Medication) => m.isActive);
        setMedications(activeMeds);

        // Already done?
        if (checkinType === 'MORNING' && morning) setAlreadyDone(true);
        if (checkinType === 'EVENING' && evening) setAlreadyDone(true);
      } catch {
        // Allow offline usage, show form anyway
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [today, yesterday, checkinType, setTodayCheckin, setYesterdayEveningCheckin, setStreaks, setMedications]);

  // Cleanup auto-nav timer
  useEffect(() => {
    return () => {
      if (autoNavTimer.current) clearTimeout(autoNavTimer.current);
    };
  }, []);

  // --- Validation ---
  const activeType = fillMissedEvening ? 'EVENING' : checkinType;

  const isMorningValid = activeType === 'MORNING' && sleepQuality !== null && condition !== null;
  const isEveningValid = activeType === 'EVENING' && focusScore !== null && impulsivityScore !== null && emotionScore !== null;
  const isValid = isMorningValid || isEveningValid;

  // --- Submit ---
  const handleSubmit = useCallback(async () => {
    if (!isValid) return;
    setLoading(true);

    try {
      const dateForSubmit = fillMissedEvening ? yesterday : today;

      const body = activeType === 'MORNING'
        ? { checkinType: 'MORNING' as const, checkinDate: dateForSubmit, sleepHours, sleepQuality: sleepQuality!, condition: condition! }
        : { checkinType: 'EVENING' as const, checkinDate: dateForSubmit, focusScore: focusScore!, impulsivityScore: impulsivityScore!, emotionScore: emotionScore!, memo: memo || undefined };

      const response = await submitCheckin(body);

      // Log med if checked
      if (activeType === 'MORNING') {
        const medPromises = Object.entries(medTaken)
          .filter(([, taken]) => taken)
          .map(([id]) => createMedLog({ medicationId: Number(id) }).catch(() => {}));
        await Promise.all(medPromises);
      }

      const res = response.data;
      setResult(res);
      setCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Refresh character data so EXP bar updates on timeline
      queryClient.invalidateQueries({ queryKey: ['character'] });

      // Confetti
      confettiScale.value = withSequence(
        withSpring(1.2, { damping: 4 }),
        withDelay(1000, withTiming(0, { duration: 300 })),
      );
      confettiOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1000, withTiming(0, { duration: 300 })),
      );

      setShowToast(true);

      // Streak bonus check
      const streakCount = res.streakCount;
      const bonus = STREAK_BONUS[streakCount];
      if (bonus) {
        setStreakBonusMsg(`${streakCount}일 연속 달성! +${bonus.exp} EXP 보너스!`);
      }

      // Evening summary
      if (activeType === 'EVENING' && !fillMissedEvening) {
        try {
          const timelineRes = await getTimeline(today);
          const blocks: TimeBlock[] = timelineRes.data ?? [];
          const battleBlocks = blocks.filter((b) => b.questId);
          setSummary({
            battleCount: battleBlocks.length,
            battleWins: battleBlocks.filter((b) => b.status === 'COMPLETED').length,
            questCompleted: blocks.filter((b) => b.status === 'COMPLETED').length,
            questTotal: blocks.length,
            dominantWeather: null,
            achievementRate: blocks.length > 0
              ? Math.round((blocks.filter((b) => b.status === 'COMPLETED').length / blocks.length) * 100)
              : 0,
          });
          setShowSummary(true);
        } catch {
          // No summary available, just show completion
        }
      }

      // Morning: auto-navigate after 2s
      if (activeType === 'MORNING') {
        autoNavTimer.current = setTimeout(() => {
          navigation.goBack();
        }, 2000);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }, [
    isValid, activeType, fillMissedEvening, yesterday, today,
    sleepHours, sleepQuality, condition, focusScore, impulsivityScore, emotionScore, memo,
    medTaken, navigation, queryClient, confettiScale, confettiOpacity,
  ]);

  // --- Loading ---
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.PRIMARY} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // --- Already Done ---
  if (alreadyDone && !fillMissedEvening) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="뒤로 가기">
            <Text style={styles.backBtnText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {checkinType === 'MORNING' ? '아침 체크인' : '저녁 체크인'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>{'✅'}</Text>
          <Text style={styles.doneTitle}>
            오늘 {checkinType === 'MORNING' ? '아침' : '저녁'} 체크인을 이미 했어요!
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryBtnText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- Completed State ---
  if (completed && result) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View style={[styles.confettiOverlay, confettiStyle]} pointerEvents="none">
          <Text style={styles.confettiText}>{'🎉'}</Text>
        </Animated.View>

        <Toast
          message={`+${result.reward.exp} EXP  +${result.reward.gold} Gold`}
          visible={showToast}
          onHide={() => setShowToast(false)}
          type="exp"
        />

        <View style={styles.center}>
          <Text style={styles.completedEmoji}>{'✅'}</Text>
          <Text style={styles.completedTitle}>체크인 완료!</Text>
          <Text style={styles.completedSubtitle}>
            연속 {result.streakCount}일째!
          </Text>

          <View style={styles.rewardRow}>
            <View style={styles.rewardItem}>
              <Text style={styles.rewardValue}>+{result.reward.exp}</Text>
              <Text style={styles.rewardLabel}>EXP</Text>
            </View>
            <View style={styles.rewardDivider} />
            <View style={styles.rewardItem}>
              <Text style={[styles.rewardValue, { color: Colors.GOLD }]}>+{result.reward.gold}</Text>
              <Text style={styles.rewardLabel}>Gold</Text>
            </View>
          </View>

          {streakBonusMsg && (
            <Animated.View entering={FadeIn.delay(300)} style={styles.streakBonusBanner}>
              <Text style={styles.streakBonusText}>{streakBonusMsg}</Text>
            </Animated.View>
          )}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              if (autoNavTimer.current) clearTimeout(autoNavTimer.current);
              navigation.goBack();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryBtnText}>홈으로</Text>
          </TouchableOpacity>
        </View>

        {/* Evening Summary Modal */}
        <Modal visible={showSummary} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Animated.View entering={FadeIn} style={styles.summaryModal}>
              <Text style={styles.summaryTitle}>오늘의 하루 요약</Text>

              {summary && (
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryCellValue}>{summary.battleCount}전 {summary.battleWins}승</Text>
                    <Text style={styles.summaryCellLabel}>전투</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryCellValue}>{summary.questCompleted}/{summary.questTotal}</Text>
                    <Text style={styles.summaryCellLabel}>일정 완료</Text>
                  </View>
                  <View style={styles.summaryCell}>
                    <Text style={styles.summaryCellValue}>{summary.achievementRate}%</Text>
                    <Text style={styles.summaryCellLabel}>달성률</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => {
                  setShowSummary(false);
                  navigation.goBack();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryBtnText}>수고했어요!</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // --- Form ---
  const activeMeds = medications.filter((m) => m.isActive);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="뒤로 가기">
          <Text style={styles.backBtnText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeType === 'MORNING' ? '아침 체크인 ☀️' : '저녁 체크인 🌙'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Missed evening banner */}
      {missedEvening && !fillMissedEvening && checkinType === 'MORNING' && (
        <TouchableOpacity
          style={styles.missedBanner}
          onPress={() => setFillMissedEvening(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.missedBannerText}>
            어제 저녁 기록도 같이 할까요?
          </Text>
          <Text style={styles.missedBannerArrow}>{'>'}</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Greeting */}
        <Text style={styles.greeting}>
          {activeType === 'MORNING'
            ? '좋은 아침! 오늘의 모험을 준비할까요?'
            : '오늘 하루 수고했어요!'}
        </Text>

        {activeType === 'MORNING' ? (
          <>
            {/* (1) Sleep Hours — horizontal slider */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>어젯밤 수면 시간</Text>
              <Text style={styles.sleepValue}>{sleepHours}시간</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderEdge}>4h</Text>
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${((sleepHours - 4) / 6) * 100}%` }]} />
                </View>
                <Text style={styles.sliderEdge}>10h</Text>
              </View>
              <View style={styles.sliderBtnRow}>
                <TouchableOpacity
                  style={styles.sliderStepBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSleepHours(Math.max(4, +(sleepHours - 0.5).toFixed(1)));
                  }}
                  accessibilityLabel="수면 시간 0.5시간 감소"
                >
                  <Text style={styles.sliderStepText}>-0.5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sliderStepBtn}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSleepHours(Math.min(10, +(sleepHours + 0.5).toFixed(1)));
                  }}
                  accessibilityLabel="수면 시간 0.5시간 증가"
                >
                  <Text style={styles.sliderStepText}>+0.5</Text>
                </TouchableOpacity>
              </View>

              {/* Sleep quality */}
              <View style={styles.qualityRow}>
                {SLEEP_QUALITY_OPTIONS.map((opt) => {
                  const isActive = sleepQuality === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isActive }}
                      accessibilityLabel={`수면 질 ${opt.label}`}
                      style={[styles.qualityBtn, isActive && styles.qualityBtnActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSleepQuality(opt.value);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.qualityEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.qualityLabel, isActive && styles.qualityLabelActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* (2) Medication — only if meds registered */}
            {activeMeds.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>오늘 약 드셨나요?</Text>
                {activeMeds.map((med) => (
                  <TouchableOpacity
                    key={med.id}
                    style={styles.medRow}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setMedTaken((prev) => ({ ...prev, [med.id]: !prev[med.id] }));
                    }}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: !!medTaken[med.id] }}
                    accessibilityLabel={`${med.medName} ${med.dosage} 복용 체크`}
                  >
                    <View style={[styles.medCheck, medTaken[med.id] && styles.medCheckActive]}>
                      {medTaken[med.id] && <Text style={styles.medCheckMark}>{'✓'}</Text>}
                    </View>
                    <Text style={styles.medText}>{med.medName} {med.dosage}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* (3) Condition */}
            <EmojiRow
              label="지금 컨디션은?"
              options={CONDITION_OPTIONS}
              selected={condition}
              onSelect={setCondition}
            />
          </>
        ) : (
          <>
            {/* Evening: 3 questions */}
            <EmojiRow
              label="오늘 집중력은 어땠나요?"
              options={FOCUS_OPTIONS}
              selected={focusScore}
              onSelect={setFocusScore}
            />
            <EmojiRow
              label="오늘 충동성/산만함은?"
              options={IMPULSIVITY_OPTIONS}
              selected={impulsivityScore}
              onSelect={setImpulsivityScore}
            />
            <EmojiRow
              label="오늘 감정은 어땠나요?"
              options={EMOTION_OPTIONS}
              selected={emotionScore}
              onSelect={setEmotionScore}
            />

            {/* Memo toggle */}
            {!showMemo ? (
              <TouchableOpacity onPress={() => setShowMemo(true)} activeOpacity={0.7}>
                <Text style={styles.memoToggle}>+ 메모 추가</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.section}>
                <TextInput
                  style={styles.memoInput}
                  value={memo}
                  onChangeText={setMemo}
                  placeholder="오늘 특별한 일이 있었나요?"
                  placeholderTextColor={Colors.TEXT_MUTED}
                  maxLength={200}
                  returnKeyType="done"
                  accessibilityLabel="한 줄 메모"
                />
              </View>
            )}
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !isValid && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="체크인 완료"
        >
          {loading ? (
            <ActivityIndicator color={Colors.TEXT_PRIMARY} />
          ) : (
            <Text style={styles.submitBtnText}>체크인 완료!</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
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
  headerSpacer: { width: 44 },

  // Missed evening banner
  missedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.WARNING + '22',
    borderColor: Colors.WARNING,
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  missedBannerText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.WARNING,
    flex: 1,
  },
  missedBannerArrow: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.WARNING,
    marginLeft: 8,
  },

  flex: { flex: 1 },

  // Form
  formContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  greeting: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 12,
  },

  // Sleep slider
  sleepValue: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXXL,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderEdge: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
    width: 28,
    textAlign: 'center',
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 3,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 6,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 3,
  },
  sliderBtnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  sliderStepBtn: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  sliderStepText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
  },

  // Sleep quality row
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  qualityBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 64,
  },
  qualityBtnActive: {
    backgroundColor: Colors.PRIMARY + '22',
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  qualityEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  qualityLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  qualityLabelActive: {
    color: Colors.PRIMARY,
    fontFamily: Fonts.BOLD,
  },

  // Medication in morning
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  medCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  medCheckActive: {
    backgroundColor: Colors.SUCCESS,
    borderColor: Colors.SUCCESS,
  },
  medCheckMark: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
  medText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },

  // Emoji row
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emojiBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    minWidth: 56,
    minHeight: 48,
    justifyContent: 'center',
  },
  emojiBtnActive: {
    backgroundColor: Colors.PRIMARY + '22',
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
    transform: [{ scale: 1.15 }],
  },
  emojiBtnText: {
    fontSize: 28,
    marginBottom: 4,
  },
  emojiBtnTextActive: {
    fontSize: 32,
  },
  emojiBtnLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  emojiBtnLabelActive: {
    color: Colors.PRIMARY,
    fontFamily: Fonts.BOLD,
  },

  // Memo
  memoToggle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.PRIMARY,
    marginBottom: 20,
  },
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
  submitBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },

  // Already done
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Completed
  confettiOverlay: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    zIndex: 100,
  },
  confettiText: { fontSize: 80 },
  completedEmoji: { fontSize: 64, marginBottom: 12 },
  completedTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXXL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  completedSubtitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.SECONDARY,
    marginBottom: 32,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    marginTop: 2,
  },
  rewardDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.BORDER,
  },
  streakBonusBanner: {
    backgroundColor: Colors.GOLD + '22',
    borderColor: Colors.GOLD,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 24,
  },
  streakBonusText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.GOLD,
    textAlign: 'center',
  },

  // Primary button (reusable)
  primaryBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },

  // Evening summary modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.OVERLAY,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  summaryModal: {
    backgroundColor: Colors.BG_SECONDARY,
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
  },
  summaryTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 24,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 28,
  },
  summaryCell: {
    alignItems: 'center',
  },
  summaryCellValue: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.SECONDARY,
    marginBottom: 4,
  },
  summaryCellLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
});
