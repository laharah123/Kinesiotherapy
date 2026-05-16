import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

interface PainChartProps {
  /** 7 pain values (0–5 scale), oldest first */
  data: number[];
  maxValue?: number;
  height?: number;
  showTrend?: boolean;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function PainChart({ data, maxValue = 5, height = 140, showTrend = true }: PainChartProps) {
  const values = data.slice(-7).concat(
    Array(Math.max(0, 7 - data.length)).fill(0),
  );

  const first = values[0];
  const last  = values[values.length - 1];
  const delta = first > 0 ? ((first - last) / first) * 100 : 0;
  const improved = delta > 0;

  return (
    <View>
      {showTrend && (
        <View style={styles.header}>
          <Text style={styles.trendLabel}>Pain level</Text>
          {delta !== 0 && (
            <Text style={[styles.trendBadge, improved ? styles.trendGood : styles.trendBad]}>
              {improved ? '↓' : '↑'} {Math.abs(Math.round(delta))}%
            </Text>
          )}
        </View>
      )}
      <Bars values={values} maxValue={maxValue} height={height}/>
    </View>
  );
}

function Bars({ values, maxValue, height }: { values: number[]; maxValue: number; height: number }) {
  const chartH   = height - 24;  // reserve 24 px for day labels
  const barCount = values.length;
  const lastIdx  = barCount - 1;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${barCount * 40} ${height}`}>
      {values.map((v, i) => {
        const barH   = Math.max(4, (v / maxValue) * chartH);
        const barX   = i * 40 + 8;
        const barY   = chartH - barH;
        const isLast = i === lastIdx;
        const fill   = isLast ? COLORS.clay : COLORS.claySoft2;

        return (
          <React.Fragment key={i}>
            <Rect
              x={barX} y={barY}
              width={24} height={barH}
              rx={6}
              fill={fill}
            />
            <SvgText
              x={barX + 12} y={height - 4}
              textAnchor="middle"
              fontSize="10"
              fontFamily={FONTS.sans}
              fill={COLORS.ink3}
            >
              {DAY_LABELS[i]}
            </SvgText>
          </React.Fragment>
        );
      })}
      {/* baseline */}
      <Line
        x1="0" y1={chartH}
        x2={barCount * 40} y2={chartH}
        stroke={COLORS.borderSoft} strokeWidth="1"
      />
    </Svg>
  );
}

// ─── Region progress bar (used on Progress screen body heatmap) ───────────────

interface RegionBarProps {
  name: string;
  pct: number;
  color?: string;
}

export function RegionBar({ name, pct, color = COLORS.clay }: RegionBarProps) {
  return (
    <View style={styles.regionRow}>
      <View style={styles.regionHeader}>
        <Text style={styles.regionName}>{name}</Text>
        <Text style={styles.regionPct}>{pct}%</Text>
      </View>
      <View style={styles.regionTrack}>
        <View style={[styles.regionFill, { width: `${pct}%` as any, backgroundColor: color }]}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendLabel: {
    fontFamily: FONTS.sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: COLORS.ink3,
  },
  trendBadge: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '700',
  },
  trendGood: {
    color: COLORS.sageDeep,
  },
  trendBad: {
    color: COLORS.clay,
  },

  // RegionBar
  regionRow: {
    marginBottom: 10,
  },
  regionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  regionName: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.ink2,
  },
  regionPct: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    color: COLORS.ink3,
  },
  regionTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.borderSoft,
    overflow: 'hidden',
  },
  regionFill: {
    height: '100%',
    borderRadius: 3,
  },
});
