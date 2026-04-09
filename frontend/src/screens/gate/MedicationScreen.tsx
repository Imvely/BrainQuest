import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import {
  getMedications,
  createMedication,
  createMedLog,
  Medication,
} from '../../api/gate';

const ADHD_PRESETS = [
  { name: '콘서타 (Concerta)', dosages: ['18mg', '27mg', '36mg', '54mg'] },
  { name: '메디키넷 (Medikinet)', dosages: ['10mg', '20mg', '30mg', '40mg'] },
  { name: '환인메틸페니데이트', dosages: ['10mg', '18mg', '27mg', '36mg'] },
  { name: '스트라테라 (Strattera)', dosages: ['10mg', '18mg', '25mg', '40mg', '60mg', '80mg'] },
  { name: '인튜니브 (Intuniv)', dosages: ['1mg', '2mg', '3mg', '4mg'] },
  { name: '메타데이트 (Metadate)', dosages: ['10mg', '20mg', '30mg'] },
  { name: '직접 입력', dosages: [] },
];

export default function MedicationScreen() {
  const navigation = useNavigation();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loggingId, setLoggingId] = useState<number | null>(null);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [selectedDosage, setSelectedDosage] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [saving, setSaving] = useState(false);

  const fetchMedications = useCallback(async () => {
    try {
      const response = await getMedications();
      setMedications(response.data);
    } catch {
      // silently fail, show empty
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  const handleTakeMed = useCallback(async (med: Medication) => {
    setLoggingId(med.id);
    try {
      await createMedLog({ medicationId: med.id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('복용 기록 완료', `${med.medName} ${med.dosage} 복용 기록!`);
    } catch {
      Alert.alert('기록 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setLoggingId(null);
    }
  }, []);

  const handleAddMed = async () => {
    if (selectedPreset === null) return;
    const preset = ADHD_PRESETS[selectedPreset];
    const medName = preset.name === '직접 입력' ? customName.trim() : preset.name;
    if (!medName || !selectedDosage) {
      Alert.alert('입력 확인', '약물명과 용량을 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const response = await createMedication({
        medName,
        dosage: selectedDosage,
        scheduleTime,
      });
      setMedications((prev) => [...prev, response.data]);
      resetAddForm();
    } catch {
      Alert.alert('등록 실패', '약물 등록 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setShowAdd(false);
    setSelectedPreset(null);
    setCustomName('');
    setSelectedDosage('');
    setScheduleTime('08:00');
  };

  const renderMedCard = useCallback(({ item }: { item: Medication }) => (
    <View style={styles.medCard}>
      <View style={styles.medInfo}>
        <Text style={styles.medName}>{item.medName}</Text>
        <Text style={styles.medDosage}>{item.dosage} | {item.scheduleTime}</Text>
      </View>
      <TouchableOpacity
        style={styles.takeButton}
        onPress={() => handleTakeMed(item)}
        disabled={loggingId === item.id}
        activeOpacity={0.7}
      >
        {loggingId === item.id ? (
          <ActivityIndicator color={Colors.TEXT_PRIMARY} size="small" />
        ) : (
          <Text style={styles.takeButtonText}>복용</Text>
        )}
      </TouchableOpacity>
    </View>
  ), [loggingId, handleTakeMed]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>약물 관리</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Medication List */}
      {loadingList ? (
        <View style={styles.loadingArea}>
          <ActivityIndicator color={Colors.PRIMARY} />
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.emptyArea}>
          <Text style={styles.emptyEmoji}>{'💊'}</Text>
          <Text style={styles.emptyText}>등록된 약물이 없어요</Text>
          <Text style={styles.emptySubtext}>아래 + 버튼으로 약물을 추가하세요</Text>
        </View>
      ) : (
        <FlatList
          data={medications}
          renderItem={renderMedCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          maxToRenderPerBatch={10}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <TouchableOpacity style={styles.modalOverlay} onPress={resetAddForm} activeOpacity={1}>
          <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>약물 추가</Text>

            {/* Preset Selection */}
            <Text style={styles.fieldLabel}>약물 선택</Text>
            <View style={styles.presetGrid}>
              {ADHD_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.presetChip, selectedPreset === idx && styles.presetChipActive]}
                  onPress={() => {
                    setSelectedPreset(idx);
                    setSelectedDosage('');
                    setCustomName('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.presetChipText,
                    selectedPreset === idx && styles.presetChipTextActive,
                  ]}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Name */}
            {selectedPreset !== null && ADHD_PRESETS[selectedPreset].name === '직접 입력' && (
              <TextInput
                style={styles.input}
                value={customName}
                onChangeText={setCustomName}
                placeholder="약물명 입력"
                placeholderTextColor={Colors.TEXT_MUTED}
              />
            )}

            {/* Dosage Selection */}
            {selectedPreset !== null && ADHD_PRESETS[selectedPreset].dosages.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>용량</Text>
                <View style={styles.dosageRow}>
                  {ADHD_PRESETS[selectedPreset].dosages.map((dose) => (
                    <TouchableOpacity
                      key={dose}
                      style={[styles.dosageChip, selectedDosage === dose && styles.dosageChipActive]}
                      onPress={() => setSelectedDosage(dose)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.dosageChipText,
                        selectedDosage === dose && styles.dosageChipTextActive,
                      ]}>
                        {dose}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Custom Dosage for direct input */}
            {selectedPreset !== null && ADHD_PRESETS[selectedPreset].dosages.length === 0 && (
              <TextInput
                style={styles.input}
                value={selectedDosage}
                onChangeText={setSelectedDosage}
                placeholder="용량 입력 (예: 27mg)"
                placeholderTextColor={Colors.TEXT_MUTED}
              />
            )}

            {/* Schedule Time */}
            <Text style={styles.fieldLabel}>복용 시간</Text>
            <View style={styles.timeRow}>
              {['07:00', '08:00', '09:00', '12:00', '18:00'].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeChip, scheduleTime === time && styles.timeChipActive]}
                  onPress={() => setScheduleTime(time)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.timeChipText,
                    scheduleTime === time && styles.timeChipTextActive,
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, (!selectedDosage || selectedPreset === null) && { opacity: 0.4 }]}
              onPress={handleAddMed}
              disabled={saving || !selectedDosage || selectedPreset === null}
              activeOpacity={0.7}
            >
              {saving ? (
                <ActivityIndicator color={Colors.TEXT_PRIMARY} />
              ) : (
                <Text style={styles.saveButtonText}>약물 등록</Text>
              )}
            </TouchableOpacity>
          </View>
          </ScrollView>
        </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
  },
  headerPlaceholder: {
    width: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
  },
  headerTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },

  // List
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 100,
  },
  medCard: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  medDosage: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  takeButton: {
    backgroundColor: Colors.SUCCESS,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    minWidth: 64,
    alignItems: 'center',
  },
  takeButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
  },

  // Loading / Empty
  loadingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_MUTED,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
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
  fabText: {
    fontFamily: Fonts.BOLD,
    fontSize: 28,
    color: Colors.TEXT_PRIMARY,
    marginTop: -2,
  },

  // Modal
  modalKeyboard: {
    flex: 1,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.OVERLAY,
  },
  modalSheet: {
    backgroundColor: Colors.BG_SECONDARY,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.BORDER,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 10,
    marginTop: 12,
  },

  // Preset grid
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  presetChipActive: {
    backgroundColor: Colors.PRIMARY + '33',
    borderColor: Colors.PRIMARY,
  },
  presetChipText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  presetChipTextActive: {
    color: Colors.PRIMARY,
    fontFamily: Fonts.BOLD,
  },

  // Dosage
  dosageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dosageChip: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  dosageChipActive: {
    backgroundColor: Colors.SECONDARY + '33',
    borderColor: Colors.SECONDARY,
  },
  dosageChipText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  dosageChipTextActive: {
    color: Colors.SECONDARY,
    fontFamily: Fonts.BOLD,
  },

  // Time
  timeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timeChip: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  timeChipActive: {
    backgroundColor: Colors.PRIMARY + '33',
    borderColor: Colors.PRIMARY,
  },
  timeChipText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  timeChipTextActive: {
    color: Colors.PRIMARY,
    fontFamily: Fonts.BOLD,
  },

  // Input
  input: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    marginTop: 8,
  },

  // Save
  saveButton: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
});
