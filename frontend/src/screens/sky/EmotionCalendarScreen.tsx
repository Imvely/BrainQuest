import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { format, addMonths, subMonths } from 'date-fns';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { WEATHER_CONFIG } from '../../constants/weather';
import { SkyStackParamList } from '../../navigation/MainTab';
import {
  useEmotionCalendar,
  useWeeklySummary,
  useEmotionsByDate,
} from '../../hooks/useEmotions';
import WeatherCalendar from '../../components/weather/WeatherCalendar';
import WeeklySummaryCard from '../../components/weather/WeeklySummaryCard';

type Navigation = StackNavigationProp<SkyStackParamList, 'EmotionCalendar'>;

export default function EmotionCalendarScreen() {
  const navigation = useNavigation<Navigation>();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const yearMonth = format(currentDate, 'yyyy-MM');
  const displayYear = currentDate.getFullYear();
  const displayMonth = currentDate.getMonth() + 1;

  const { data: calendarData } = useEmotionCalendar(yearMonth);
  const { data: weeklySummary } = useWeeklySummary();
  const { data: dateRecords } = useEmotionsByDate(selectedDate);

  const calendarRef = useRef<ViewShot>(null);

  const handlePrevMonth = useCallback(() => {
    setCurrentDate((prev) => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate((prev) => addMonths(prev, 1));
  }, []);

  const handleCalendarShare = useCallback(async () => {
    try {
      const uri = await captureRef(calendarRef, { format: 'png', quality: 0.9 });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri);
      }
    } catch {
      Alert.alert('공유 실패', '이미지 캡처에 실패했습니다.');
    }
  }, []);

  const formatRecordTime = (iso: string) => {
    try {
      return format(new Date(iso), 'HH:mm');
    } catch {
      return '';
    }
  };

  const formatSelectedDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Month navigation */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} activeOpacity={0.7}>
            <Text style={styles.navArrow}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{displayYear}년 {displayMonth}월</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} activeOpacity={0.7}>
            <Text style={styles.navArrow}>{'>'}</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar (wrapped in ViewShot for share capture) */}
        <ViewShot ref={calendarRef} options={{ format: 'png', quality: 0.9 }}>
          <View style={styles.calendarWrap}>
            <WeatherCalendar
              yearMonth={yearMonth}
              data={calendarData ?? []}
              onDateSelect={setSelectedDate}
            />
            <Text style={styles.watermark}>BrainQuest</Text>
          </View>
        </ViewShot>

        {/* Monthly share link */}
        <TouchableOpacity
          style={styles.monthShareBtn}
          onPress={handleCalendarShare}
          activeOpacity={0.7}
        >
          <Text style={styles.monthShareText}>이번 달 감정 날씨 공유</Text>
        </TouchableOpacity>

        {/* Weekly summary card */}
        <WeeklySummaryCard summary={weeklySummary ?? null} onShare={handleCalendarShare} />
      </ScrollView>

      {/* FAB: navigate to EmotionRecord */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('EmotionRecord')}
        activeOpacity={0.7}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Date detail bottom sheet */}
      <Modal
        visible={!!selectedDate}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDate(null)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetDismiss}
            onPress={() => setSelectedDate(null)}
            activeOpacity={1}
          />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {selectedDate ? formatSelectedDate(selectedDate) : ''}
            </Text>

            <ScrollView style={styles.sheetScroll}>
              {dateRecords && dateRecords.length > 0 ? (
                dateRecords.map((record) => {
                  const config = WEATHER_CONFIG[record.weatherType];
                  return (
                    <View key={record.id} style={styles.recordRow}>
                      <Text style={styles.recordTime}>
                        {formatRecordTime(record.recordedAt)}
                      </Text>
                      <Text style={styles.recordEmoji}>{config.emoji}</Text>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordLabel}>
                          {config.label} · 강도 {record.intensity}
                        </Text>
                        {record.tags && record.tags.length > 0 && (
                          <Text style={styles.recordTags}>
                            {record.tags.map((t) => `#${t}`).join(' ')}
                          </Text>
                        )}
                        {record.memo && (
                          <Text style={styles.recordMemo} numberOfLines={2}>
                            {record.memo}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.sheetEmpty}>기록을 불러오는 중...</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100,
  },

  // Month navigation
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 20,
  },
  navBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navArrow: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
  },
  monthTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },

  // Calendar
  calendarWrap: {
    backgroundColor: Colors.BG_PRIMARY,
    paddingBottom: 8,
  },
  watermark: {
    fontFamily: Fonts.LIGHT,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.5,
  },

  // Monthly share
  monthShareBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  monthShareText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.PRIMARY,
    textDecorationLine: 'underline',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontFamily: Fonts.BOLD,
    fontSize: 28,
    color: Colors.TEXT_PRIMARY,
    lineHeight: 30,
  },

  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetDismiss: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    backgroundColor: Colors.BG_SECONDARY,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.BORDER,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 16,
  },
  sheetScroll: {
    maxHeight: 300,
  },
  sheetEmpty: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Record row
  recordRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.DIVIDER,
    gap: 10,
  },
  recordTime: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    width: 42,
    marginTop: 2,
  },
  recordEmoji: {
    fontSize: 24,
  },
  recordInfo: {
    flex: 1,
  },
  recordLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
  },
  recordTags: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.PRIMARY,
    marginTop: 2,
  },
  recordMemo: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
});
