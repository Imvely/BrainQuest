import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { WEATHER_CONFIG, WeatherType } from '../../constants/weather';
import { TimeBlock } from '../../types/timeline';
import { Quest } from '../../types/quest';

import CircularTimeline from '../../components/timeline/CircularTimeline';
import AddBlockModal from '../../components/timeline/AddBlockModal';
import ProgressBar from '../../components/common/ProgressBar';
import Card from '../../components/common/Card';

import { TimeBlockCreateRequest } from '../../types/timeline';
import { useTimeline, useCreateTimeBlock, useDeleteTimeBlock } from '../../hooks/useTimeline';
import { useCharacter } from '../../hooks/useCharacter';
import { useQuests } from '../../hooks/useQuests';
import { useEmotionStore } from '../../stores/useEmotionStore';
import { useTimelineStore } from '../../stores/useTimelineStore';
import { useAuthStore } from '../../stores/useAuthStore';

import { parseHHMM } from '../../utils/time';

// --- Category colors (for quest grade badge) ---
const GRADE_COLORS: Record<string, string> = {
  E: Colors.GRADE_E,
  D: Colors.GRADE_D,
  C: Colors.GRADE_C,
  B: Colors.GRADE_B,
  A: Colors.GRADE_A,
};

export default function TimelineScreen() {
  const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();
  const user = useAuthStore((s) => s.user);
  const wakeTime = user?.wakeTime ?? '07:00';
  const sleepTime = user?.sleepTime ?? '23:00';

  // --- Data hooks ---
  const { selectedDate, blocks, setBlocks, remainingMin, nextBlock, recalcDerived } =
    useTimelineStore();
  const { data: timelineData, isLoading, refetch } = useTimeline(selectedDate);
  const { data: character } = useCharacter();
  const { data: quests } = useQuests({ status: 'ACTIVE' });
  const recentRecords = useEmotionStore((s) => s.recentRecords);

  const createBlock = useCreateTimeBlock();
  const deleteBlock = useDeleteTimeBlock();

  // Sync server data → store
  useEffect(() => {
    if (timelineData) {
      setBlocks(timelineData as TimeBlock[]);
    }
  }, [timelineData, setBlocks]);

  // Recalc remaining time every minute
  useEffect(() => {
    recalcDerived(sleepTime);
    const interval = setInterval(() => recalcDerived(sleepTime), 60000);
    return () => clearInterval(interval);
  }, [sleepTime, recalcDerived]);

  // --- AddBlockModal state ---
  const [modalVisible, setModalVisible] = useState(false);
  const [gapStart, setGapStart] = useState('09:00');
  const [gapEnd, setGapEnd] = useState('10:00');

  const handleGapPress = useCallback((start: string, end: string) => {
    setGapStart(start);
    setGapEnd(end);
    setModalVisible(true);
  }, []);

  const handleBlockPress = useCallback(
    (block: TimeBlock) => {
      Alert.alert(
        block.title,
        `${block.startTime} ~ ${block.endTime}\n상태: ${block.status}`,
        [
          { text: '닫기', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => deleteBlock.mutate({ id: block.id, blockDate: selectedDate }),
          },
        ],
      );
    },
    [deleteBlock],
  );

  const handleCreateBlock = useCallback(
    (req: TimeBlockCreateRequest) => {
      createBlock.mutate(req, {
        onSuccess: () => {
          setModalVisible(false);
          refetch();
        },
      });
    },
    [createBlock, refetch],
  );

  // --- Pull-to-refresh ---
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // --- Today's emotion ---
  const todayWeather = useMemo(() => {
    if (recentRecords.length === 0) return null;
    return recentRecords[0].weatherType as WeatherType;
  }, [recentRecords]);
  const weatherConfig = todayWeather ? WEATHER_CONFIG[todayWeather] : null;

  // --- Next block countdown ---
  const nextBlockMin = useMemo(() => {
    if (!nextBlock) return undefined;
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return Math.max(0, parseHHMM(nextBlock.startTime) - nowMin);
  }, [nextBlock]);

  // --- Quest progress ---
  const activeQuests = useMemo(
    () => (quests?.content ?? []).filter((q) => q.status === 'ACTIVE' || q.status === 'IN_PROGRESS'),
    [quests],
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.PRIMARY}
            colors={[Colors.PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ===== Area 1: Status Bar (12%) ===== */}
        <View style={styles.statusBar}>
          {/* Left: Character avatar + level */}
          <View style={styles.statusLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {character?.classType?.[0] ?? '?'}
              </Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv.{character?.level ?? 1}</Text>
            </View>
          </View>

          {/* Center: EXP bar */}
          <View style={styles.statusCenter}>
            <ProgressBar
              progress={character ? character.exp / character.expToNext : 0}
              color={Colors.PRIMARY}
              height={6}
              style={styles.expBar}
            />
            <Text style={styles.expText}>
              {character?.exp ?? 0} / {character?.expToNext ?? 100}
            </Text>
          </View>

          {/* Right: Today's weather */}
          <TouchableOpacity
            style={styles.statusRight}
            onPress={() => navigation.navigate('Sky')}
            activeOpacity={0.7}
          >
            <Text style={styles.weatherEmoji}>
              {weatherConfig?.emoji ?? '?'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ===== Area 2: Circular Timeline (55%) ===== */}
        <View style={styles.timelineArea}>
          <CircularTimeline
            blocks={blocks}
            wakeTime={wakeTime}
            sleepTime={sleepTime}
            remainingMin={remainingMin}
            nextBlockTitle={nextBlock?.title}
            nextBlockMin={nextBlockMin}
            onBlockPress={handleBlockPress}
            onGapPress={handleGapPress}
          />
        </View>

        {/* ===== Area 3: Action Area (33%) ===== */}
        <View style={styles.actionArea}>
          {/* Quest summary cards */}
          {activeQuests.length > 0 && (
            <FlatList
              data={activeQuests}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.questList}
              renderItem={({ item }) => <QuestMiniCard quest={item} />}
              style={styles.questFlatList}
            />
          )}

          {activeQuests.length === 0 && !isLoading && (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>진행 중인 퀘스트가 없습니다</Text>
              <Text style={styles.emptySubtext}>QUEST 탭에서 할 일을 모험으로 바꿔보세요</Text>
            </Card>
          )}

          {/* Bottom action buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => navigation.navigate('More', { screen: 'Checkin' })}
              activeOpacity={0.7}
            >
              <Text style={styles.sideBtnEmoji}>📋</Text>
              <Text style={styles.sideBtnText}>체크인</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mainBtn}
              onPress={() => navigation.navigate('Battle')}
              activeOpacity={0.7}
            >
              <Text style={styles.mainBtnEmoji}>⚔️</Text>
              <Text style={styles.mainBtnText}>전투 시작</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sideBtn}
              onPress={() => navigation.navigate('Sky')}
              activeOpacity={0.7}
            >
              <Text style={styles.sideBtnEmoji}>🌤️</Text>
              <Text style={styles.sideBtnText}>감정 기록</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </SafeAreaView>

      {/* AddBlock Bottom Sheet */}
      <AddBlockModal
        visible={modalVisible}
        initialStartTime={gapStart}
        initialEndTime={gapEnd}
        blockDate={selectedDate}
        quests={activeQuests}
        loading={createBlock.isPending}
        onSubmit={handleCreateBlock}
        onClose={() => setModalVisible(false)}
      />
    </GestureHandlerRootView>
  );
}

