import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

export default function EmotionRecordScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>감정 날씨 기록</Text>
      <Text style={styles.description}>지금 기분은 어떤 날씨인가요?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 8,
  },
  description: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
  },
});
