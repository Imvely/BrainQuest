import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const labelStyles = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    disabled && styles.labelDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={Colors.TEXT_PRIMARY} size="small" />
      ) : (
        <Text style={labelStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: Colors.PRIMARY,
  },
  secondary: {
    backgroundColor: Colors.SECONDARY,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  size_sm: {
    height: 44,
    paddingHorizontal: 16,
  },
  size_md: {
    height: 48,
    paddingHorizontal: 24,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: 32,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: Fonts.BOLD,
  },
  label_primary: {
    color: Colors.TEXT_PRIMARY,
  },
  label_secondary: {
    color: Colors.TEXT_PRIMARY,
  },
  label_outline: {
    color: Colors.PRIMARY,
  },
  label_ghost: {
    color: Colors.TEXT_SECONDARY,
  },
  labelSize_sm: {
    fontSize: FontSize.SM,
  },
  labelSize_md: {
    fontSize: FontSize.MD,
  },
  labelSize_lg: {
    fontSize: FontSize.LG,
  },
  labelDisabled: {
    color: Colors.TEXT_MUTED,
  },
});
