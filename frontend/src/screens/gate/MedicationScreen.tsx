import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { format } from 'date-fns';

import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import {
  getMedications,
  createMedication,
  createMedLog,
  updateMedLog as apiUpdateMedLog,
  updateMedication as apiUpdateMed,
  deleteMedication as apiDeleteMed,
} from '../../api/gate';
import type { Medication, MedLog } from '../../api/gate';
import { useGateStore } from '../../stores/useGateStore';

// ---------------------------------------------------------------------------
// ADHD Medication Presets (Korea)
// ---------------------------------------------------------------------------

const ADHD_PRESETS = [
  { name: '콘서타 (메틸페니데이트 OROS)', dosages: ['18mg', '27mg', '36mg', '54mg'] },
  { name: '메디키넷 (메틸페니데이트 IR)', dosages: ['5mg', '10mg', '20mg'] },
  { name: '메디키넷 리타드 (메틸페니데이트 ER)', dosages: ['10mg', '20mg', '30mg', '40mg'] },
  { name: '스트라테라 (아토목세틴)', dosages: ['10mg', '18mg', '25mg', '40mg', '60mg'] },
  { name: '인튜니브 (구안파신 ER)', dosages: ['1mg', '2mg', '3mg', '4mg'] },
  { name: '직접 입력', dosages: [] },
];

const SIDE_EFFECTS = ['식욕 감소', '두통', '불면', '심박수 증가', '기분 저하'];

const EFFECTIVENESS_OPTIONS = [
  { value: 1, emoji: '😐', label: '없음' },
  { value: 2, emoji: '🙂', label: '약간' },
  { value: 3, emoji: '😊', label: '확실히' },
];

const TIME_PRESETS = ['07:00', '08:00', '09:00', '12:00', '18:00', '21:00'];

// ---------------------------------------------------------------------------
// Helper: schedule daily notification
// ---------------------------------------------------------------------------

