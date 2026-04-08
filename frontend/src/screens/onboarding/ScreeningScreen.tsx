import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

export default function ScreeningScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ASRS 스크리닝</Text>
      <Text style={styles.description}>
        간단한 자가 진단으로 시작해볼까요?
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 12,
  },
  description: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
  },
});
