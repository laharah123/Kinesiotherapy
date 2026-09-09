import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, G } from 'react-native-svg';

import { useAccess } from '@/lib/access';
import { useProgressStore } from '@/lib/store/progress';
import {
  restorePurchases, hasActiveEntitlement, applyCustomerInfoToStore, STORE_NAME,
} from '@/lib/revenuecat';
import { AppBar } from '@/components/ui/AppBar';
import { IconBtn } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, PRICING, RADII, fontFor } from '@/lib/tokens';
import type { IconName } from '@/lib/tokens';

/** Only things the app actually does. No therapist, no messaging, no refund. */
const FEATURES: { icon: IconName; label: string }[] = [
  { icon: 'plan',     label: 'Guided sessions whenever you need them' },
  { icon: 'bolt',     label: 'A plan that adapts to the pain you log' },
  { icon: 'progress', label: 'Your full progress history and trends' },
  { icon: 'calendar', label: 'Streaks and weekly summaries' },
];

function SparkleIcon({ size = 48 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="22" fill={COLORS.claySoft} stroke={COLORS.claySoft2} strokeWidth="1.5"/>
      <Circle cx="24" cy="24" r="14" fill={COLORS.claySoft2}/>
      <G>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r   = deg % 90 === 0 ? 10 : 7;
          const rad = (deg * Math.PI) / 180;
          const cx  = 24 + r * Math.cos(rad);
          const cy  = 24 + r * Math.sin(rad);
          return (
            <Circle
              key={deg}
              cx={cx}
              cy={cy}
              r={deg % 90 === 0 ? 2.5 : 1.5}
              fill={COLORS.clay}
            />
          );
        })}
      </G>
      <Circle cx="24" cy="24" r="4" fill={COLORS.clay}/>
    </Svg>
  );
}

/** First vs latest logged session pain. Null when there is nothing real to show. */
function usePainLine(): { text: string; improved: boolean } | null {
  const weeklyPain = useProgressStore((s) => s.weeklyPain);

  return useMemo(() => {
    // Zero means "no session logged that day", not "no pain".
    const logged = weeklyPain.filter((v) => v > 0);
    if (logged.length < 2) return null;

    const first = logged[0];
    const last  = logged[logged.length - 1];
    const fmt   = (n: number) => n.toFixed(1);

    if (last === first) {
      return { text: `Pain steady at ${fmt(last)} across your logged sessions`, improved: false };
    }
    return {
      text: `Pain ${fmt(first)} to ${fmt(last)} from your first to your latest session`,
      improved: last < first,
    };
  }, [weeklyPain]);
}

export default function TrialEndScreen() {
  const router = useRouter();
  const access = useAccess();
  const painLine = usePainLine();
  const [restoring, setRestoring] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);

  function dismiss() {
    if (router.canGoBack?.()) router.back();
    else router.replace('/(main)');
  }

  async function handleRestore() {
    setRestoring(true);
    setRestoreNote(null);
    try {
      const info = await restorePurchases();
      if (hasActiveEntitlement(info)) {
        applyCustomerInfoToStore(info);
        router.replace('/subscription/subscribed');
        return;
      }
      setRestoreNote(`No subscription to restore on this ${STORE_NAME} account.`);
    } finally {
      setRestoring(false);
    }
  }

  const dayNumber = PRICING.trialDays + 1 - access.trialDaysLeft;
  const eyebrow =
    access.state === 'trial'
      ? `Day ${dayNumber} of ${PRICING.trialDays} of your free trial`
      : access.state === 'limited'
        ? 'Your free trial has ended'
        : 'Full access';

  const headline =
    access.state === 'trial' ? 'Your trial ends soon.' : 'Keep your sessions going.';

  return (
    <View style={styles.root}>
      <AppBar
        left={<IconBtn icon="close" onPress={dismiss}/>}
        right={
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.restoreText}>{restoring ? 'Restoring...' : 'Restore'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Icon rings */}
        <View style={styles.iconWrap}>
          <View style={[styles.ring, styles.ring3]}/>
          <View style={[styles.ring, styles.ring2]}/>
          <View style={[styles.ring, styles.ring1]}/>
          <View style={styles.iconCenter}>
            <SparkleIcon size={48}/>
          </View>
        </View>

        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.headline}>{headline}</Text>

        {painLine && (
          <View style={[styles.statPill, painLine.improved ? styles.statPillGood : styles.statPillFlat]}>
            <Text style={[styles.statText, painLine.improved ? styles.statTextGood : styles.statTextFlat]}>
              {painLine.text}
            </Text>
          </View>
        )}

        {restoreNote && <Text style={styles.note}>{restoreNote}</Text>}

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>What a subscription includes</Text>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon} size={16} color={COLORS.clay}/>
              </View>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Button
          label="Choose a plan"
          full
          onPress={() => router.push('/subscription/plans')}
          icon="arrowRight"
          iconPosition="right"
          style={styles.ctaBtn}
        />

        <TouchableOpacity style={styles.limitLink} onPress={dismiss}>
          <Text style={styles.limitText}>Not now</Text>
        </TouchableOpacity>
        <Text style={styles.limitHint}>
          You keep your plan and your past progress. Starting a new guided session
          needs a subscription.
        </Text>
        <Text style={styles.finePrint}>Cancel any time in your {STORE_NAME} settings.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  restoreText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3 },

  scroll: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 48 },

  iconWrap: {
    width: 140, height: 140, alignItems: 'center', justifyContent: 'center',
    marginTop: 16, marginBottom: 24, position: 'relative',
  },
  ring: {
    position: 'absolute', borderRadius: 999,
    borderWidth: 1, borderColor: COLORS.claySoft2,
  },
  ring1: { width: 64,  height: 64  },
  ring2: { width: 96,  height: 96  },
  ring3: { width: 128, height: 128 },
  iconCenter: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.claySoft,
    alignItems: 'center', justifyContent: 'center',
  },

  eyebrow: {
    fontFamily: fontFor('700'), fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 8, textAlign: 'center' },
  headline: {
    fontFamily: FONTS.serif, fontSize: 30, color: COLORS.ink,
    textAlign: 'center', marginBottom: 16,
  },

  statPill: {
    borderRadius: RADII.r4,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 28,
  },
  statPillGood: { backgroundColor: COLORS.sageSoft },
  statPillFlat: { backgroundColor: COLORS.surface2 },
  statText: { fontFamily: fontFor('600'), fontSize: 13, textAlign: 'center' },
  statTextGood: { color: COLORS.sageDeep },
  statTextFlat: { color: COLORS.ink2 },

  note: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3,
    textAlign: 'center', marginBottom: 16,
  },

  featuresCard: {
    width: '100%', backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 16, marginBottom: 24, gap: 14,
  },
  featuresTitle: {
    fontFamily: fontFor('700'), fontSize: 13, color: COLORS.ink, marginBottom: 4 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.claySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink2, flex: 1 },

  ctaBtn: { marginBottom: 8 },
  limitLink: { paddingVertical: 12 },
  limitText: { fontFamily: fontFor('600'), fontSize: 14, color: COLORS.ink2 },
  limitHint: {
    fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3,
    textAlign: 'center', lineHeight: 18, marginBottom: 12,
  },
  finePrint: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink4, textAlign: 'center',
  },
});
