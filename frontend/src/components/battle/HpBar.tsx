import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

interface HpBarProps {
  current: number;
  max: number;
  color?: string;
  height?: number;
  label?: string;
  showText?: boolean;
}

export default memo(function HpBar({
  current,
  max,
  color = Colors.ERROR,
  height = 10,
  label,
  showText = true,
}: HpBarProps) {
  const progress = useSharedValue(max > 0 ? current / max : 0);

  useEffect(() => {
    progress.value = withTiming(max > 0 ? Math.max(0, current / max) : 0, {
      duration: 400,
    });
  }, [current, max, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
    backgroundColor: color,
    height,
    borderRadius: height / 2,
  }));

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.track, { height, borderRadius: height / 2 }]}>
        <Animated.View style={fillStyle} />
      </View>
      {showText && (
        <Text style={styles.text}>
          {Math.max(0, current)}/{max}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 2,
  },
  track: {
    backgroundColor: Colors.BG_INPUT,
    overflow: 'hidden',
  },
  text: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
    textAlign: 'right',
  },
});
