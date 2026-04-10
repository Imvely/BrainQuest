import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import {
  GRADE_CONFIG,
  COMBO_DAMAGE_MULTIPLIER,
  MAX_COMBO,
  getGradeFromMinutes,
  MONSTER_CONFIG,
} from '../../constants/game';
import type { QuestGrade } from '../../constants/game';
import { useBattleStore } from '../../stores/useBattleStore';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { useTimelineStore } from '../../stores/useTimelineStore';
import {
  useStartBattle,
  useEndBattle,
  useRecordExit,
  useRecordReturn,
} from '../../hooks/useBattle';
import { useBattleTimer } from '../../hooks/useBattleTimer';
import type { BattleResult, PenaltyType } from '../../types/battle';
import HpBar from '../../components/battle/HpBar';
import ComboGauge from '../../components/battle/ComboGauge';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import ProgressBar from '../../components/common/ProgressBar';
import type { BattleStackParamList } from '../../navigation/MainTab';

// =====================================================================
// Types & Constants
// =====================================================================

type Nav = StackNavigationProp<BattleStackParamList, 'BattleHome'>;
type Route = RouteProp<BattleStackParamList, 'BattleHome'>;

const TIME_PRESETS = [
  { min: 15, label: '15분' },
  { min: 25, label: '25분', recommended: true },
  { min: 40, label: '40분' },
  { min: 50, label: '50분' },
];

// =====================================================================
// Main Component
// =====================================================================

