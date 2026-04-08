import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

export default function LoginScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <SafeAreaView style={styles.titleArea}>
        <Text style={styles.title}>BrainQuest</Text>
        <Text style={styles.subtitle}>ADHD를 위한 올인원 라이프 RPG</Text>
      </SafeAreaView>

      <SafeAreaView style={styles.buttonArea}>
        <TouchableOpacity style={[styles.loginButton, styles.kakaoButton]} activeOpacity={0.7}>
          <Text style={styles.loginButtonText}>카카오로 시작하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.loginButton, styles.googleButton]} activeOpacity={0.7}>
          <Text style={styles.loginButtonText}>Google로 시작하기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.loginButton, styles.appleButton]} activeOpacity={0.7}>
          <Text style={styles.appleButtonText}>Apple로 시작하기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.TITLE,
    color: Colors.PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
  },
  buttonArea: {
    gap: 12,
  },
  loginButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kakaoButton: {
    backgroundColor: '#FEE500',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  loginButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: '#000000',
  },
  appleButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
});
