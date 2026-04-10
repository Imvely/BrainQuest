import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { GRADE_CONFIG, QuestGrade } from '../../constants/game';
import { QuestCategory, QuestGenerateResponse } from '../../types/quest';
import { QuestStackParamList } from '../../navigation/MainTab';
import { useGenerateQuest } from '../../hooks/useQuests';
import { createQuest } from '../../api/quest';
import { createTimeBlock } from '../../api/map';
import type { BlockCategory } from '../../types/timeline';
import Card from '../../components/common/Card';

const QUEST_TO_BLOCK_CATEGORY: Record<QuestCategory, BlockCategory> = {
  WORK: 'WORK',
  HOME: 'HOME',
  HEALTH: 'HEALTH',
  SOCIAL: 'SOCIAL',
  SELF: 'CUSTOM',
};
import Button from '../../components/common/Button';
import GradeIcon from '../../components/quest/GradeIcon';

type Navigation = StackNavigationProp<QuestStackParamList, 'QuestCreate'>;

const CATEGORIES: { key: QuestCategory; label: string }[] = [
  { key: 'WORK', label: '업무' },
  { key: 'HOME', label: '가사' },
  { key: 'HEALTH', label: '건강' },
  { key: 'SOCIAL', label: '사회' },
  { key: 'SELF', label: '자기관리' },
];

function getGradeForMin(min: number): QuestGrade {
  if (min <= 10) return 'E';
  if (min <= 30) return 'D';
  if (min <= 60) return 'C';
  if (min <= 120) return 'B';
  return 'A';
}

const SLIDER_MIN = 5;
const SLIDER_MAX = 180;

