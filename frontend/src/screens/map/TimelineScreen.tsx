import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

export default function TimelineScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>오늘의 모험 지도</Text>
      <Text style={styles.description}>타임라인이 여기에 표시됩니다</Text>
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
