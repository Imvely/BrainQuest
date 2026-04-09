import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';
import { OnboardingStackParamList } from '../../navigation/OnboardingStack';
import { createCharacter } from '../../api/character';
import { useAuthStore } from '../../stores/useAuthStore';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { ClassType } from '../../types/character';

const HAIR_STYLES = [
  { id: 'short_a', label: '숏컷', emoji: '💇' },
  { id: 'short_b', label: '댄디', emoji: '💇‍♂️' },
  { id: 'medium', label: '미디엄', emoji: '🧑' },
  { id: 'long', label: '롱헤어', emoji: '👩‍🦰' },
  { id: 'curly', label: '곱슬', emoji: '🧑‍🦱' },
  { id: 'ponytail', label: '포니테일', emoji: '👧' },
];

const OUTFIT_STYLES = [
  { id: 'armor_light', label: '경갑옷', emoji: '🛡️' },
  { id: 'robe', label: '로브', emoji: '🧙' },
  { id: 'leather', label: '가죽갑옷', emoji: '🏹' },
  { id: 'casual', label: '평상복', emoji: '👕' },
];

const COLOR_OPTIONS = [
  '#6C5CE7',
  '#00CEC9',
  '#FD79A8',
  '#FDCB6E',
  '#00B894',
  '#E17055',
];

export default function CharacterCreateScreen() {
  const navigation = useNavigation<StackNavigationProp<OnboardingStackParamList>>();
  const route = useRoute<RouteProp<OnboardingStackParamList, 'CharacterCreate'>>();
  const classType: ClassType = route.params?.classType ?? 'WARRIOR';

  const { setHasCharacter } = useAuthStore();
  const { setCharacter } = useCharacterStore();

  const [name, setName] = useState('');
  const [selectedHair, setSelectedHair] = useState(HAIR_STYLES[0].id);
  const [selectedOutfit, setSelectedOutfit] = useState(OUTFIT_STYLES[0].id);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(false);

  const CLASS_LABEL: Record<ClassType, string> = {
    WARRIOR: '⚔️ 워리어',
    MAGE: '🔮 메이지',
    RANGER: '🏹 레인저',
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('이름을 입력해주세요');
      return;
    }
    if (trimmed.length > 12) {
      Alert.alert('이름은 12자 이내로 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      const response = await createCharacter({
        name: trimmed,
        classType,
        appearance: {
          hair: selectedHair,
          outfit: selectedOutfit,
          color: selectedColor,
        },
      });
      setCharacter(response.data);
      setHasCharacter(true);
      // RootNavigator will auto-navigate to MainTab
    } catch {
      Alert.alert('생성 실패', '캐릭터 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const selectedHairObj = useMemo(() => HAIR_STYLES.find((h) => h.id === selectedHair), [selectedHair]);
  const selectedOutfitObj = useMemo(() => OUTFIT_STYLES.find((o) => o.id === selectedOutfit), [selectedOutfit]);

  const hairKeyExtractor = useCallback((item: typeof HAIR_STYLES[0]) => item.id, []);
  const outfitKeyExtractor = useCallback((item: typeof OUTFIT_STYLES[0]) => item.id, []);

  const renderHairItem = useCallback(({ item }: { item: typeof HAIR_STYLES[0] }) => (
    <TouchableOpacity
      style={[styles.thumbCard, selectedHair === item.id && { borderColor: selectedColor }]}
      onPress={() => setSelectedHair(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.thumbEmoji}>{item.emoji}</Text>
      <Text style={[styles.thumbLabel, selectedHair === item.id && { color: selectedColor }]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  ), [selectedHair, selectedColor]);

  const renderOutfitItem = useCallback(({ item }: { item: typeof OUTFIT_STYLES[0] }) => (
    <TouchableOpacity
      style={[styles.thumbCard, selectedOutfit === item.id && { borderColor: selectedColor }]}
      onPress={() => setSelectedOutfit(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.thumbEmoji}>{item.emoji}</Text>
      <Text style={[styles.thumbLabel, selectedOutfit === item.id && { color: selectedColor }]}>
        {item.label}
      </Text>
    </TouchableOpacity>
  ), [selectedOutfit, selectedColor]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>캐릭터 생성</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Preview */}
        <View style={[styles.previewCircle, { borderColor: selectedColor }]}>
          <Text style={styles.previewEmoji}>{selectedHairObj?.emoji}</Text>
          <Text style={styles.previewEmoji}>{selectedOutfitObj?.emoji}</Text>
        </View>
        <Text style={[styles.previewClass, { color: selectedColor }]}>{CLASS_LABEL[classType]}</Text>

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>이름</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="모험가의 이름 (최대 12자)"
            placeholderTextColor={Colors.TEXT_MUTED}
            maxLength={12}
          />
          <Text style={styles.charCount}>{name.length}/12</Text>
        </View>

        {/* Hair Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>헤어 스타일</Text>
          <FlatList
            data={HAIR_STYLES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={hairKeyExtractor}
            renderItem={renderHairItem}
            contentContainerStyle={styles.thumbList}
          />
        </View>

        {/* Outfit Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>의상</Text>
          <FlatList
            data={OUTFIT_STYLES}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={outfitKeyExtractor}
            renderItem={renderOutfitItem}
            contentContainerStyle={styles.thumbList}
          />
        </View>

        {/* Color Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>색상 테마</Text>
          <View style={styles.colorRow}>
            {COLOR_OPTIONS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorCircleSelected,
                ]}
                onPress={() => setSelectedColor(color)}
                activeOpacity={0.7}
              />
            ))}
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: selectedColor }]}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color={Colors.TEXT_PRIMARY} />
          ) : (
            <Text style={styles.createButtonText}>모험 시작!</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  content: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },

  // Preview
  previewCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    backgroundColor: Colors.BG_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 4,
  },
  previewEmoji: {
    fontSize: 32,
  },
  previewClass: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.LG,
    marginBottom: 24,
  },

  // Sections
  section: {
    width: '100%',
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 10,
  },

  // Name Input
  nameInput: {
    backgroundColor: Colors.BG_INPUT,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.LG,
    color: Colors.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  charCount: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.SM,
    color: Colors.TEXT_MUTED,
    textAlign: 'right',
    marginTop: 4,
  },

  // Thumbnails
  thumbList: {
    gap: 10,
  },
  thumbCard: {
    backgroundColor: Colors.BG_CARD,
    borderRadius: 12,
    width: 72,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.BORDER,
  },
  thumbEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  thumbLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },

  // Colors
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: Colors.TEXT_PRIMARY,
    transform: [{ scale: 1.15 }],
  },

  // Create
  createButton: {
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  createButtonText: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XL,
    color: Colors.TEXT_PRIMARY,
  },
});
