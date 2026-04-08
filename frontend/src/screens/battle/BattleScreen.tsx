import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

export default function BattleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>전투 준비</Text>
      <Text style={styles.description}>집중 세션을 시작하세요</Text>
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
