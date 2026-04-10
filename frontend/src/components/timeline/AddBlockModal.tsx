import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { BlockCategory, TimeBlockCreateRequest } from '../../types/timeline';
import { Quest } from '../../types/quest';
import Button from '../common/Button';

const CATEGORIES: { key: BlockCategory; label: string; color: string }[] = [
  { key: 'WORK', label: '업무', color: Colors.CATEGORY_WORK },
  { key: 'HOME', label: '생활', color: Colors.CATEGORY_HOME },
  { key: 'HEALTH', label: '건강', color: Colors.CATEGORY_HEALTH },
  { key: 'SOCIAL', label: '소셜', color: Colors.CATEGORY_SOCIAL },
  { key: 'REST', label: '휴식', color: Colors.CATEGORY_REST },
  { key: 'CUSTOM', label: '기타', color: Colors.CATEGORY_CUSTOM },
];

interface AddBlockModalProps {
  visible: boolean;
  initialStartTime: string;
  initialEndTime: string;
  blockDate: string;
  quests: Quest[];
  loading: boolean;
  onSubmit: (req: TimeBlockCreateRequest) => void;
  onClose: () => void;
}

export default function AddBlockModal({
  visible,
  initialStartTime,
  initialEndTime,
  blockDate,
  quests,
  loading,
  onSubmit,
  onClose,
}: AddBlockModalProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['65%'], []);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<BlockCategory>('WORK');
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [selectedQuestId, setSelectedQuestId] = useState<number | undefined>(undefined);

  // Reset state when modal opens with new times
  React.useEffect(() => {
    if (visible) {
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setTitle('');
      setCategory('WORK');
      setSelectedQuestId(undefined);
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible, initialStartTime, initialEndTime]);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;
    onSubmit({
      blockDate,
      startTime,
      endTime,
      category,
      title: title.trim(),
      questId: selectedQuestId,
    });
  }, [blockDate, startTime, endTime, category, title, selectedQuestId, onSubmit]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.6} />
    ),
    [],
  );

  const activeQuests = quests.filter((q) => q.status === 'ACTIVE' || q.status === 'IN_PROGRESS');

  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      android_keyboardInputMode="adjustResize"
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.sheetTitle}>타임블록 추가</Text>

        {/* Title input */}
        <Text style={styles.label}>제목</Text>
        <BottomSheetTextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="무엇을 할 예정인가요?"
          placeholderTextColor={Colors.TEXT_MUTED}
          maxLength={200}
        />

        {/* Category chips */}
        <Text style={styles.label}>카테고리</Text>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.chip,
                category === c.key && { backgroundColor: c.color, borderColor: c.color },
              ]}
              onPress={() => setCategory(c.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  category === c.key && styles.chipTextActive,
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time row */}
        <Text style={styles.label}>시간</Text>
        <View style={styles.timeRow}>
          <BottomSheetTextInput
            style={[styles.input, styles.timeInput]}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="09:00"
            placeholderTextColor={Colors.TEXT_MUTED}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            maxLength={5}
          />
          <Text style={styles.timeSep}>~</Text>
          <BottomSheetTextInput
            style={[styles.input, styles.timeInput]}
            value={endTime}
            onChangeText={setEndTime}
            placeholder="10:00"
            placeholderTextColor={Colors.TEXT_MUTED}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            maxLength={5}
          />
        </View>

        {/* Quest link (optional) */}
        {activeQuests.length > 0 && (
          <>
            <Text style={styles.label}>퀘스트 연결 (선택)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.questRow}>
              <TouchableOpacity
                style={[styles.questChip, !selectedQuestId && styles.questChipActive]}
                onPress={() => setSelectedQuestId(undefined)}
              >
                <Text style={[styles.questChipText, !selectedQuestId && styles.questChipTextActive]}>
                  없음
                </Text>
              </TouchableOpacity>
              {activeQuests.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  style={[styles.questChip, selectedQuestId === q.id && styles.questChipActive]}
                  onPress={() => setSelectedQuestId(q.id)}
                >
                  <Text
                    style={[
                      styles.questChipText,
                      selectedQuestId === q.id && styles.questChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    [{q.grade}] {q.questTitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Submit */}
        <Button
          title="블록 추가"
          onPress={handleSubmit}
          disabled={!title.trim() || loading}
          loading={loading}
          style={styles.submitBtn}
        />
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.BG_SECONDARY,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    backgroundColor: Colors.TEXT_MUTED,
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 16,
  },
  label: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
  },
  chipText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  chipTextActive: {
    color: Colors.TEXT_PRIMARY,
    fontFamily: Fonts.BOLD,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    flex: 1,
    textAlign: 'center',
  },
  timeSep: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
  },
  questRow: {
    maxHeight: 40,
  },
  questChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    backgroundColor: Colors.BG_CARD,
    marginRight: 8,
  },
  questChipActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  questChipText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
    maxWidth: 160,
  },
  questChipTextActive: {
    color: Colors.TEXT_PRIMARY,
  },
  submitBtn: {
    marginTop: 20,
  },
});
