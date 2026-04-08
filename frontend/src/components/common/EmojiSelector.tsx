import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

interface EmojiOption {
  value: number;
  emoji: string;
  label: string;
}

interface EmojiSelectorProps {
  options: EmojiOption[];
  selected: number | null;
  onSelect: (value: number) => void;
  label?: string;
}

export default memo(function EmojiSelector({ options, selected, onSelect, label }: EmojiSelectorProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, selected === opt.value && styles.selectedOption]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{opt.emoji}</Text>
            <Text style={[styles.optionLabel, selected === opt.value && styles.selectedLabel]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.MD,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  option: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 56,
    minHeight: 44,
    justifyContent: 'center',
  },
  selectedOption: {
    backgroundColor: Colors.BG_CARD,
    borderWidth: 1,
    borderColor: Colors.PRIMARY,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  optionLabel: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_MUTED,
  },
  selectedLabel: {
    color: Colors.PRIMARY,
  },
});
