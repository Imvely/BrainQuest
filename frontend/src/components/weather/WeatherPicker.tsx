import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { WeatherType, WEATHER_CONFIG } from '../../constants/weather';
import { Colors } from '../../constants/colors';
import { Fonts, FontSize } from '../../constants/fonts';

interface WeatherPickerProps {
  selected: WeatherType | null;
  onSelect: (type: WeatherType) => void;
}

const ROW1: WeatherType[] = ['SUNNY', 'PARTLY_CLOUDY', 'CLOUDY', 'FOG'];
const ROW2: WeatherType[] = ['RAIN', 'THUNDER', 'STORM'];

function WeatherItem({ type, isSelected, onPress }: {
  type: WeatherType;
  isSelected: boolean;
  onPress: () => void;
}) {
  const config = WEATHER_CONFIG[type];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isSelected ? 1.3 : 1) }],
  }));

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.item,
          isSelected && {
            borderColor: Colors.PRIMARY,
            borderWidth: 2,
            backgroundColor: config.bgColor,
          },
          animatedStyle,
        ]}
      >
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={[styles.label, isSelected && styles.labelActive]}>
          {config.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export default memo(function WeatherPicker({ selected, onSelect }: WeatherPickerProps) {
  const handleSelect = (type: WeatherType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(type);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {ROW1.map((type) => (
          <WeatherItem
            key={type}
            type={type}
            isSelected={selected === type}
            onPress={() => handleSelect(type)}
          />
        ))}
      </View>
      <View style={styles.row}>
        {ROW2.map((type) => (
          <WeatherItem
            key={type}
            type={type}
            isSelected={selected === type}
            onPress={() => handleSelect(type)}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  item: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: Colors.BG_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  emoji: {
    fontSize: 28,
  },
  label: {
    fontFamily: Fonts.REGULAR,
    fontSize: FontSize.XS,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  labelActive: {
    color: Colors.TEXT_PRIMARY,
    fontFamily: Fonts.BOLD,
  },
});
