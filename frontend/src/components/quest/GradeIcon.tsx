import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { QuestGrade } from '../../constants/game';

const GRADE_COLORS: Record<QuestGrade, string> = {
  E: Colors.GRADE_E,
  D: Colors.GRADE_D,
  C: Colors.GRADE_C,
  B: Colors.GRADE_B,
  A: Colors.GRADE_A,
};

interface GradeIconProps {
  grade: QuestGrade;
  size?: number;
  style?: ViewStyle;
}

export default memo(function GradeIcon({ grade, size = 36, style }: GradeIconProps) {
  const color = GRADE_COLORS[grade];
  const sparkle = useSharedValue(1);

  useEffect(() => {
    if (grade === 'A') {
      sparkle.value = withRepeat(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
  }, [grade, sparkle]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkle.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderColor: grade === 'A' ? Colors.ACCENT : 'transparent',
          borderWidth: grade === 'A' ? 2 : 0,
        },
        animatedStyle,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { fontSize: size * 0.44, lineHeight: size * 0.56 },
        ]}
      >
        {grade}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  label: {
    fontFamily: Fonts.BOLD,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
  },
});
