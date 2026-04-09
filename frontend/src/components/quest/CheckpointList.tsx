import React, { memo, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { Checkpoint, CheckpointStatus } from '../../types/quest';

interface CheckpointListProps {
  checkpoints: Checkpoint[];
  loading?: boolean;
  onComplete: (checkpoint: Checkpoint) => void;
  onBattle: (checkpoint: Checkpoint) => void;
}

export default memo(function CheckpointList({
  checkpoints,
  loading,
  onComplete,
  onBattle,
}: CheckpointListProps) {
  const sorted = useMemo(
    () => [...checkpoints].sort((a, b) => a.orderNum - b.orderNum),
    [checkpoints],
  );

  return (
    <View style={styles.container}>
      {sorted.map((cp, idx) => (
        <CheckpointRow
          key={cp.id}
          checkpoint={cp}
          isLast={idx === sorted.length - 1}
          loading={loading}
          onComplete={onComplete}
          onBattle={onBattle}
        />
      ))}
    </View>
  );
});

interface CheckpointRowProps {
  checkpoint: Checkpoint;
  isLast: boolean;
  loading?: boolean;
  onComplete: (cp: Checkpoint) => void;
  onBattle: (cp: Checkpoint) => void;
}

const CheckpointRow = memo(function CheckpointRow({
  checkpoint,
  isLast,
  loading,
  onComplete,
  onBattle,
}: CheckpointRowProps) {
  const { status, title, estimatedMin, expReward, goldReward } = checkpoint;
  const isCompleted = status === 'COMPLETED';
  const isInProgress = status === 'IN_PROGRESS';

  // Pulse animation for IN_PROGRESS
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (isInProgress) {
      pulse.value = withRepeat(
        withTiming(1.2, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulse.value = 1;
    }
  }, [isInProgress, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const [showActions, setShowActions] = React.useState(false);

  const handlePress = useCallback(() => {
    if (isCompleted) return;
    setShowActions((prev) => !prev);
  }, [isCompleted]);

  return (
    <View style={styles.rowWrapper}>
      {/* Connector line */}
      {!isLast && <View style={[styles.connector, isCompleted && styles.connectorDone]} />}

      <TouchableOpacity
        style={styles.row}
        onPress={handlePress}
        activeOpacity={isCompleted ? 1 : 0.7}
      >
        {/* Status circle */}
        <Animated.View
          style={[
            styles.circle,
            isCompleted && styles.circleDone,
            isInProgress && styles.circleActive,
            pulseStyle,
          ]}
        >
          {isCompleted && <Text style={styles.checkMark}>{'✓'}</Text>}
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.title, isCompleted && styles.titleDone]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{estimatedMin}min</Text>
            <Text style={styles.metaText}>+{expReward}XP</Text>
            <Text style={styles.metaText}>+{goldReward}G</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Action buttons */}
      {showActions && !isCompleted && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.actions}>
          <TouchableOpacity
            style={styles.battleBtn}
            onPress={() => {
              setShowActions(false);
              onBattle(checkpoint);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.battleBtnText}>전투 모드로 시작!</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.completeBtn}
            onPress={() => {
              setShowActions(false);
              onComplete(checkpoint);
            }}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.TEXT_PRIMARY} size="small" />
            ) : (
              <Text style={styles.completeBtnText}>그냥 완료 처리</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingLeft: 8,
  },
  rowWrapper: {
    position: 'relative',
    paddingLeft: 20,
    marginBottom: 4,
  },
  connector: {
    position: 'absolute',
    left: 29,
    top: 28,
    bottom: -4,
    width: 2,
    backgroundColor: Colors.BORDER,
  },
  connectorDone: {
    backgroundColor: Colors.SUCCESS,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  circleDone: {
    backgroundColor: Colors.SUCCESS,
    borderColor: Colors.SUCCESS,
  },
  circleActive: {
    borderColor: Colors.SECONDARY,
    backgroundColor: Colors.BG_INPUT,
  },
  checkMark: {
    fontFamily: Fonts.BOLD,
    fontSize: 12,
    color: Colors.TEXT_PRIMARY,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: Colors.TEXT_MUTED,
  },
  meta: {
    flexDirection: 'row',
    gap: 10,
  },
  metaText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 34,
    paddingBottom: 8,
  },
  battleBtn: {
    flex: 1,
    backgroundColor: Colors.PRIMARY,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  battleBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_PRIMARY,
  },
  completeBtn: {
    flex: 1,
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completeBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
});
