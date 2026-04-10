import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { WeeklySummary } from '../../types/emotion';
import { WEATHER_CONFIG, WEATHER_TYPES } from '../../constants/weather';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import Card from '../common/Card';

interface WeeklySummaryCardProps {
  summary: WeeklySummary | null;
  onShare?: () => void;
}

export default memo(function WeeklySummaryCard({ summary, onShare }: WeeklySummaryCardProps) {
  if (!summary || summary.totalRecords === 0) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>이번 주 감정 날씨</Text>
        <Text style={styles.emptyText}>이번 주 기록이 없어요</Text>
      </Card>
    );
  }

  // 백엔드 WeeklySummaryResponse: 필드명은 `distribution` (not `weatherDistribution`).
  const distribution = summary.distribution ?? {};
  const maxCount = Math.max(...Object.values(distribution), 1);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>이번 주 감정 날씨</Text>
      <Text style={styles.period}>{summary.weekStart} ~ {summary.weekEnd}</Text>

      {/* Bar chart */}
      <View style={styles.chart}>
        {WEATHER_TYPES.filter((type) => (distribution[type] || 0) > 0).map((type) => {
          const count = distribution[type] || 0;
          const config = WEATHER_CONFIG[type];
          const widthPct = Math.max((count / maxCount) * 100, 8);
          const diff = summary.comparedToLastWeek?.[type];

          return (
            <View key={type} style={styles.barRow}>
              <Text style={styles.barEmoji}>{config.emoji}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, { width: `${widthPct}%`, backgroundColor: config.color }]}
                />
              </View>
              <Text style={styles.barCount}>{count}일</Text>
              {diff !== undefined && diff !== 0 && (
                <Text style={[
                  styles.barDiff,
                  { color: diff > 0 ? Colors.SECONDARY : Colors.WARNING },
                ]}>
                  {diff > 0 ? '+' : ''}{diff}
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Top tags — 백엔드 WeeklySummaryResponse에 topTags 필드 없음 (프론트 로컬 계산 전까지 숨김) */}

      {onShare && (
        <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.7}>
          <Text style={styles.shareBtnText}>공유하기</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  title: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  period: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    marginBottom: 16,
  },
  chart: {
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barEmoji: {
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 8,
    opacity: 0.8,
  },
  barCount: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
    width: 28,
    textAlign: 'right',
  },
  barDiff: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XS,
    width: 24,
    textAlign: 'right',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  tagBadge: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_SECONDARY,
  },
  emptyText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_MUTED,
    textAlign: 'center',
    paddingVertical: 20,
  },
  shareBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  shareBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.PRIMARY,
  },
});
