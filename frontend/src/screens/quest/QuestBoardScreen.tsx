import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { Quest, QuestCategory } from '../../types/quest';
import { QuestStackParamList } from '../../navigation/MainTab';
import { useQuests } from '../../hooks/useQuests';
import QuestCard from '../../components/quest/QuestCard';
import Card from '../../components/common/Card';

// Card height (padding 16*2 + row ~40 + gap) ≈ 90px + marginBottom 10
const QUEST_CARD_HEIGHT = 100;

type Navigation = StackNavigationProp<QuestStackParamList, 'QuestBoard'>;

const CATEGORIES: { key: QuestCategory | 'ALL'; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'WORK', label: '업무' },
  { key: 'HOME', label: '가사' },
  { key: 'HEALTH', label: '건강' },
  { key: 'SOCIAL', label: '사회' },
  { key: 'SELF', label: '자기관리' },
];

export default function QuestBoardScreen() {
  const navigation = useNavigation<Navigation>();
  const [selectedCategory, setSelectedCategory] = useState<QuestCategory | 'ALL'>('ALL');

  const queryCategory = selectedCategory === 'ALL' ? undefined : selectedCategory;
  const { data, isLoading, refetch } = useQuests({ category: queryCategory });

  // 백엔드 getQuests는 배열을 직접 반환 (이전: PageResponse.content)
  const quests = useMemo(() => data ?? [], [data]);

  // Sort: urgent first, then E-grade highlighted, then by createdAt
  const sortedQuests = useMemo(() => {
    return [...quests].sort((a, b) => {
      // Completed goes last
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (b.status === 'COMPLETED' && a.status !== 'COMPLETED') return -1;
      // Urgent (due within 24h) first
      const aUrgent = a.dueDate && new Date(a.dueDate).getTime() - Date.now() < 86400000 && new Date(a.dueDate).getTime() > Date.now();
      const bUrgent = b.dueDate && new Date(b.dueDate).getTime() - Date.now() < 86400000 && new Date(b.dueDate).getTime() > Date.now();
      if (aUrgent && !bUrgent) return -1;
      if (bUrgent && !aUrgent) return 1;
      // E-grade first (easiest to start)
      if (a.grade === 'E' && b.grade !== 'E') return -1;
      if (b.grade === 'E' && a.grade !== 'E') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [quests]);

  const hasEGrade = sortedQuests.some((q) => q.grade === 'E' && q.status !== 'COMPLETED');

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleQuestPress = useCallback(
    (quest: Quest) => {
      navigation.navigate('QuestDetail', { questId: quest.id });
    },
    [navigation],
  );

  const renderQuest = useCallback(
    ({ item }: { item: Quest }) => <QuestCard quest={item} onPress={handleQuestPress} />,
    [handleQuestPress],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>퀘스트 보드</Text>
          <Text style={styles.headerCount}>
            {quests.filter((q) => q.status !== 'COMPLETED').length}개 진행중
          </Text>
        </View>

        {/* Category filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setSelectedCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* AI recommendation banner */}
        {hasEGrade && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              E급 슬라임 퀘스트부터 시작하세요
            </Text>
          </View>
        )}

        {/* Quest list */}
        {isLoading && quests.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={Colors.PRIMARY} />
          </View>
        ) : quests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>{'⚔️'}</Text>
            <Text style={styles.emptyTitle}>모험이 기다리고 있어요!</Text>
            <Text style={styles.emptyDesc}>할 일을 RPG 퀘스트로 바꿔보세요</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('QuestCreate')}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyBtnText}>첫 퀘스트 만들기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={sortedQuests}
            renderItem={renderQuest}
            keyExtractor={(item) => String(item.id)}
            getItemLayout={(_, index) => ({
              length: QUEST_CARD_HEIGHT,
              offset: QUEST_CARD_HEIGHT * index,
              index,
            })}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.PRIMARY}
                colors={[Colors.PRIMARY]}
              />
            }
          />
        )}

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('QuestCreate')}
          activeOpacity={0.7}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.BG_PRIMARY,
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XXL,
    color: Colors.TEXT_PRIMARY,
  },
  headerCount: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
  },

  // Chips
  chipScroll: {
    maxHeight: 44,
    marginBottom: 8,
  },
  chipRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  chipActive: {
    backgroundColor: Colors.PRIMARY,
    borderColor: Colors.PRIMARY,
  },
  chipText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.TEXT_SECONDARY,
  },
  chipTextActive: {
    color: Colors.TEXT_PRIMARY,
  },

  // Banner
  banner: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: Colors.BG_CARD,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.SECONDARY,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bannerText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.SM,
    color: Colors.SECONDARY,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // Loading / Empty
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
    marginBottom: 8,
  },
  emptyDesc: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: Colors.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_PRIMARY,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
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
    lineHeight: 30,
  },
});
