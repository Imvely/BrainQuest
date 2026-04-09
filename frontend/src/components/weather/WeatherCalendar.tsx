import React, { memo, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { getDaysInMonth, getDay, format } from 'date-fns';
import { EmotionCalendarDay } from '../../types/emotion';
import { WEATHER_CONFIG } from '../../constants/weather';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

interface WeatherCalendarProps {
  yearMonth: string;
  data: EmotionCalendarDay[];
  onDateSelect: (date: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Cell = { day: number | null; date: string | null };

export default memo(function WeatherCalendar({ yearMonth, data, onDateSelect }: WeatherCalendarProps) {
  const dataMap = useMemo(() => {
    const map = new Map<string, EmotionCalendarDay>();
    data.forEach((d) => map.set(d.date, d));
    return map;
  }, [data]);

  const rows = useMemo(() => {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const startDow = getDay(firstDay);
    const totalDays = getDaysInMonth(firstDay);

    const cells: Cell[] = [];

    for (let i = 0; i < startDow; i++) {
      cells.push({ day: null, date: null });
    }
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ day: d, date: `${yearMonth}-${String(d).padStart(2, '0')}` });
    }

    const result: Cell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const row = cells.slice(i, i + 7);
      while (row.length < 7) row.push({ day: null, date: null });
      result.push(row);
    }
    return result;
  }, [yearMonth]);

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <View style={styles.container}>
      {/* Weekday headers */}
      <View style={styles.headerRow}>
        {WEEKDAYS.map((day, idx) => (
          <View key={idx} style={styles.headerCell}>
            <Text style={[
              styles.headerText,
              idx === 0 && styles.sundayText,
              idx === 6 && styles.saturdayText,
            ]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* Day rows */}
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.gridRow}>
          {row.map((cell, colIdx) => {
            if (cell.day === null) {
              return <View key={colIdx} style={styles.cell} />;
            }

            const dayData = dataMap.get(cell.date!);
            const isCurrentDay = cell.date === today;
            const config = dayData ? WEATHER_CONFIG[dayData.weatherType] : null;

            return (
              <TouchableOpacity
                key={colIdx}
                style={[
                  styles.cell,
                  isCurrentDay && styles.todayCell,
                  config && { backgroundColor: config.bgColor },
                ]}
                onPress={() => dayData && onDateSelect(cell.date!)}
                activeOpacity={dayData ? 0.7 : 1}
                disabled={!dayData}
              >
                <Text style={[styles.dayNumber, isCurrentDay && styles.todayNumber]}>
                  {cell.day}
                </Text>
                <Text style={styles.cellEmoji}>
                  {config ? config.emoji : '—'}
                </Text>
                {dayData && dayData.count > 1 && (
                  <Text style={styles.countBadge}>{dayData.count}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },
  sundayText: {
    color: '#E17055',
  },
  saturdayText: {
    color: Colors.SECONDARY,
  },
  gridRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
    paddingVertical: 4,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
  },
  dayNumber: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  todayNumber: {
    color: Colors.PRIMARY,
    fontFamily: Fonts.BOLD,
  },
  cellEmoji: {
    fontSize: 18,
    marginTop: 1,
  },
  countBadge: {
    fontFamily: Fonts.BOLD,
    fontSize: 8,
    color: Colors.TEXT_MUTED,
    position: 'absolute',
    bottom: 2,
    right: 4,
  },
});
