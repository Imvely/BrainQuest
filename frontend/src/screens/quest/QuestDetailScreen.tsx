import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { QuestStackParamList } from '../../navigation/MainTab';
import { Checkpoint } from '../../types/quest';
import { useQuestDetail, useCompleteCheckpoint } from '../../hooks/useQuests';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';
import GradeIcon from '../../components/quest/GradeIcon';
import CheckpointList from '../../components/quest/CheckpointList';

type DetailRoute = RouteProp<QuestStackParamList, 'QuestDetail'>;
type Navigation = StackNavigationProp<QuestStackParamList, 'QuestDetail'>;

export default function QuestDetailScreen() {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<DetailRoute>();
  const { questId } = route.params;

  const { data: quest, isLoading } = useQuestDetail(questId);
  const completeCheckpoint = useCompleteCheckpoint();

  const [storyExpanded, setStoryExpanded] = useState(false);
  const [rewardVisible, setRewardVisible] = useState(false);
  const [rewardData, setRewardData] = useState<{ exp: number; gold: number } | null>(null);
  const [questComplete, setQuestComplete] = useState(false);

  // Floating reward animation
  const rewardOpacity = useSharedValue(0);
  const rewardTranslateY = useSharedValue(0);
  const rewardStyle = useAnimatedStyle(() => ({
    opacity: rewardOpacity.value,
    transform: [{ translateY: rewardTranslateY.value }],
  }));

  const showRewardEffect = useCallback(
    (exp: number, gold: number) => {
      setRewardData({ exp, gold });
      setRewardVisible(true);
      rewardOpacity.value = 0;
      rewardTranslateY.value = 0;

      rewardOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1200, withTiming(0, { duration: 400 })),
      );
      rewardTranslateY.value = withTiming(-80, { duration: 1800 });

      setTimeout(() => setRewardVisible(false), 2000);
    },
    [rewardOpacity, rewardTranslateY],
  );

  const completed = useMemo(
    () => quest?.checkpoints.filter((c) => c.status === 'COMPLETED').length ?? 0,
    [quest],
  );
  const total = quest?.checkpoints.length ?? 0;
  const progress = total > 0 ? completed / total : 0;

  const handleComplete = useCallback(
    (cp: Checkpoint) => {
      if (!quest) return;
      completeCheckpoint.mutate(
        { questId: quest.id, checkpointId: cp.id },
        {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showRewardEffect(cp.expReward, cp.goldReward);

            // Check if all checkpoints are now completed
            const newCompleted = completed + 1;
            if (newCompleted >= total) {
              setTimeout(() => {
                setQuestComplete(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }, 1500);
            }
          },
          onError: () => {
            Alert.alert('실패', '체크포인트 완료 처리에 실패했습니다.');
          },
        },
      );
    },
    [quest, completeCheckpoint, completed, total, showRewardEffect],
  );

  const handleBattle = useCallback(
    (cp: Checkpoint) => {
      // Navigate to Battle tab with checkpoint context
      navigation.getParent()?.navigate('Battle', {
        screen: 'BattleHome',
        params: { questId, checkpointId: cp.id },
      });
    },
    [navigation, questId],
  );

  const handleAbandon = useCallback(() => {
    Alert.alert(
      '퀘스트 포기',
      '정말 이 퀘스트를 포기하시겠습니까?\n포기한 퀘스트에 대한 보상은 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '포기할래요',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '최종 확인',
              '이 작업은 되돌릴 수 없습니다.',
              [
                { text: '돌아가기', style: 'cancel' },
                {
                  text: '포기 확정',
                  style: 'destructive',
                  onPress: () => navigation.goBack(),
                },
              ],
            );
          },
        },
      ],
    );
  }, [navigation]);

  if (isLoading || !quest) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  // --- Quest Complete overlay ---
  if (questComplete) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.completeOverlay}>
          <Text style={styles.completeEmoji}>{'🎉'}</Text>
          <Text style={styles.completeTitle}>퀘스트 클리어!</Text>
          <Text style={styles.completeQuestName}>{quest.questTitle}</Text>

          <Card style={styles.completeRewardCard}>
            <Text style={styles.completeRewardLabel}>획득 보상</Text>
            <View style={styles.completeRewardRow}>
              <View style={styles.completeRewardItem}>
                <Text style={styles.completeRewardValue}>+{quest.expReward}</Text>
                <Text style={styles.completeRewardUnit}>XP</Text>
              </View>
              <View style={styles.completeRewardItem}>
                <Text style={styles.completeRewardValue}>+{quest.goldReward}</Text>
                <Text style={styles.completeRewardUnit}>Gold</Text>
              </View>
            </View>
          </Card>

          <View style={styles.completeActions}>
            <TouchableOpacity
              style={styles.shareBtn}
              activeOpacity={0.7}
              onPress={() => Alert.alert('공유', '공유 기능은 준비중입니다.')}
            >
              <Text style={styles.shareBtnText}>클리어 카드 공유</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneBtn}
              activeOpacity={0.7}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.doneBtnText}>돌아가기</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backBtn}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>퀘스트 상세</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Quest title + grade */}
        <View style={styles.titleRow}>
          <GradeIcon grade={quest.grade} size={44} />
          <View style={styles.titleContent}>
            <Text style={styles.questTitle}>{quest.questTitle}</Text>
            <Text style={styles.originalTitle}>{quest.originalTitle}</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressWrap}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>진행률</Text>
            <Text style={styles.progressCount}>{completed}/{total}</Text>
          </View>
          <ProgressBar progress={progress} color={Colors.SECONDARY} height={6} />
        </View>

        {/* Story card (collapsible) */}
        <TouchableOpacity
          onPress={() => setStoryExpanded(!storyExpanded)}
          activeOpacity={0.7}
        >
          <Card style={styles.storyCard}>
            <View style={styles.storyHeader}>
              <Text style={styles.storyLabel}>퀘스트 스토리</Text>
              <Text style={styles.storyToggle}>{storyExpanded ? '접기' : '펼치기'}</Text>
            </View>
            {storyExpanded && (
              <Animated.View entering={FadeInDown.duration(250)}>
                <Text style={styles.storyText}>{quest.questStory}</Text>
              </Animated.View>
            )}
          </Card>
        </TouchableOpacity>

        {/* Rewards summary */}
        <View style={styles.rewardSummary}>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardBadgeText}>{quest.estimatedMin}분</Text>
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardBadgeText}>+{quest.expReward} XP</Text>
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardBadgeText}>+{quest.goldReward} G</Text>
          </View>
        </View>

        {/* Checkpoint list */}
        <Text style={styles.sectionLabel}>체크포인트</Text>
        <CheckpointList
          checkpoints={quest.checkpoints}
          loading={completeCheckpoint.isPending}
          onComplete={handleComplete}
          onBattle={handleBattle}
        />

        {/* Abandon button */}
        {quest.status !== 'COMPLETED' && quest.status !== 'ABANDONED' && (
          <TouchableOpacity
            style={styles.abandonBtn}
            onPress={handleAbandon}
            activeOpacity={0.7}
          >
            <Text style={styles.abandonBtnText}>퀘스트 포기</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Floating reward effect */}
      {rewardVisible && rewardData && (
        <Animated.View style={[styles.floatingReward, rewardStyle]} pointerEvents="none">
          <Text style={styles.floatingRewardText}>
            +{rewardData.exp}XP  +{rewardData.gold}G
          </Text>
        </Animated.View>
      )}
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
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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

  // Title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 14,
    marginBottom: 16,
  },
  titleContent: {
    flex: 1,
  },
  questTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.SECONDARY,
    marginBottom: 4,
  },
  originalTitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },

  // Progress
  progressWrap: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  progressCount: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.SECONDARY,
  },

  // Story
  storyCard: {
    marginHorizontal: 20,
    marginBottom: 12,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storyLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },
  storyToggle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.PRIMARY,
  },
  storyText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    lineHeight: 22,
    marginTop: 10,
  },

  // Rewards
  rewardSummary: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  rewardBadge: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rewardBadgeText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.SECONDARY,
  },

  // Section
  sectionLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  // Abandon
  abandonBtn: {
    alignSelf: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.ERROR,
  },
  abandonBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.ERROR,
  },

  // Floating reward
  floatingReward: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: Colors.REWARD_FLOAT,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  floatingRewardText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },

  // Quest Complete overlay
  completeOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  completeEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  completeTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXXL,
    color: Colors.SECONDARY,
    marginBottom: 8,
  },
  completeQuestName: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 24,
    textAlign: 'center',
  },
  completeRewardCard: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  completeRewardLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    marginBottom: 12,
  },
  completeRewardRow: {
    flexDirection: 'row',
    gap: 32,
  },
  completeRewardItem: {
    alignItems: 'center',
  },
  completeRewardValue: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXXL,
    color: Colors.SECONDARY,
  },
  completeRewardUnit: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },
  completeActions: {
    width: '100%',
    gap: 10,
  },
  shareBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  shareBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
  doneBtn: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
  },
});
