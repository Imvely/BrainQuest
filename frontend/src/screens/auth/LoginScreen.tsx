import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { useAuthStore } from '../../stores/useAuthStore';
import { login } from '../../api/auth';
import { setTokens, setIsNewUser as persistIsNewUser, setHasCharacter as persistHasCharacter } from '../../utils/storage';
import { AuthProvider } from '../../types/user';

export default function LoginScreen() {
  const { setUser, setHasCharacter, setIsNewUser } = useAuthStore();
  const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);

  const handleLogin = async (provider: AuthProvider) => {
    if (loadingProvider) return;
    setLoadingProvider(provider);

    try {
      // TODO: 실제 소셜 로그인 SDK 연동 (Kakao/Apple/Google)
      // 지금은 임시 accessToken 문자열로 서버 호출 (dev only)
      const response = await login({
        provider,
        accessToken: `${provider.toLowerCase()}_temp_access_token`,
      });

      const { accessToken, refreshToken, userId, nickname, isNewUser } = response.data;

      setTokens(accessToken, refreshToken);
      persistIsNewUser(isNewUser);

      // 백엔드 로그인 응답에는 hasCharacter가 포함되지 않음.
      // 캐릭터 존재 여부는 기본값 false로 두고, 이후 GET /character 호출 시 갱신한다.
      persistHasCharacter(false);

      setIsNewUser(isNewUser);
      setHasCharacter(false);
      // User 엔티티 최소 정보: id + nickname만 사용 (나머지는 optional)
      setUser({ id: userId, nickname });
    } catch {
      Alert.alert('로그인 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.topSpacer} />

      <View style={styles.titleArea}>
        <Text style={styles.logo}>BrainQuest</Text>
        <Text style={styles.subtitle}>ADHD를 위한 올인원 라이프 RPG</Text>
      </View>

      <View style={styles.buttonArea}>
        <TouchableOpacity
          style={[styles.loginButton, styles.kakaoButton]}
          onPress={() => handleLogin('KAKAO')}
          activeOpacity={0.7}
          disabled={!!loadingProvider}
        >
          {loadingProvider === 'KAKAO' ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.kakaoText}>카카오로 시작하기</Text>
          )}
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.loginButton, styles.appleButton]}
            onPress={() => handleLogin('APPLE')}
            activeOpacity={0.7}
            disabled={!!loadingProvider}
          >
            {loadingProvider === 'APPLE' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.appleText}> Apple로 시작하기</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.loginButton, styles.googleButton]}
          onPress={() => handleLogin('GOOGLE')}
          activeOpacity={0.7}
          disabled={!!loadingProvider}
        >
          {loadingProvider === 'GOOGLE' ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.googleText}>Google로 시작하기</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
    paddingHorizontal: 24,
  },
  topSpacer: {
    flex: 2,
  },
  titleArea: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontFamily: Fonts.BOLD,
    fontSize: 36,
    color: Colors.PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
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
  kakaoText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: '#000000',
  },
  appleButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#333333',
  },
  appleText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: '#FFFFFF',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  googleText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: '#000000',
  },
  bottomSpacer: {
    flex: 1,
  },
});
