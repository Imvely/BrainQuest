import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { GRADE_CONFIG } from '../../constants/game';
import { Quest } from '../../types/quest';
import Card from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import GradeIcon from './GradeIcon';

interface QuestCardProps {
  quest: Quest;
  onPress: (quest: Quest) => void;
}

export default memo(function QuestCard({ quest, onPress }: QuestCardProps) {
  // 목록 응답(QuestResponse)에는 checkpoints 배열이 없으므로
  // completedCheckpoints/totalCheckpoints 필드를 우선 사용, 상세(QuestDetailResponse)에서는 배열 계산.
  const completed =
    quest.completedCheckpoints ??
    quest.checkpoints?.filter((c) => c.status === 'COMPLETED').length ??
    0;
  const total = quest.totalCheckpoints ?? quest.checkpoints?.length ?? 0;
  const progress = total > 0 ? completed / total : 0;
  const isCompleted = quest.status === 'COMPLETED';
  const isUrgent = useMemo(() => {
    if (!quest.dueDate) return false;
    const diff = new Date(quest.dueDate).getTime() - Date.now();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }, [quest.dueDate]);

  const dueCountdown = useMemo(() => {
    if (!quest.dueDate) return null;
    const diff = new Date(quest.dueDate).getTime() - Date.now();
    if (diff <= 0) return '마감 초과';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}시간 남음`;
    const days = Math.floor(hours / 24);
    return `${days}일 남음`;
  }, [quest.dueDate]);

  return (
    <TouchableOpacity onPress={() => onPress(quest)} activeOpacity={0.7}>
      <Card
        style={StyleSheet.flatten([
          styles.card,
          isUrgent ? styles.urgentCard : undefined,
          isCompleted ? styles.completedCard : undefined,
        ])}
      >
        <View style={styles.row}>
          {/* Left: Grade badge */}
          <GradeIcon grade={quest.grade} size={40} />

          {/* Center: Title & progress */}
          <View style={styles.center}>
            <Text style={[styles.questTitle, isCompleted && styles.completedTitle]} numberOfLines={1}>
              {quest.questTitle}
            </Text>
            <Text style={styles.originalTitle} numberOfLines={1}>
              {quest.originalTitle}
            </Text>
            <ProgressBar
              progress={progress}
              color={isCompleted ? Colors.SUCCESS : Colors.SECONDARY}
              height={4}
              style={styles.progressBar}
            />
          </View>

          {/* Right: Time & rewards */}
          <View style={styles.right}>
            <Text style={styles.timeText}>{quest.estimatedMin}min</Text>
            <Text style={styles.rewardText}>+{quest.expReward}XP</Text>
            <Text style={styles.rewardText}>+{quest.goldReward}G</Text>
          </View>
        </View>

        {/* Urgent countdown or completed stamp */}
        {isUrgent && dueCountdown && (
          <View style={styles.urgentBanner}>
            <Text style={styles.urgentText}>{dueCountdown}</Text>
          </View>
        )}
        {isCompleted && (
          <View style={styles.clearStamp}>
            <Text style={styles.clearText}>CLEAR</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  urgentCard: {
    borderWidth: 1.5,
    borderColor: Colors.ERROR,
  },
  completedCard: {
    opacity: 0.75,
    borderWidth: 1,
    borderColor: Colors.GOLD,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  center: {
    flex: 1,
  },
  questTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 2,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: Colors.TEXT_SECONDARY,
  },
  originalTitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    marginBottom: 6,
  },
  progressBar: {
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  timeText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.SECONDARY,
  },
  rewardText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  urgentBanner: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: Colors.ERROR,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  urgentText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XS,
    color: Colors.TEXT_PRIMARY,
  },
  clearStamp: {
    position: 'absolute',
    top: '50%',
    right: 16,
    transform: [{ translateY: -16 }, { rotate: '-15deg' }],
    borderWidth: 2,
    borderColor: Colors.GOLD,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.GOLD,
    letterSpacing: 2,
  },
});
