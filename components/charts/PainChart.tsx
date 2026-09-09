import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { COLORS, RADII, TYPE, fontFor } from '@/lib/tokens';

interface PainChartProps {
  /** Up to 7 pain values on the app's 0 to 4 scale, oldest first. */
  data: number[];
  maxValue?: number;
  height?: number;
  showTrend?: boolean;
  /** One label per bar. Defaults to the last 7 local weekday initials. */
  labels?: string[];
}

const BAR_SLOT = 40;
const BAR_W    = 24;
const LABEL_H  = 24;

/** Weekday initials for the last 7 local days, ending today. */
export function recentDayLabels(days = 7, today: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    out.push(d.toLocaleDateString(undefined, { weekday: 'narrow' }));
  }
  return out;
}

export function PainChart({
  data,
  maxValue = 4,
  height = 140,
  showTrend = true,
  labels,
}: PainChartProps) {
  const values = data.slice(-7).concat(
    Array(Math.max(0, 7 - data.length)).fill(0),
  );

  const dayLabels = labels && labels.length >= values.length
    ? labels.slice(0, values.length)
    : recentDayLabels(values.length);

  const first = values[0];
  const last  = values[values.length - 1];
  const delta = first > 0 ? ((first - last) / first) * 100 : 0;
  const improved = delta > 0;
  const isEmpty = values.every((v) => v === 0);

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
      <Bars values={values} maxValue={maxValue} height={height} labels={dayLabels}/>
      {isEmpty && <EmptyChart/>}
    </View>
  );
}

/** Shown when there is no logged pain to plot yet. */
export function EmptyChart() {
  return (
    <Text style={styles.emptyText}>
      No pain logged this week yet. Finish a session to start the chart.
    </Text>
  );
}

function Bars({
  values, maxValue, height, labels,
}: {
  values: number[];
  maxValue: number;
  height: number;
  labels: string[];
}) {
  const chartH   = height - LABEL_H;
  const barCount = values.length;
  const lastIdx  = barCount - 1;
  const safeMax  = maxValue > 0 ? maxValue : 1;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${barCount * BAR_SLOT} ${height}`}>
      {values.map((v, i) => {
        const barX   = i * BAR_SLOT + (BAR_SLOT - BAR_W) / 2;
        const isLast = i === lastIdx;
        const label  = labels[i] ?? '';

        // A day with no logged pain is a gap in the record, not a low score,
        // so it gets a dotted placeholder rather than a readable bar.
        if (v <= 0) {
          return (
            <React.Fragment key={i}>
              <Rect
                x={barX} y={chartH - 10}
                width={BAR_W} height={10}
                rx={5}
                fill="none"
                stroke={COLORS.border}
                strokeWidth="1"
                strokeDasharray="2 3"
              />
              <SvgText
                x={barX + BAR_W / 2} y={height - 4}
                textAnchor="middle"
                fontSize="10"
                fontFamily={fontFor('400')}
                fill={COLORS.ink4}
              >
                {label}
              </SvgText>
            </React.Fragment>
          );
        }

        const barH = Math.max(6, (Math.min(v, safeMax) / safeMax) * chartH);

        return (
          <React.Fragment key={i}>
            <Rect
              x={barX} y={chartH - barH}
              width={BAR_W} height={barH}
              rx={6}
              fill={isLast ? COLORS.clay : COLORS.claySoft2}
            />
            <SvgText
              x={barX + BAR_W / 2} y={height - 4}
              textAnchor="middle"
              fontSize="10"
              fontFamily={fontFor(isLast ? '600' : '400')}
              fill={isLast ? COLORS.ink2 : COLORS.ink3}
            >
              {label}
            </SvgText>
          </React.Fragment>
        );
      })}
      <Line
        x1="0" y1={chartH}
        x2={barCount * BAR_SLOT} y2={chartH}
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
    <View
      style={styles.regionRow}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${name}, ${pct} percent of reported pain`}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
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
    ...TYPE.eyebrow,
    color: COLORS.ink3,
  },
  trendBadge: {
    fontFamily: fontFor('700'),
    fontSize: 12,
  },
  trendGood: {
    color: COLORS.sageDeep,
  },
  trendBad: {
    color: COLORS.clay,
  },
  emptyText: {
    fontFamily: fontFor('400'),
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.ink3,
    marginTop: 10,
    textAlign: 'center',
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
    fontFamily: fontFor('500'),
    fontSize: 12,
    color: COLORS.ink2,
  },
  regionPct: {
    fontFamily: fontFor('400'),
    fontSize: 12,
    color: COLORS.ink3,
  },
  regionTrack: {
    height: 6,
    borderRadius: RADII.r1 / 3,
    backgroundColor: COLORS.borderSoft,
    overflow: 'hidden',
  },
  regionFill: {
    height: '100%',
    borderRadius: RADII.r1 / 3,
  },
});