// --- Quest Mini Card ---
const QuestMiniCard = React.memo(function QuestMiniCard({ quest }: { quest: Quest }) {
  const completedCount = quest.checkpoints.filter((c) => c.status === 'COMPLETED').length;
  const totalCount = quest.checkpoints.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  return (
    <Card style={styles.questCard}>
      <View style={styles.questCardHeader}>
        <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLORS[quest.grade] ?? Colors.GRADE_E }]}>
          <Text style={styles.gradeText}>{quest.grade}</Text>
        </View>
        <Text style={styles.questTitle} numberOfLines={1}>
          {quest.questTitle}
        </Text>
      </View>
      <ProgressBar progress={progress} color={Colors.SECONDARY} height={4} style={styles.questProgress} />
      <Text style={styles.questSubtext}>
        {completedCount}/{totalCount} 체크포인트
      </Text>
    </Card>
  );
});

// --- Styles ---
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },

  // --- Status Bar ---
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 2,
    borderColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.PRIMARY,
  },
  levelBadge: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  levelText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XS,
    color: Colors.PRIMARY,
  },
  statusCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  expBar: {
    marginBottom: 2,
  },
  expText: {
    fontFamily: Fonts.REGULAR,
    fontSize: 9,
    color: Colors.TEXT_MUTED,
    textAlign: 'right',
  },
  statusRight: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.BG_CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherEmoji: {
    fontSize: 18,
  },

  // --- Timeline Area ---
  timelineArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  // --- Action Area ---
  actionArea: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  questFlatList: {
    marginBottom: 16,
  },
  questList: {
    gap: 10,
    paddingRight: 16,
  },
  questCard: {
    width: 180,
    padding: 12,
  },
  questCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  gradeBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XS,
    color: Colors.TEXT_PRIMARY,
  },
  questTitle: {
    flex: 1,
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_PRIMARY,
  },
  questProgress: {
    marginBottom: 4,
  },
  questSubtext: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  emptyCard: {
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 20,
  },
  emptyText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 4,
  },
  emptySubtext: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },

  // --- Buttons ---
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 4,
  },
  sideBtn: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: Colors.BG_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  sideBtnEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  sideBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XS,
    color: Colors.TEXT_SECONDARY,
  },
  mainBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  mainBtnEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  mainBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_PRIMARY,
  },
});