export default function QuestCreateScreen() {
  const navigation = useNavigation<Navigation>();
  const generateQuest = useGenerateQuest();

  // Step: 1=input, 2=loading, 3=result
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 state
  const [title, setTitle] = useState('');
  const [estimatedMin, setEstimatedMin] = useState(30);
  const [category, setCategory] = useState<QuestCategory>('WORK');
  const [dueDate, setDueDate] = useState('');

  // Step 3 state
  const [result, setResult] = useState<QuestGenerateResponse | null>(null);
  const [addToTimeline, setAddToTimeline] = useState(false);
  const [saving, setSaving] = useState(false);

  const previewGrade = getGradeForMin(estimatedMin);

  // Loading animation — stop when leaving step 2
  const rotation = useSharedValue(0);
  useEffect(() => {
    if (step !== 2) rotation.value = 0;
  }, [step, rotation]);
  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleGenerate = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('알림', '할 일을 입력해주세요');
      return;
    }

    setStep(2);
    rotation.value = withRepeat(
      withTiming(360, { duration: 1500, easing: Easing.linear }),
      -1,
    );

    generateQuest.mutate(
      { originalTitle: title.trim(), estimatedMin, category },
      {
        onSuccess: (res) => {
          setResult(res.data);
          setStep(3);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => {
          Alert.alert('변환 실패', 'AI 퀘스트 변환에 실패했습니다. 다시 시도해주세요.');
          setStep(1);
        },
      },
    );
  }, [title, estimatedMin, category, generateQuest, rotation]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    setSaving(true);
    try {
      const questRes = await createQuest({
        ...result,
        originalTitle: title.trim(),
        category,
      });

      // Create time block if user opted in
      if (addToTimeline && questRes.data) {
        const today = new Date().toISOString().slice(0, 10);
        const now = new Date();
        const startH = String(now.getHours()).padStart(2, '0');
        const startM = String(now.getMinutes()).padStart(2, '0');
        const endDate = new Date(now.getTime() + result.estimatedMin * 60000);
        const endH = String(endDate.getHours()).padStart(2, '0');
        const endM = String(endDate.getMinutes()).padStart(2, '0');

        try {
          await createTimeBlock({
            blockDate: today,
            startTime: `${startH}:${startM}`,
            endTime: `${endH}:${endM}`,
            category: QUEST_TO_BLOCK_CATEGORY[category],
            title: result.questTitle,
            questId: questRes.data.id,
          });
        } catch {
          // Time block creation failure is non-fatal
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch {
      Alert.alert('저장 실패', '퀘스트 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }, [result, title, category, addToTimeline, navigation]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setStep(1);
  }, []);

  // --- Step 1: Input ---
  if (step === 1) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.backBtn}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>퀘스트 생성</Text>
            <View style={styles.headerRight} />
          </View>

          {/* Title input */}
          <Text style={styles.sectionLabel}>할 일을 입력하세요</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="예: 설거지, 보고서 작성, 운동..."
            placeholderTextColor={Colors.TEXT_MUTED}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            autoFocus
          />

          {/* Time slider */}
          <Text style={styles.sectionLabel}>예상 소요 시간</Text>
          <View style={styles.sliderWrap}>
            <View style={styles.gradePreview}>
              <GradeIcon grade={previewGrade} size={32} />
              <Text style={styles.gradePreviewText}>{previewGrade}급</Text>
            </View>
            <Text style={styles.timeValue}>{estimatedMin}분</Text>
          </View>

          {/* Grade guide */}
          <View style={styles.gradeGuide}>
            {(['E', 'D', 'C', 'B', 'A'] as QuestGrade[]).map((g) => (
              <Text key={g} style={[styles.gradeHint, previewGrade === g && styles.gradeHintActive]}>
                {g}: {g === 'A' ? '120+분' : `~${GRADE_CONFIG[g].maxMin}분`}
              </Text>
            ))}
          </View>

          {/* Time quick buttons */}
          <View style={styles.timeButtons}>
            {[5, 10, 15, 30, 60, 90, 120, 180].map((min) => (
              <TouchableOpacity
                key={min}
                style={[styles.timeBtn, estimatedMin === min && styles.timeBtnActive]}
                onPress={() => setEstimatedMin(min)}
                activeOpacity={0.7}
              >
                <Text style={[styles.timeBtnText, estimatedMin === min && styles.timeBtnTextActive]}>
                  {min >= 60 ? `${min / 60}h` : `${min}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category chips */}
          <Text style={styles.sectionLabel}>카테고리</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const active = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catChip, active && styles.catChipActive]}
                  onPress={() => setCategory(cat.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Due date (optional, simple text input) */}
          <Text style={styles.sectionLabel}>마감일 (선택)</Text>
          <TextInput
            style={styles.dateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.TEXT_MUTED}
            value={dueDate}
            onChangeText={setDueDate}
            maxLength={10}
          />

          {/* Generate button */}
          <Button
            title="퀘스트 변환!"
            onPress={handleGenerate}
            variant="secondary"
            size="lg"
            disabled={!title.trim()}
            style={styles.generateBtn}
          />
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- Step 2: Loading ---
  if (step === 2) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.magicCircle, rotationStyle]}>
            <Text style={styles.magicCircleText}>{'✦'}</Text>
          </Animated.View>
          <Text style={styles.loadingTitle}>마법진 가동 중...</Text>
          <Text style={styles.loadingDesc}>
            "{title}" 을(를){'\n'}RPG 퀘스트로 변환하고 있어요
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Step 3: Result ---
  if (!result) return null;

  const gradeConfig = GRADE_CONFIG[result.grade];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>퀘스트 변환 완료</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Quest title */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <Text style={styles.resultQuestTitle}>{result.questTitle}</Text>
        </Animated.View>

        {/* Story card */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <Card style={styles.storyCard}>
            <Text style={styles.storyLabel}>퀘스트 스토리</Text>
            <Text style={styles.storyText}>{result.questStory}</Text>
          </Card>
        </Animated.View>

        {/* Grade & Rewards */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)}>
          <View style={styles.rewardRow}>
            <GradeIcon grade={result.grade} size={48} />
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardTitle}>{result.grade}급 퀘스트</Text>
              <View style={styles.rewardBadges}>
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardBadgeText}>+{result.expReward} XP</Text>
                </View>
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardBadgeText}>+{result.goldReward} G</Text>
                </View>
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardBadgeText}>{result.estimatedMin}분</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Checkpoints */}
        <Animated.View entering={FadeInDown.delay(550).duration(400)}>
          <Text style={styles.sectionLabel}>체크포인트</Text>
          {result.checkpoints.map((cp, idx) => (
            <View key={idx} style={styles.cpRow}>
              <View style={styles.cpNum}>
                <Text style={styles.cpNumText}>{idx + 1}</Text>
              </View>
              <View style={styles.cpContent}>
                <Text style={styles.cpTitle}>{cp.title}</Text>
                <Text style={styles.cpMeta}>{cp.estimatedMin}분 | +{cp.expReward}XP</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Timeline toggle */}
        <Animated.View entering={FadeInDown.delay(700).duration(400)}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setAddToTimeline(!addToTimeline)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleLabel}>타임라인에 배치할까요?</Text>
            <View style={[styles.toggleSwitch, addToTimeline && styles.toggleSwitchOn]}>
              <View style={[styles.toggleKnob, addToTimeline && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Button
            title="다시 변환"
            onPress={handleRetry}
            variant="outline"
            size="lg"
            style={styles.retryBtn}
          />
          <Button
            title="이 퀘스트로 시작!"
            onPress={handleSave}
            variant="secondary"
            size="lg"
            loading={saving}
            style={styles.saveBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
    paddingRight: 12,
  },
  headerTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },
  headerRight: {
    width: 36,
  },

  // Section
  sectionLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },

  // Step 1: Input
  titleInput: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  sliderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  gradePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradePreviewText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
  timeValue: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXXL,
    color: Colors.SECONDARY,
  },
  gradeGuide: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  gradeHint: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  gradeHintActive: {
    color: Colors.SECONDARY,
    fontFamily: Fonts.BOLD,
  },
  timeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  timeBtn: {
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  timeBtnActive: {
    backgroundColor: Colors.SECONDARY,
    borderColor: Colors.SECONDARY,
  },
  timeBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  timeBtnTextActive: {
    color: Colors.TEXT_PRIMARY,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  catChipActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  catChipText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  catChipTextActive: {
    color: Colors.TEXT_PRIMARY,
  },
  dateInput: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  generateBtn: {
    marginHorizontal: 20,
    marginTop: 28,
  },

  // Step 2: Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  magicCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.SECONDARY,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  magicCircleText: {
    fontSize: 36,
    color: Colors.SECONDARY,
  },
  loadingTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.SECONDARY,
    marginBottom: 12,
  },
  loadingDesc: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Step 3: Result
  resultQuestTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.SECONDARY,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  storyCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  storyLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    marginBottom: 8,
  },
  storyText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    lineHeight: 22,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 8,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 6,
  },
  rewardBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  rewardBadge: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rewardBadgeText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.SECONDARY,
  },

  // Checkpoints
  cpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  cpNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.BG_INPUT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cpNumText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  cpContent: {
    flex: 1,
  },
  cpTitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 2,
  },
  cpMeta: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
  },
  toggleSwitch: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.BG_INPUT,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchOn: {
    backgroundColor: Colors.SECONDARY,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.TEXT_SECONDARY,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.TEXT_PRIMARY,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  retryBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
});
