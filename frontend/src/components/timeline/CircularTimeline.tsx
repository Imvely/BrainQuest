import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Path,
  G,
  Text as SvgText,
  Line,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TimeBlock, BlockCategory } from '../../types/timeline';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

// --- Constants ---
const SIZE = 300;
const CX = 150;
const CY = 150;
const R = 120;
const STROKE_W = 24;
const POINTER_R = 6;
const TOTAL_MIN = 1440; // 24h

const CATEGORY_COLORS: Record<BlockCategory, string> = {
  WORK: Colors.CATEGORY_WORK,
  HOME: Colors.CATEGORY_HOME,
  HEALTH: Colors.CATEGORY_HEALTH,
  SOCIAL: Colors.CATEGORY_SOCIAL,
  REST: Colors.CATEGORY_REST,
  CUSTOM: Colors.CATEGORY_CUSTOM,
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- Helpers ---

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

function minToAngle(min: number): number {
  return (min / TOTAL_MIN) * 360 - 90;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function polarToXY(angleDeg: number, r: number = R): { x: number; y: number } {
  const rad = degToRad(angleDeg);
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** Build an SVG arc path on the circle from startMin to endMin */
function arcPath(startMin: number, endMin: number, radius: number = R): string {
  if (endMin <= startMin) return '';
  const a1 = minToAngle(startMin);
  const a2 = minToAngle(endMin);
  const start = polarToXY(a1, radius);
  const end = polarToXY(a2, radius);
  const sweep = a2 - a1;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Detect which block or gap was tapped based on angle */
function angleToMin(angleDeg: number): number {
  // Reverse of minToAngle: min = (angleDeg + 90) / 360 * 1440
  let min = ((angleDeg + 90) / 360) * TOTAL_MIN;
  if (min < 0) min += TOTAL_MIN;
  return Math.round(min) % TOTAL_MIN;
}

// --- Hour tick marks ---
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21];
const HOUR_LABELS: Record<number, string> = {
  0: '0',
  3: '3',
  6: '6',
  9: '9',
  12: '12',
  15: '15',
  18: '18',
  21: '21',
};

// --- Props ---
interface CircularTimelineProps {
  blocks: TimeBlock[];
  wakeTime: string;  // "HH:mm"
  sleepTime: string; // "HH:mm"
  remainingMin: number;
  nextBlockTitle?: string;
  nextBlockMin?: number;
  onBlockPress: (block: TimeBlock) => void;
  onGapPress: (startTime: string, endTime: string) => void;
}

export default function CircularTimeline({
  blocks,
  wakeTime,
  sleepTime,
  remainingMin,
  nextBlockTitle,
  nextBlockMin,
  onBlockPress,
  onGapPress,
}: CircularTimelineProps) {
  const wakeMin = timeToMin(wakeTime);
  const sleepMin = timeToMin(sleepTime);

  // Current time pointer animation
  const now = new Date();
  const currentMin = now.getHours() * 60 + now.getMinutes();
  const pointerAngle = useSharedValue(minToAngle(currentMin));

  useEffect(() => {
    const update = () => {
      const n = new Date();
      const min = n.getHours() * 60 + n.getMinutes();
      pointerAngle.value = withTiming(minToAngle(min), {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [pointerAngle]);

  const animatedPointerProps = useAnimatedProps(() => {
    const rad = (pointerAngle.value * Math.PI) / 180;
    return {
      cx: CX + R * Math.cos(rad),
      cy: CY + R * Math.sin(rad),
    };
  });

  // Sort blocks by start time
  const safeBlocks = Array.isArray(blocks) ? blocks : [];
  const sortedBlocks = useMemo(
    () => [...safeBlocks].sort((a, b) => timeToMin(a.startTime) - timeToMin(b.startTime)),
    [safeBlocks],
  );

  // Active zone arc (wake → sleep)
  const activeArc = useMemo(() => arcPath(wakeMin, sleepMin), [wakeMin, sleepMin]);

  // Elapsed overlay arc (wake → now, only if now > wake)
  const elapsedArc = useMemo(() => {
    if (currentMin <= wakeMin) return '';
    const end = Math.min(currentMin, sleepMin);
    return arcPath(wakeMin, end);
  }, [wakeMin, sleepMin, currentMin]);

  // Remaining time display
  const remainH = Math.floor(remainingMin / 60);
  const remainM = remainingMin % 60;
  const remainText = `${remainH}h ${String(remainM).padStart(2, '0')}m`;

  // Handle tap on SVG area
  const handlePress = useCallback(
    (evt: { nativeEvent: { locationX: number; locationY: number } }) => {
      const { locationX, locationY } = evt.nativeEvent;
      const dx = locationX - CX;
      const dy = locationY - CY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only respond to taps near the ring
      if (dist < R - STROKE_W || dist > R + STROKE_W) return;

      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      const tappedMin = angleToMin(angleDeg);

      // Check if tapped on a block
      for (const block of sortedBlocks) {
        const bStart = timeToMin(block.startTime);
        const bEnd = timeToMin(block.endTime);
        if (tappedMin >= bStart && tappedMin < bEnd) {
          onBlockPress(block);
          return;
        }
      }

      // Tapped on a gap — find surrounding bounds
      const gapStart = findGapStart(tappedMin, sortedBlocks, wakeMin);
      const gapEnd = findGapEnd(tappedMin, sortedBlocks, sleepMin);
      const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      onGapPress(fmt(gapStart), fmt(gapEnd));
    },
    [sortedBlocks, wakeMin, sleepMin, onBlockPress, onGapPress],
  );

  return (
    <View style={styles.container} onTouchEnd={handlePress}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Background ring */}
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={Colors.BG_SECONDARY}
          strokeWidth={STROKE_W}
        />

        {/* Active zone (wake → sleep) */}
        {activeArc ? (
          <Path
            d={activeArc}
            fill="none"
            stroke={Colors.BG_INPUT}
            strokeWidth={STROKE_W}
            strokeLinecap="butt"
          />
        ) : null}

        {/* Elapsed overlay (wake → now) - darker */}
        {elapsedArc ? (
          <Path
            d={elapsedArc}
            fill="none"
            stroke="rgba(15, 10, 42, 0.5)"
            strokeWidth={STROKE_W}
            strokeLinecap="butt"
          />
        ) : null}

        {/* Time block arcs */}
        {sortedBlocks.map((block) => {
          const bStart = timeToMin(block.startTime);
          const bEnd = timeToMin(block.endTime);
          const d = arcPath(bStart, bEnd);
          if (!d) return null;
          const color = CATEGORY_COLORS[block.category] || CATEGORY_COLORS.CUSTOM;
          const opacity =
            block.status === 'COMPLETED'
              ? 1.0
              : block.status === 'IN_PROGRESS'
                ? 0.85
                : 0.5;
          return (
            <Path
              key={block.id}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={STROKE_W - 2}
              strokeLinecap="butt"
              opacity={opacity}
            />
          );
        })}

        {/* Hour tick marks & labels */}
        {HOUR_TICKS.map((h) => {
          const angle = minToAngle(h * 60);
          const inner = polarToXY(angle, R + STROKE_W / 2 + 2);
          const outer = polarToXY(angle, R + STROKE_W / 2 + 8);
          const labelPos = polarToXY(angle, R + STROKE_W / 2 + 18);
          return (
            <G key={h}>
              <Line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke={Colors.TEXT_MUTED}
                strokeWidth={1}
              />
              <SvgText
                x={labelPos.x}
                y={labelPos.y}
                fill={Colors.TEXT_MUTED}
                fontSize={9}
                fontFamily={Fonts.REGULAR}
                textAnchor="middle"
                alignmentBaseline="central"
              >
                {HOUR_LABELS[h]}
              </SvgText>
            </G>
          );
        })}

        {/* Current time pointer */}
        <AnimatedCircle
          animatedProps={animatedPointerProps}
          r={POINTER_R}
          fill={Colors.SECONDARY}
          stroke={Colors.TEXT_PRIMARY}
          strokeWidth={2}
        />

        {/* Center text: remaining time */}
        <SvgText
          x={CX}
          y={CY - 8}
          fill={Colors.TEXT_PRIMARY}
          fontSize={28}
          fontFamily={Fonts.BOLD}
          textAnchor="middle"
          alignmentBaseline="central"
        >
          {remainText}
        </SvgText>

        {/* Center sub text: next block countdown */}
        {nextBlockTitle ? (
          <SvgText
            x={CX}
            y={CY + 20}
            fill={Colors.TEXT_SECONDARY}
            fontSize={11}
            fontFamily={Fonts.REGULAR}
            textAnchor="middle"
          >
            {nextBlockMin != null && nextBlockMin > 0
              ? `${nextBlockTitle} (${nextBlockMin}분 후)`
              : nextBlockTitle}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}

function findGapStart(tappedMin: number, sorted: TimeBlock[], wakeMin: number): number {
  let start = wakeMin;
  for (const b of sorted) {
    const bEnd = timeToMin(b.endTime);
    const bStart = timeToMin(b.startTime);
    if (bStart > tappedMin) break;
    if (bEnd <= tappedMin) start = bEnd;
  }
  return start;
}

function findGapEnd(tappedMin: number, sorted: TimeBlock[], sleepMin: number): number {
  for (const b of sorted) {
    const bStart = timeToMin(b.startTime);
    if (bStart > tappedMin) return bStart;
  }
  return sleepMin;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
