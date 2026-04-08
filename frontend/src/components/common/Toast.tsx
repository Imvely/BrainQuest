import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  type?: 'exp' | 'gold' | 'info' | 'success';
}

const TYPE_COLORS = {
  exp: Colors.PRIMARY,
  gold: Colors.RARITY_LEGENDARY,
  info: Colors.SECONDARY,
  success: Colors.SUCCESS,
} as const;

export default function Toast({ message, visible, onHide, duration = 2000, type = 'info' }: ToastProps) {
  const translateY = useSharedValue(-80);
  const opacity = useSharedValue(0);
  const onHideRef = useRef(onHide);
  onHideRef.current = onHide;

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
      translateY.value = withDelay(duration, withTiming(-80, { duration: 300 }));
      opacity.value = withDelay(duration, withTiming(0, { duration: 300 }, () => {
        runOnJS(() => onHideRef.current())();
      }));
    }
  }, [visible, duration, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { borderLeftColor: TYPE_COLORS[type] }, animatedStyle]}>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
  },
});
