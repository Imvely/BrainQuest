import React, { memo, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { MAX_COMBO } from '../../constants/game';

interface ComboGaugeProps {
  count: number;
}

const ComboDot = memo(function ComboDot({ filled }: { filled: boolean }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (filled) {
      scale.value = withSpring(1.3, { damping: 8 }, () => {
        scale.value = withSpring(1);
      });
    }
  }, [filled, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[styles.dot, filled ? styles.dotFilled : styles.dotEmpty, style]}
    />
  );
});

export default memo(function ComboGauge({ count }: ComboGaugeProps) {
  const isMax = count >= MAX_COMBO;
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isMax) {
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.3, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [isMax, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.dotsRow}>
        {Array.from({ length: MAX_COMBO }).map((_, i) => (
          <ComboDot key={i} filled={i < count} />
        ))}
      </View>
      <View style={styles.textRow}>
        {count > 0 && (
          <Text style={[styles.multiplier, isMax && styles.maxMultiplier]}>
            x{count}
          </Text>
        )}
        {isMax && (
          <Animated.Text style={[styles.maxText, glowStyle]}>
            MAX COMBO!
          </Animated.Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  dotEmpty: {
    borderColor: Colors.TEXT_MUTED,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: Colors.ACCENT,
    backgroundColor: Colors.ACCENT,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  multiplier: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.ACCENT,
  },
  maxMultiplier: {
    color: Colors.GOLD,
  },
  maxText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.GOLD,
  },
});