async function scheduleMedNotification(med: { medName: string; dosage: string; scheduleTime: string }) {
  const [hours, minutes] = med.scheduleTime.split(':').map(Number);
  try {
    // Daily reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '약 복용 시간이에요!',
        body: `${med.medName} ${med.dosage} 복용할 시간입니다. 원탭으로 기록하세요.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    // Effectiveness check — 1 hour later
    const checkH = (hours + 1) % 24;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '약 효과가 느껴지나요?',
        body: '탭해서 기록해주세요.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: checkH,
        minute: minutes,
      },
    });
  } catch {
    // Notification permission may not be granted yet — ignore silently
  }
}

// ---------------------------------------------------------------------------
// MedicationScreen
// ---------------------------------------------------------------------------

export default function MedicationScreen() {
  const navigation = useNavigation();
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const {
    medications,
    todayMedLogs,
    setMedications,
    addMedication,
    removeMedication,
    updateMedication: updateMedInStore,
    setTodayMedLogs,
    addMedLog,
    updateMedLog: updateLogInStore,
  } = useGateStore();

  const [loadingList, setLoadingList] = useState(true);
  const [loggingId, setLoggingId] = useState<number | null>(null);

  // Expanded card (effectiveness UI)
  const [expandedMedId, setExpandedMedId] = useState<number | null>(null);
  const [effectiveness, setEffectiveness] = useState<number | null>(null);
  const [sideEffects, setSideEffects] = useState<string[]>([]);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customName, setCustomName] = useState('');
  const [selectedDosage, setSelectedDosage] = useState('');
  const [customDosage, setCustomDosage] = useState('');
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [saving, setSaving] = useState(false);

  // Action sheet (long-press)
  const [actionMed, setActionMed] = useState<Medication | null>(null);

  // --- Fetch ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMedications();
        if (!cancelled) {
          const active = (res.data ?? []).filter((m: Medication) => m.isActive);
          setMedications(active);
        }
      } catch {
        // show empty
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => { cancelled = true; };
  }, [setMedications]);

  // --- Take medication ---
  const handleTakeMed = useCallback(async (med: Medication) => {
    // Already taken today?
    const alreadyLogged = todayMedLogs.some((l) => l.medicationId === med.id);
    if (alreadyLogged) return;

    setLoggingId(med.id);
    try {
      const res = await createMedLog({ medicationId: med.id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addMedLog(res.data);
    } catch {
      Alert.alert('기록 실패', '잠시 후 다시 시도해주세요.');
    } finally {
      setLoggingId(null);
    }
  }, [todayMedLogs, addMedLog]);

  // --- Submit effectiveness ---
  const handleSubmitEffectiveness = useCallback(async (medId: number) => {
    const log = todayMedLogs.find((l) => l.medicationId === medId);
    if (!log || effectiveness === null) return;

    try {
      await apiUpdateMedLog(log.id, { effectiveness, sideEffects });
      updateLogInStore(log.id, { effectiveness });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setExpandedMedId(null);
      setEffectiveness(null);
      setSideEffects([]);
    } catch {
      Alert.alert('기록 실패', '잠시 후 다시 시도해주세요.');
    }
  }, [todayMedLogs, effectiveness, sideEffects, updateLogInStore]);

  // --- Add medication ---
  const handleAddMed = useCallback(async () => {
    if (selectedPreset === null) return;
    const preset = ADHD_PRESETS[selectedPreset];
    const medName = preset.name === '직접 입력' ? customName.trim() : preset.name;
    const dosage = preset.dosages.length === 0 ? customDosage.trim() : selectedDosage;

    if (!medName || !dosage) {
      Alert.alert('입력 확인', '약물명과 용량을 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const res = await createMedication({ medName, dosage, scheduleTime });
      addMedication(res.data);
      await scheduleMedNotification({ medName, dosage, scheduleTime });
      resetAddForm();
    } catch {
      Alert.alert('등록 실패', '약물 등록 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [selectedPreset, customName, customDosage, selectedDosage, scheduleTime, addMedication]);

  const resetAddForm = () => {
    setShowAdd(false);
    setSelectedPreset(null);
    setCustomName('');
    setSelectedDosage('');
    setCustomDosage('');
    setScheduleTime('08:00');
  };

  // --- Long-press actions ---
  const handleDeactivate = useCallback(async () => {
    if (!actionMed) return;
    try {
      await apiUpdateMed(actionMed.id, { isActive: false });
      removeMedication(actionMed.id);
      setActionMed(null);
    } catch {
      Alert.alert('오류', '처리 중 문제가 발생했습니다.');
    }
  }, [actionMed, removeMedication]);

  const handleDelete = useCallback(async () => {
    if (!actionMed) return;
    Alert.alert('약물 삭제', `${actionMed.medName}을(를) 삭제하시겠어요?\n복용 기록도 함께 삭제됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDeleteMed(actionMed.id);
            removeMedication(actionMed.id);
            setActionMed(null);
          } catch {
            Alert.alert('오류', '삭제 중 문제가 발생했습니다.');
          }
        },
      },
    ]);
  }, [actionMed, removeMedication]);

  // --- Render med card ---
  const renderMedCard = useCallback(({ item }: { item: Medication }) => {
    const takenLog = todayMedLogs.find((l) => l.medicationId === item.id);
    const isTaken = !!takenLog;
    const isExpanded = expandedMedId === item.id;
    const isLogging = loggingId === item.id;

    return (
      <Animated.View entering={FadeInDown.duration(300)}>
        <TouchableOpacity
          style={styles.medCard}
          onPress={() => {
            if (isTaken && !isExpanded) {
              setExpandedMedId(item.id);
              setEffectiveness(null);
              setSideEffects([]);
            }
          }}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setActionMed(item);
          }}
          activeOpacity={0.7}
          accessibilityLabel={`${item.medName} ${item.dosage}`}
        >
          {/* Main row */}
          <View style={styles.medCardRow}>
            <Text style={styles.medIcon}>{'💊'}</Text>
            <View style={styles.medInfo}>
              <Text style={styles.medName}>{item.medName}</Text>
              <Text style={styles.medDetail}>{item.dosage} · {item.scheduleTime}</Text>
            </View>

            {/* Take button */}
            <TouchableOpacity
              style={[styles.takeBtn, isTaken && styles.takeBtnDone]}
              onPress={() => handleTakeMed(item)}
              disabled={isTaken || isLogging}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isTaken }}
              accessibilityLabel={`${item.medName} 복용 기록`}
            >
              {isLogging ? (
                <ActivityIndicator color={Colors.TEXT_PRIMARY} size="small" />
              ) : isTaken ? (
                <Text style={styles.takeBtnCheck}>{'✓'}</Text>
              ) : (
                <View style={styles.takeBtnEmpty} />
              )}
            </TouchableOpacity>
          </View>

          {/* Expanded: effectiveness UI */}
          {isExpanded && isTaken && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.effectivenessArea}>
              <Text style={styles.effectLabel}>약이 효과가 있나요?</Text>
              <View style={styles.effectRow}>
                {EFFECTIVENESS_OPTIONS.map((opt) => {
                  const isActive = effectiveness === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.effectBtn, isActive && styles.effectBtnActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setEffectiveness(opt.value);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.effectEmoji}>{opt.emoji}</Text>
                      <Text style={[styles.effectBtnLabel, isActive && styles.effectBtnLabelActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.effectLabel}>부작용 (복수 선택)</Text>
              <View style={styles.sideEffectRow}>
                {SIDE_EFFECTS.map((se) => {
                  const isActive = sideEffects.includes(se);
                  return (
                    <TouchableOpacity
                      key={se}
                      style={[styles.sideChip, isActive && styles.sideChipActive]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSideEffects((prev) =>
                          isActive ? prev.filter((s) => s !== se) : [...prev, se],
                        );
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.sideChipText, isActive && styles.sideChipTextActive]}>
                        {se}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.recordBtn, effectiveness === null && { opacity: 0.4 }]}
                onPress={() => handleSubmitEffectiveness(item.id)}
                disabled={effectiveness === null}
                activeOpacity={0.7}
              >
                <Text style={styles.recordBtnText}>기록하기</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }, [todayMedLogs, loggingId, expandedMedId, effectiveness, sideEffects, handleTakeMed, handleSubmitEffectiveness]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="뒤로 가기">
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>약물 관리 💊</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* List */}
      {loadingList ? (
        <View style={styles.centerArea}>
          <ActivityIndicator color={Colors.PRIMARY} size="large" />
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.centerArea}>
          <Text style={styles.emptyEmoji}>{'💊'}</Text>
          <Text style={styles.emptyText}>등록된 약물이 없어요</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setShowAdd(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyBtnText}>약물 등록하기</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={medications}
          renderItem={renderMedCard}
          keyExtractor={(item) => String(item.id)}
          getItemLayout={(_, index) => ({ length: 82, offset: 82 * index, index })}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAdd(true)}
        activeOpacity={0.7}
        accessibilityLabel="약물 추가"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ======================== Add Modal ======================== */}
      <Modal visible={showAdd} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.flex}
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
                        setCustomDosage('');
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
                    accessibilityLabel="약물명 직접 입력"
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

                {/* Custom Dosage */}
                {selectedPreset !== null && ADHD_PRESETS[selectedPreset].dosages.length === 0 && (
                  <TextInput
                    style={styles.input}
                    value={customDosage}
                    onChangeText={setCustomDosage}
                    placeholder="용량 입력 (예: 27mg)"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    accessibilityLabel="용량 직접 입력"
                  />
                )}

                {/* Schedule Time */}
                <Text style={styles.fieldLabel}>복용 시간</Text>
                <View style={styles.timeRow}>
                  {TIME_PRESETS.map((time) => (
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
                  style={[styles.saveBtn, (!selectedDosage && !customDosage.trim()) && { opacity: 0.4 }]}
                  onPress={handleAddMed}
                  disabled={saving || selectedPreset === null || (!selectedDosage && !customDosage.trim())}
                  activeOpacity={0.7}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.TEXT_PRIMARY} />
                  ) : (
                    <Text style={styles.saveBtnText}>등록</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ======================== Action Sheet Modal ======================== */}
      <Modal visible={!!actionMed} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setActionMed(null)}
          activeOpacity={1}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionTitle}>{actionMed?.medName}</Text>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleDeactivate}
              activeOpacity={0.7}
            >
              <Text style={styles.actionItemText}>복용 중단</Text>
              <Text style={styles.actionItemSub}>기록은 보존됩니다</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionItemText, { color: Colors.ERROR }]}>삭제</Text>
              <Text style={styles.actionItemSub}>복용 기록도 함께 삭제됩니다</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCancel}
              onPress={() => setActionMed(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
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
  headerSpacer: { width: 44 },

  // List
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 100,
  },

  // Med card
  medCard: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  medCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 2,
  },
  medDetail: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },

  // Take button (circle checkbox)
  takeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  takeBtnDone: {
    backgroundColor: Colors.SUCCESS,
    borderColor: Colors.SUCCESS,
  },
  takeBtnCheck: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
  },
  takeBtnEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.BORDER,
  },

  // Effectiveness expanded area
  effectivenessArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
  },
  effectLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 10,
  },
  effectRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  effectBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  effectBtnActive: {
    backgroundColor: Colors.PRIMARY + '22',
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  effectEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  effectBtnLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  effectBtnLabelActive: {
    color: Colors.PRIMARY,
    fontFamily: Fonts.BOLD,
  },

  // Side effects
  sideEffectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  sideChip: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  sideChipActive: {
    backgroundColor: Colors.WARNING + '22',
    borderColor: Colors.WARNING,
  },
  sideChipText: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  sideChipTextActive: {
    color: Colors.WARNING,
    fontFamily: Fonts.BOLD,
  },

  recordBtn: {
    backgroundColor: Colors.SECONDARY,
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
  },

  // Empty
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
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

  // ======================== Add Modal ========================
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.OVERLAY,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
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

  // Presets
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
    flexWrap: 'wrap',
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
  saveBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },

  // ======================== Action Sheet ========================
  actionSheet: {
    backgroundColor: Colors.BG_SECONDARY,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  actionTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  actionItemText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
  },
  actionItemSub: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    marginTop: 2,
  },
  actionCancel: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionCancelText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    color: Colors.TEXT_SECONDARY,
  },
});