export default function BattleScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  // ── Stores (individual selectors to avoid full-store re-renders) ──
  const phase = useBattleStore((s) => s.phase);
  const remainingSeconds = useBattleStore((s) => s.remainingSeconds);
  const comboCount = useBattleStore((s) => s.comboCount);
  const maxCombo = useBattleStore((s) => s.maxCombo);
  const exitCount = useBattleStore((s) => s.exitCount);
  const sessionId = useBattleStore((s) => s.sessionId);
  const monsterMaxHp = useBattleStore((s) => s.monsterMaxHp);
  const monsterRemainingHp = useBattleStore((s) => s.monsterRemainingHp);
  const characterHp = useBattleStore((s) => s.characterHp);
  const characterMaxHp = useBattleStore((s) => s.characterMaxHp);
  const plannedMin = useBattleStore((s) => s.plannedMin);
  const result = useBattleStore((s) => s.result);
  const expEarned = useBattleStore((s) => s.expEarned);
  const goldEarned = useBattleStore((s) => s.goldEarned);
  const itemDrops = useBattleStore((s) => s.itemDrops);
  const levelUp = useBattleStore((s) => s.levelUp);
  const newLevel = useBattleStore((s) => s.newLevel);
  const isPerfectFocus = useBattleStore((s) => s.isPerfectFocus);

  // Store actions (stable references — don't cause re-renders)
  const storeActions = useRef(useBattleStore.getState());
  storeActions.current = useBattleStore.getState();

  const character = useCharacterStore((s) => s.character);
  const nextBlock = useTimelineStore((s) => s.nextBlock);

  const routeQuestId = route.params?.questId;
  const routeCheckpointId = route.params?.checkpointId;

  // ── Local state ──
  const [selectedMin, setSelectedMin] = useState(25);
  const [isCustom, setIsCustom] = useState(false);
  const [countdownNum, setCountdownNum] = useState(3);
  const [showPenalty, setShowPenalty] = useState(false);
  const [penaltyType, setPenaltyType] = useState<PenaltyType | null>(null);
  const [lastDamage, setLastDamage] = useState(0);
  const [showDamage, setShowDamage] = useState(false);

  // ── Refs ──
  const isEndingRef = useRef(false);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penaltyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Mutations ──
  const startMut = useStartBattle();
  const endMut = useEndBattle();
  const exitMut = useRecordExit();
  const returnMut = useRecordReturn();

  // ── Animation shared values ──
  const pulseScale = useSharedValue(1);
  const cdScale = useSharedValue(1);
  const cdOpacity = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const monsterShake = useSharedValue(0);
  const charSlash = useSharedValue(0);
  const dmgY = useSharedValue(0);
  const dmgOpacity = useSharedValue(0);
  const victoryScale = useSharedValue(0);

  const grade = useMemo<QuestGrade>(() => getGradeFromMinutes(selectedMin), [selectedMin]);
  const monster = useMemo(() => MONSTER_CONFIG[grade], [grade]);
  const gradeConf = useMemo(() => GRADE_CONFIG[grade], [grade]);

  const nextBlockMin = useMemo(() => {
    if (!nextBlock) return null;
    const now = new Date();
    const [h, m] = nextBlock.startTime.split(':').map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    const diff = Math.floor((target.getTime() - now.getTime()) / 60000);
    return diff > 0 ? diff : null;
  }, [nextBlock]);

  const timeStr = useMemo(() => {
    const mm = Math.floor(remainingSeconds / 60);
    const ss = remainingSeconds % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }, [remainingSeconds]);

  const progress = useMemo(() => {
    const total = plannedMin * 60;
    return total > 0 ? Math.min(1, (total - remainingSeconds) / total) : 0;
  }, [remainingSeconds, plannedMin]);

  const isLowTime = remainingSeconds > 0 && remainingSeconds <= 300;

  // ── Active monster config (for fighting phase) ──
  const fightGrade = useMemo<QuestGrade>(
    () => getGradeFromMinutes(plannedMin),
    [plannedMin],
  );
  const fightMonster = useMemo(() => MONSTER_CONFIG[fightGrade], [fightGrade]);

  // =====================================================================
  // Handlers (defined before effects that use them)
  // =====================================================================

  const handleBattleEnd = useCallback(
    (battleResult: BattleResult) => {
      if (!sessionId || isEndingRef.current) return;
      isEndingRef.current = true;

      endMut.mutate(
        { sessionId, request: { result: battleResult, maxCombo } },
        {
          onSuccess: (res) => {
            const d = res.data;
            storeActions.current.setResult({
              result: battleResult,
              expEarned: d?.expEarned ?? 0,
              goldEarned: d?.goldEarned ?? 0,
              itemDrops: d?.itemDrops ?? [],
              levelUp: d?.levelUp ?? false,
              newLevel: d?.newLevel,
              checkpointCompleted: d?.checkpointCompleted ?? false,
            });
            if (battleResult === 'VICTORY') {
              victoryScale.value = withSpring(1, { damping: 6 });
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            }
          },
          onError: () => {
            storeActions.current.setResult({
              result: battleResult,
              expEarned: 0,
              goldEarned: 0,
              itemDrops: [],
              levelUp: false,
              checkpointCompleted: false,
            });
          },
        },
      );
    },
    [sessionId, maxCombo, endMut, victoryScale],
  );

  // =====================================================================
  // Effects
  // =====================================================================

  // Pulse animation for start button
  useEffect(() => {
    if (phase === 'SETUP') {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    }
  }, [phase, pulseScale]);

  // Check monster defeated
  useEffect(() => {
    if (phase === 'FIGHTING' && monsterRemainingHp <= 0 && monsterMaxHp > 0) {
      handleBattleEnd('VICTORY');
    }
  }, [phase, monsterRemainingHp, monsterMaxHp, handleBattleEnd]);

  // Check character HP
  useEffect(() => {
    if (phase === 'FIGHTING' && characterHp <= 0 && characterMaxHp > 0) {
      handleBattleEnd('DEFEAT');
    }
  }, [phase, characterHp, characterMaxHp, handleBattleEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
      if (penaltyTimeoutRef.current) clearTimeout(penaltyTimeoutRef.current);
    };
  }, []);

  // =====================================================================
  // Attack animation
  // =====================================================================

  const triggerAttack = useCallback(() => {
    const atk = character?.statAtk ?? 10;
    const combo = Math.min(comboCount, MAX_COMBO);
    const multiplier = COMBO_DAMAGE_MULTIPLIER[combo] ?? 1;
    const damage = Math.floor(20 * (1 + atk / 100) * multiplier);

    storeActions.current.applyDamage(damage);
    setLastDamage(damage);
    setShowDamage(true);

    // Character slash forward
    charSlash.value = withSequence(
      withTiming(-30, { duration: 150 }),
      withTiming(0, { duration: 200 }),
    );

    // Monster shake
    monsterShake.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );

    // Damage float up
    dmgY.value = 0;
    dmgOpacity.value = 1;
    dmgY.value = withTiming(-60, { duration: 800 });
    dmgOpacity.value = withDelay(
      400,
      withTiming(0, { duration: 400 }, () => {
        runOnJS(setShowDamage)(false);
      }),
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [character, comboCount, charSlash, monsterShake, dmgY, dmgOpacity]);

  // =====================================================================
  // Timer hook
  // =====================================================================

  const { resetComboTracker } = useBattleTimer({
    onComboTick: () => triggerAttack(),
    onTimeUp: () => handleBattleEnd('VICTORY'),
    onAppReturn: (durationSec) => {
      if (durationSec < 5 || !sessionId) return;

      storeActions.current.handleExit();

      exitMut.mutate(sessionId, {
        onSettled: () => {
          returnMut.mutate(sessionId, {
            onSuccess: (res) => {
              const penalty = res.data?.penaltyType ?? 'COMBO_RESET';
              const hp = res.data?.monsterRemainingHp ?? monsterRemainingHp;

              if (penalty === 'DEFEAT') {
                handleBattleEnd('DEFEAT');
                return;
              }

              storeActions.current.handleReturn(penalty, hp);
              resetComboTracker();
              setPenaltyType(penalty);
              setShowPenalty(true);
              if (penaltyTimeoutRef.current) clearTimeout(penaltyTimeoutRef.current);
              penaltyTimeoutRef.current = setTimeout(() => setShowPenalty(false), 3000);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Warning,
              );
            },
          });
        },
      });
    },
  });

  const handleStartBattle = useCallback(() => {
    // Clear any existing countdown to prevent double-start leak
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);

    storeActions.current.setPlannedMin(selectedMin);
    storeActions.current.setPhase('COUNTDOWN');
    isEndingRef.current = false;

    let count = 3;
    setCountdownNum(3);

    cdScale.value = 0.5;
    cdOpacity.value = 0;
    cdScale.value = withSpring(1, { damping: 8 });
    cdOpacity.value = withTiming(1, { duration: 200 });

    countdownIntervalRef.current = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        cdScale.value = 0.5;
        cdOpacity.value = 0;
        cdScale.value = withSpring(1, { damping: 8 });
        cdOpacity.value = withTiming(1, { duration: 200 });
      } else {
        if (countdownIntervalRef.current)
          clearInterval(countdownIntervalRef.current);
        setCountdownNum(0);

        cdScale.value = 0.3;
        cdOpacity.value = 0;
        cdScale.value = withSpring(1.2, { damping: 6 });
        cdOpacity.value = withTiming(1, { duration: 200 });

        flashOpacity.value = withDelay(
          300,
          withSequence(
            withTiming(1, { duration: 200 }),
            withTiming(0, { duration: 300 }),
          ),
        );

        countdownTimeoutRef.current = setTimeout(() => {
          startMut.mutate(
            {
              plannedMin: selectedMin,
              questId: routeQuestId,
              checkpointId: routeCheckpointId,
            },
            {
              onSuccess: (res) => {
                if (res.data) {
                  storeActions.current.startFighting(res.data);
                  const hp = character?.statHp ?? 100;
                  useBattleStore.setState({
                    characterHp: hp,
                    characterMaxHp: hp,
                  });
                  resetComboTracker();
                }
              },
              onError: () => {
                Alert.alert('오류', '전투를 시작할 수 없습니다.');
                storeActions.current.setPhase('SETUP');
              },
            },
          );
        }, 800);
      }
    }, 1000);
  }, [
    selectedMin, routeQuestId, routeCheckpointId, character,
    startMut, cdScale, cdOpacity, flashOpacity, resetComboTracker,
  ]);

  const handleAbandon = useCallback(() => {
    Alert.alert(
      '전투 포기',
      '정말 포기하시겠습니까?\n포기하면 보상을 받을 수 없습니다.',
      [
        { text: '계속 싸우기', style: 'cancel' },
        {
          text: '포기하기',
          style: 'destructive',
          onPress: () => handleBattleEnd('ABANDON'),
        },
      ],
    );
  }, [handleBattleEnd]);

  const handleGoHome = useCallback(() => {
    storeActions.current.reset();
    navigation.getParent()?.navigate('Map');
  }, [navigation]);

  const handleNextBattle = useCallback(() => {
    storeActions.current.reset();
    isEndingRef.current = false;
  }, []);

  // Android hardware back button — block during COUNTDOWN/FIGHTING
  useEffect(() => {
    if (phase !== 'FIGHTING' && phase !== 'COUNTDOWN') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'COUNTDOWN') return true;
      if (phase === 'FIGHTING') {
        handleAbandon();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [phase, handleAbandon]);

  // =====================================================================
  // Animated styles
  // =====================================================================

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const cdStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cdScale.value }],
    opacity: cdOpacity.value,
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: monsterShake.value }],
  }));

  const slashStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: charSlash.value }],
  }));

  const dmgStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dmgY.value }],
    opacity: dmgOpacity.value,
  }));

  const vicStyle = useAnimatedStyle(() => ({
    transform: [{ scale: victoryScale.value }],
  }));

  // =====================================================================
  // RENDER: SETUP
  // =====================================================================

  if (phase === 'SETUP') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.setupScroll}>
          <Text style={styles.setupTitle}>전투 준비</Text>
          <Text style={styles.setupSub}>
            {routeQuestId ? '퀘스트 전투' : '독립 전투 — 집중 세션을 시작하세요'}
          </Text>

          {/* Monster Preview */}
          <Card style={styles.monsterCard}>
            <Text style={styles.monsterEmoji}>{monster.emoji}</Text>
            <Text style={styles.monsterName}>{monster.name}</Text>
            <Text style={styles.monsterGrade}>등급 {grade}</Text>
            <Text style={styles.hpPreview}>HP {gradeConf.monsterHp}</Text>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardChip}>EXP +{gradeConf.exp}</Text>
              <Text style={styles.rewardChip}>Gold +{gradeConf.gold}</Text>
              <Text style={styles.rewardChip}>
                드롭 {Math.round(gradeConf.dropRate * 100)}%
              </Text>
            </View>
          </Card>

          {/* Time Presets */}
          <Text style={styles.sectionLabel}>세션 시간</Text>
          <View style={styles.presetRow}>
            {TIME_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.min}
                style={[
                  styles.chip,
                  !isCustom && selectedMin === p.min && styles.chipActive,
                ]}
                onPress={() => { setSelectedMin(p.min); setIsCustom(false); }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    !isCustom && selectedMin === p.min && styles.chipTextActive,
                  ]}
                >
                  {p.label}{p.recommended ? ' ★' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom toggle */}
          <TouchableOpacity
            style={[styles.chip, isCustom && styles.chipCustomActive]}
            onPress={() => setIsCustom(!isCustom)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isCustom && styles.chipCustomText]}>
              커스텀
            </Text>
          </TouchableOpacity>

          {isCustom && (
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setSelectedMin((v) => Math.max(5, v - 5))}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperText}>-5</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{selectedMin}분</Text>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => setSelectedMin((v) => Math.min(60, v + 5))}
                activeOpacity={0.7}
              >
                <Text style={styles.stepperText}>+5</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Start Button */}
          <Animated.View style={[styles.startWrap, pulseStyle]}>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={handleStartBattle}
              activeOpacity={0.8}
              disabled={startMut.isPending}
            >
              <Text style={styles.startBtnText}>전투 시작!</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =====================================================================
  // RENDER: COUNTDOWN
  // =====================================================================

  if (phase === 'COUNTDOWN') {
    return (
      <View style={styles.cdContainer}>
        <Animated.View style={cdStyle}>
          <Text style={styles.cdNumber}>
            {countdownNum > 0 ? countdownNum : '전투 개시!'}
          </Text>
        </Animated.View>
        <Animated.View style={[styles.flash, flashStyle]} pointerEvents="none" />
      </View>
    );
  }

  // =====================================================================
  // RENDER: RESULT
  // =====================================================================

  if (phase === 'RESULT') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          {/* ── VICTORY ── */}
          {result === 'VICTORY' && (
            <>
              <Animated.Text style={[styles.victoryText, vicStyle]}>
                VICTORY!
              </Animated.Text>
              <Text style={styles.bigEmoji}>💥</Text>

              {isPerfectFocus && (
                <View style={styles.perfectBadge}>
                  <Text style={styles.perfectTitle}>⭐ Perfect Focus!</Text>
                  <Text style={styles.perfectSub}>추가 보상 +50%</Text>
                </View>
              )}

              <Card style={styles.rewardCard}>
                <Text style={styles.cardTitle}>획득 보상</Text>
                <View style={styles.rewardDropRow}>
                  <RewardItem emoji="✨" label={`EXP +${expEarned}`} color={Colors.PRIMARY} />
                  <RewardItem emoji="🪙" label={`Gold +${goldEarned}`} color={Colors.GOLD} />
                </View>
                {itemDrops.length > 0 && (
                  <View style={styles.itemDrops}>
                    {itemDrops.map((item, i) => (
                      <View key={i} style={styles.dropRow}>
                        <Text style={styles.dropEmoji}>🎁</Text>
                        <Text style={styles.dropName}>{item.name}</Text>
                        <Text style={[styles.dropRarity, { color: rarityColor(item.rarity) }]}>
                          {item.rarity}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>

              {levelUp && (
                <View style={styles.lvUpBanner}>
                  <Text style={styles.lvUpText}>LEVEL UP!</Text>
                  <Text style={styles.lvUpLevel}>Lv. {newLevel}</Text>
                </View>
              )}

              <Card style={styles.statsCard}>
                <Text style={styles.cardTitle}>전투 기록</Text>
                <StatRow label="세션 시간" value={`${plannedMin}분`} />
                <StatRow label="이탈 횟수" value={`${exitCount}회`} />
                <StatRow label="최대 콤보" value={`x${maxCombo}`} />
                <StatRow label="몬스터" value={fightMonster.name} />
              </Card>

              <View style={styles.btnCol}>
                <Button title="다음 전투!" onPress={handleNextBattle} variant="primary" size="lg" style={styles.fullBtn} />
                <Button title="홈으로" onPress={handleGoHome} variant="outline" size="lg" style={styles.fullBtn} />
              </View>
            </>
          )}

          {/* ── DEFEAT ── */}
          {result === 'DEFEAT' && (
            <>
              <Text style={styles.bigEmoji}>😢</Text>
              <Text style={styles.defeatTitle}>아쉽게 놓쳤어요...</Text>
              <Text style={styles.defeatMsg}>
                다시 도전하는 것 자체가 경험치입니다
              </Text>

              <Card style={styles.rewardCard}>
                <Text style={styles.cardTitle}>획득 보상 (감소)</Text>
                <View style={styles.rewardDropRow}>
                  <RewardItem emoji="✨" label={`EXP +${expEarned}`} color={Colors.PRIMARY} />
                  <RewardItem emoji="🪙" label={`Gold +${goldEarned}`} color={Colors.GOLD} />
                </View>
              </Card>

              <View style={styles.btnCol}>
                <Button title="다시 도전!" onPress={handleNextBattle} variant="primary" size="lg" style={styles.fullBtn} />
                <Button title="나중에 하기" onPress={handleGoHome} variant="ghost" size="lg" style={styles.fullBtn} />
              </View>
            </>
          )}

          {/* ── ABANDON ── */}
          {result === 'ABANDON' && (
            <>
              <Text style={styles.bigEmoji}>🏳️</Text>
              <Text style={styles.abandonTitle}>전투를 포기했습니다</Text>
              <Text style={styles.abandonMsg}>보상 없음</Text>
              <View style={styles.btnCol}>
                <Button title="홈으로" onPress={handleGoHome} variant="outline" size="lg" style={styles.fullBtn} />
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =====================================================================
  // RENDER: FIGHTING
  // =====================================================================

  return (
    <View style={styles.container}>
      {/* ── Top Bar ── */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <View style={styles.topRow}>
          {nextBlockMin != null && (
            <View style={styles.miniWidget}>
              <Text style={styles.miniText}>다음 일정 {nextBlockMin}분 후</Text>
            </View>
          )}
          <Text style={[styles.timer, isLowTime && styles.timerLow]}>
            {timeStr}
          </Text>
        </View>
        <ProgressBar
          progress={progress}
          color={isLowTime ? Colors.WARNING : Colors.PRIMARY}
          height={6}
          style={styles.progressBar}
        />
      </SafeAreaView>

      {/* ── Monster Area (45%) ── */}
      <View style={styles.monsterArea}>
        <Animated.View style={shakeStyle}>
          <Text style={styles.fightEmoji}>{fightMonster.emoji}</Text>
        </Animated.View>
        <Text style={styles.fightName}>{fightMonster.name}</Text>
        <View style={styles.hpWrap}>
          <HpBar
            current={monsterRemainingHp}
            max={monsterMaxHp}
            color={Colors.ERROR}
            height={12}
            label="HP"
          />
        </View>
        {showDamage && (
          <Animated.Text style={[styles.dmgFloat, dmgStyle]}>
            -{lastDamage}
          </Animated.Text>
        )}
      </View>

      {/* ── Combo Area (10%) ── */}
      <ComboGauge count={comboCount} />

      {/* ── Character Area (15%) ── */}
      <Animated.View style={[styles.charArea, slashStyle]}>
        <Text style={styles.charAvatar}>⚔️</Text>
        <View style={styles.charBars}>
          <HpBar current={characterHp} max={characterMaxHp} color={Colors.SUCCESS} height={8} label="HP" />
          {character && (
            <HpBar
              current={character.exp}
              max={character.expToNext}
              color={Colors.PRIMARY}
              height={6}
              label="EXP"
            />
          )}
        </View>
      </Animated.View>

      {/* ── Abandon ── */}
      <View style={styles.abandonArea}>
        <TouchableOpacity onPress={handleAbandon} activeOpacity={0.7}>
          <Text style={styles.abandonText}>포기하기</Text>
        </TouchableOpacity>
      </View>

      {/* ── Penalty Overlay ── */}
      {showPenalty && penaltyType && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          style={styles.penaltyOverlay}
        >
          <Text style={styles.penaltyTitle}>용사가 돌아왔다!</Text>
          <PenaltyLabel type={penaltyType} />
        </Animated.View>
      )}

      {/* ── Red Flash on HP_DAMAGE ── */}
      {showPenalty && penaltyType === 'HP_DAMAGE' && (
        <Animated.View
          entering={FadeIn.duration(100)}
          exiting={FadeOut.duration(500)}
          style={styles.redFlash}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

// =====================================================================
// Helper Components
// =====================================================================

function PenaltyLabel({ type }: { type: PenaltyType }) {
  const map: Record<string, { text: string; color: string }> = {
    COMBO_RESET: { text: '콤보 리셋', color: Colors.GOLD },
    HP_RECOVER: { text: '몬스터 HP 회복!', color: Colors.WARNING },
    HP_DAMAGE: { text: '몬스터 반격! HP 감소', color: Colors.ERROR },
  };
  const cfg = map[type];
  if (!cfg) return null;
  return <Text style={[styles.penaltyText, { color: cfg.color }]}>{cfg.text}</Text>;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function RewardItem({ emoji, label, color }: { emoji: string; label: string; color: string }) {
  return (
    <View style={styles.rewardItem}>
      <Text style={styles.rewardItemEmoji}>{emoji}</Text>
      <Text style={[styles.rewardItemText, { color }]}>{label}</Text>
    </View>
  );
}

function rarityColor(rarity: string): string {
  const map: Record<string, string> = {
    COMMON: Colors.RARITY_COMMON,
    UNCOMMON: Colors.RARITY_UNCOMMON,
    RARE: Colors.RARITY_RARE,
    EPIC: Colors.RARITY_EPIC,
    LEGENDARY: Colors.RARITY_LEGENDARY,
  };
  return map[rarity] ?? Colors.TEXT_SECONDARY;
}

// =====================================================================
// Styles
// =====================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.BG_PRIMARY },

  // ── SETUP ──
  setupScroll: { padding: 24, paddingBottom: 40 },
  setupTitle: {
    fontFamily: Fonts.BOLD, fontSize: FontSize.XXXL,
    color: Colors.TEXT_PRIMARY, textAlign: 'center', marginTop: 16,
  },
  setupSub: {
    fontFamily: Fonts.REGULAR, fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY, textAlign: 'center',
    marginTop: 8, marginBottom: 24,
  },
  monsterCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 24 },
  monsterEmoji: { fontSize: 64, marginBottom: 8 },
  monsterName: { fontFamily: Fonts.BOLD, fontSize: FontSize.XL, color: Colors.TEXT_PRIMARY },
  monsterGrade: { fontFamily: Fonts.REGULAR, fontSize: FontSize.SM, color: Colors.TEXT_SECONDARY, marginTop: 4 },
  hpPreview: { fontFamily: Fonts.BOLD, fontSize: FontSize.MD, color: Colors.ERROR, marginTop: 8 },
  rewardRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  rewardChip: { fontFamily: Fonts.REGULAR, fontSize: FontSize.SM, color: Colors.TEXT_SECONDARY },

  sectionLabel: { fontFamily: Fonts.BOLD, fontSize: FontSize.LG, color: Colors.TEXT_PRIMARY, marginBottom: 12 },
  presetRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.BG_CARD, borderWidth: 1, borderColor: Colors.BORDER,
  },
  chipActive: { backgroundColor: Colors.PRIMARY, borderColor: Colors.PRIMARY },
  chipText: { fontFamily: Fonts.BOLD, fontSize: FontSize.MD, color: Colors.TEXT_SECONDARY },
  chipTextActive: { color: Colors.TEXT_PRIMARY },
  chipCustomActive: { borderColor: Colors.SECONDARY },
  chipCustomText: { color: Colors.SECONDARY },

  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 20, marginTop: 12, marginBottom: 24,
  },
  stepperBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.BG_CARD, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.BORDER,
  },
  stepperText: { fontFamily: Fonts.BOLD, fontSize: FontSize.LG, color: Colors.TEXT_PRIMARY },
  stepperValue: {
    fontFamily: Fonts.BOLD, fontSize: FontSize.XXXL,
    color: Colors.TEXT_PRIMARY, minWidth: 80, textAlign: 'center',
  },

  startWrap: { marginTop: 24, alignItems: 'center' },
  startBtn: {
    backgroundColor: Colors.ACCENT, paddingHorizontal: 48, paddingVertical: 18,
    borderRadius: 28, shadowColor: Colors.ACCENT,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  startBtnText: { fontFamily: Fonts.BOLD, fontSize: FontSize.XL, color: Colors.TEXT_PRIMARY },

  // ── COUNTDOWN ──
  cdContainer: { flex: 1, backgroundColor: Colors.BG_PRIMARY, justifyContent: 'center', alignItems: 'center' },
  cdNumber: { fontFamily: Fonts.BOLD, fontSize: 80, color: Colors.TEXT_PRIMARY, textAlign: 'center' },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.ACCENT },

  // ── FIGHTING ──
  topBar: { paddingHorizontal: 16, paddingTop: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniWidget: { backgroundColor: Colors.BG_CARD, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  miniText: { fontFamily: Fonts.REGULAR, fontSize: FontSize.XS, color: Colors.TEXT_SECONDARY },
  timer: { fontFamily: Fonts.BOLD, fontSize: FontSize.XXXL, color: Colors.TEXT_PRIMARY },
  timerLow: { color: Colors.WARNING },
  progressBar: { marginTop: 8, marginBottom: 4 },

  monsterArea: { flex: 4.5, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  fightEmoji: { fontSize: 96, marginBottom: 8 },
  fightName: { fontFamily: Fonts.BOLD, fontSize: FontSize.XL, color: Colors.TEXT_PRIMARY, marginBottom: 12 },
  hpWrap: { width: '100%' },
  dmgFloat: {
    position: 'absolute', top: '30%',
    fontFamily: Fonts.BOLD, fontSize: FontSize.XXXL, color: Colors.ACCENT,
  },

  charArea: { flex: 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12 },
  charAvatar: { fontSize: 36 },
  charBars: { flex: 1, gap: 4 },

  abandonArea: { paddingVertical: 16, alignItems: 'center' },
  abandonText: {
    fontFamily: Fonts.REGULAR, fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED, textDecorationLine: 'underline',
  },

  // ── Penalty overlay ──
  penaltyOverlay: {
    position: 'absolute', top: '40%', left: 24, right: 24,
    backgroundColor: Colors.BG_CARD, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.BORDER, zIndex: 100,
  },
  penaltyTitle: { fontFamily: Fonts.BOLD, fontSize: FontSize.XL, color: Colors.TEXT_PRIMARY, marginBottom: 8 },
  penaltyText: { fontFamily: Fonts.BOLD, fontSize: FontSize.LG },
  redFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(214,48,49,0.3)', zIndex: 99 },

  // ── RESULT ──
  resultScroll: { padding: 24, alignItems: 'center', paddingBottom: 40 },
  victoryText: { fontFamily: Fonts.BOLD, fontSize: 40, color: Colors.GOLD, marginTop: 32, marginBottom: 16 },
  bigEmoji: { fontSize: 64, marginBottom: 24 },

  perfectBadge: {
    backgroundColor: 'rgba(253,203,110,0.15)', borderWidth: 1, borderColor: Colors.GOLD,
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', marginBottom: 24,
  },
  perfectTitle: { fontFamily: Fonts.BOLD, fontSize: FontSize.LG, color: Colors.GOLD },
  perfectSub: { fontFamily: Fonts.REGULAR, fontSize: FontSize.SM, color: Colors.GOLD, marginTop: 4 },

  rewardCard: { width: '100%', marginBottom: 16 },
  cardTitle: { fontFamily: Fonts.BOLD, fontSize: FontSize.LG, color: Colors.TEXT_PRIMARY, marginBottom: 12 },
  rewardDropRow: { flexDirection: 'row', justifyContent: 'space-around' },
  rewardItem: { alignItems: 'center', gap: 4 },
  rewardItemEmoji: { fontSize: 28 },
  rewardItemText: { fontFamily: Fonts.BOLD, fontSize: FontSize.MD },

  itemDrops: { marginTop: 16, borderTopWidth: 1, borderTopColor: Colors.DIVIDER, paddingTop: 12 },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  dropEmoji: { fontSize: 20 },
  dropName: { fontFamily: Fonts.REGULAR, fontSize: FontSize.MD, color: Colors.TEXT_PRIMARY, flex: 1 },
  dropRarity: { fontFamily: Fonts.BOLD, fontSize: FontSize.SM },

  lvUpBanner: {
    backgroundColor: 'rgba(108,92,231,0.2)', borderWidth: 1, borderColor: Colors.PRIMARY,
    borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  lvUpText: { fontFamily: Fonts.BOLD, fontSize: FontSize.XXL, color: Colors.PRIMARY },
  lvUpLevel: { fontFamily: Fonts.BOLD, fontSize: FontSize.XXXL, color: Colors.TEXT_PRIMARY, marginTop: 4 },

  statsCard: { width: '100%', marginBottom: 24 },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.DIVIDER,
  },
  statLabel: { fontFamily: Fonts.REGULAR, fontSize: FontSize.MD, color: Colors.TEXT_SECONDARY },
  statValue: { fontFamily: Fonts.BOLD, fontSize: FontSize.MD, color: Colors.TEXT_PRIMARY },

  btnCol: { width: '100%', gap: 12 },
  fullBtn: { width: '100%' },

  defeatTitle: { fontFamily: Fonts.BOLD, fontSize: FontSize.XXL, color: Colors.TEXT_PRIMARY, marginBottom: 8 },
  defeatMsg: {
    fontFamily: Fonts.REGULAR, fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY, textAlign: 'center', marginBottom: 32,
  },

  abandonTitle: { fontFamily: Fonts.BOLD, fontSize: FontSize.XXL, color: Colors.TEXT_PRIMARY, marginBottom: 8 },
  abandonMsg: { fontFamily: Fonts.REGULAR, fontSize: FontSize.MD, color: Colors.TEXT_MUTED, marginBottom: 32 },
});
