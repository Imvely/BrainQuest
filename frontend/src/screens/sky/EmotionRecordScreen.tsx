import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import {
  WeatherType,
  WEATHER_CONFIG,
  PRESET_TAGS,
  MAX_DAILY_RECORDS,
} from '../../constants/weather';
import { useCreateEmotion } from '../../hooks/useEmotions';
import { useEmotionStore } from '../../stores/useEmotionStore';
import Header from '../../components/common/Header';
import Toast from '../../components/common/Toast';
import WeatherPicker from '../../components/weather/WeatherPicker';

export default function EmotionRecordScreen() {
  const navigation = useNavigation();
  const createEmotion = useCreateEmotion();
  const todayCount = useEmotionStore((s) => s.todayCount);

  const [selectedWeather, setSelectedWeather] = useState<WeatherType | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [memo, setMemo] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [showMemo, setShowMemo] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const goBackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (goBackTimer.current) clearTimeout(goBackTimer.current); };
  }, []);

  const isMaxReached = todayCount >= MAX_DAILY_RECORDS;
  const weatherConfig = selectedWeather ? WEATHER_CONFIG[selectedWeather] : null;

  // Intensity slide-up animation
  const intensityOpacity = useSharedValue(0);
  const intensityY = useSharedValue(20);
  const intensityStyle = useAnimatedStyle(() => ({
    opacity: intensityOpacity.value,
    transform: [{ translateY: intensityY.value }],
  }));

  useEffect(() => {
    if (selectedWeather) {
      intensityOpacity.value = withTiming(1, { duration: 300 });
      intensityY.value = withSpring(0);
    }
  }, [selectedWeather, intensityOpacity, intensityY]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 5
          ? [...prev, tag]
          : prev,
    );
  }, []);

  const handleAddCustomTag = useCallback(() => {
    const trimmed = customTag.trim();
    if (trimmed && selectedTags.length < 5 && !selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTag('');
    }
  }, [customTag, selectedTags]);

  const handleSubmit = useCallback(() => {
    if (!selectedWeather || isMaxReached) return;

    createEmotion.mutate(
      {
        weatherType: selectedWeather,
        intensity,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        memo: memo.trim() || undefined,
        recordedAt: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setToastVisible(true);
          goBackTimer.current = setTimeout(() => navigation.goBack(), 1500);
        },
        onError: () => {
          Alert.alert('기록 실패', '감정 기록에 실패했습니다. 다시 시도해주세요.');
        },
      },
    );
  }, [selectedWeather, intensity, selectedTags, memo, isMaxReached, createEmotion, navigation]);

  const emojiSize = 40 + intensity * 8;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Dynamic gradient background */}
      {weatherConfig && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: weatherConfig.bgColor }]} />
      )}

      <Toast
        message={`+5 DEF EXP 획득!`}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
        type="exp"
      />

      <Header
        title="감정 기록"
        onBack={() => navigation.goBack()}
        rightElement={
          <Text style={styles.counter}>{todayCount}/{MAX_DAILY_RECORDS}</Text>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text style={styles.title}>지금 당신의 하늘은?</Text>

        {/* Weather picker */}
        <WeatherPicker selected={selectedWeather} onSelect={setSelectedWeather} />

        {/* Intensity section */}
        {selectedWeather && (
          <Animated.View style={[styles.intensitySection, intensityStyle]}>
            <Text style={styles.sectionLabel}>감정 강도</Text>
            <Text style={[styles.emojiPreview, { fontSize: emojiSize }]}>
              {weatherConfig!.emoji}
            </Text>
            <View style={styles.intensityRow}>
              {[1, 2, 3, 4, 5].map((level) => {
                const dotSize = 20 + level * 6;
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.intensityDot,
                      {
                        width: dotSize,
                        height: dotSize,
                        borderRadius: dotSize / 2,
                        backgroundColor:
                          intensity >= level ? weatherConfig!.color : Colors.BG_INPUT,
                      },
                    ]}
                    onPress={() => {
                      setIntensity(level);
                      Haptics.selectionAsync();
                    }}
                    activeOpacity={0.7}
                  />
                );
              })}
            </View>
            <Text style={styles.intensityLabel}>{intensity} / 5</Text>
          </Animated.View>
        )}

        {/* Tags section */}
        {selectedWeather && (
          <Animated.View entering={FadeInDown.delay(150).duration(300)}>
            <TouchableOpacity
              style={styles.sectionToggle}
              onPress={() => setShowTags(!showTags)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLabel}>태그</Text>
              <Text style={styles.toggleArrow}>{showTags ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showTags && (
              <View style={styles.tagsContainer}>
                <View style={styles.tagChips}>
                  {PRESET_TAGS.map((tag) => {
                    const isActive = selectedTags.includes(tag);
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[styles.tagChip, isActive && styles.tagChipActive]}
                        onPress={() => handleTagToggle(tag)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[styles.tagChipText, isActive && styles.tagChipTextActive]}
                        >
                          #{tag}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.customTagRow}>
                  <TextInput
                    style={styles.customTagInput}
                    placeholder="커스텀 태그"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    value={customTag}
                    onChangeText={setCustomTag}
                    onSubmitEditing={handleAddCustomTag}
                    maxLength={20}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.customTagBtn}
                    onPress={handleAddCustomTag}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customTagBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {/* Memo section */}
        {selectedWeather && (
          <Animated.View entering={FadeInDown.delay(250).duration(300)}>
            <TouchableOpacity
              style={styles.sectionToggle}
              onPress={() => setShowMemo(!showMemo)}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionLabel}>메모</Text>
              <Text style={styles.toggleArrow}>{showMemo ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showMemo && (
              <>
                <TextInput
                  style={styles.memoInput}
                  placeholder="오늘의 감정에 대해 적어보세요..."
                  placeholderTextColor={Colors.TEXT_MUTED}
                  value={memo}
                  onChangeText={setMemo}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{memo.length}/200</Text>
              </>
            )}
          </Animated.View>
        )}

        {/* Submit button */}
        {selectedWeather && (
          <Animated.View entering={FadeInDown.delay(350).duration(300)}>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: isMaxReached
                    ? Colors.BG_INPUT
                    : weatherConfig!.color,
                },
              ]}
              onPress={handleSubmit}
              disabled={isMaxReached || createEmotion.isPending}
              activeOpacity={0.7}
            >
              <Text style={styles.submitBtnText}>
                {createEmotion.isPending
                  ? '기록 중...'
                  : isMaxReached
                    ? '오늘 기록 완료'
                    : '기록하기'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  counter: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    width: 40,
    textAlign: 'right',
  },
  title: {
    fontFamily: Fonts.BOLD,
    fontSize: 20,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },

  // Intensity
  intensitySection: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
  intensityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  intensityDot: {
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  intensityLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
  },

  // Section toggle
  sectionToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  sectionLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
  },
  toggleArrow: {
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },

  // Tags
  tagsContainer: {
    paddingHorizontal: 20,
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  tagChipActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  tagChipText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  tagChipTextActive: {
    color: Colors.TEXT_PRIMARY,
    fontFamily: Fonts.BOLD,
  },
  customTagRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  customTagBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customTagBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },

  // Memo
  memoInput: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    minHeight: 80,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  charCount: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
    textAlign: 'right',
    paddingHorizontal: 20,
    marginTop: 4,
  },

  // Submit
  submitBtn: {
    marginHorizontal: 20,
    marginTop: 28,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
  emojiPreview: {
    textAlign: 'center',
  },
});
