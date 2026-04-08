import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default memo(function Header({ title, onBack, rightElement }: HeaderProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {rightElement ?? <View style={styles.placeholder} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: Colors.BG_PRIMARY,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
  },
  title: {
    flex: 1,
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
});
