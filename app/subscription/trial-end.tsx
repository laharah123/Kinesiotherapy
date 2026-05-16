import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useAuthStore } from '@/lib/store/auth';
import { restorePurchases, hasActiveEntitlement } from '@/lib/revenuecat';
import { AppBar } from '@/components/ui/AppBar';
import { IconBtn } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

const FEATURES = [
  { icon: 'plan',     label: 'Unlimited exercise plans' },
  { icon: 'bolt',     label: 'Adaptive sessions that evolve with you' },
  { icon: 'shield',   label: 'Therapist messaging' },
  { icon: 'progress', label: 'Long-term progress tracking' },
];

function SparkleIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 48 48">
      <Circle cx="24" cy="24" r="22" fill={COLORS.claySoft} stroke={COLORS.claySoft2} strokeWidth="1.5"/>
      <Circle cx="24" cy="24" r="14" fill={COLORS.claySoft2}/>
      {/* sparkle paths */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const r   = deg % 90 === 0 ? 10 : 7;
        const rad = (deg * Math.PI) / 180;
        const x2  = 24 + r * Math.cos(rad);
        const y2  = 24 + r * Math.sin(rad);
        return (
          <Svg key={i}>
            <Circle cx={x2} cy={y2} r={deg % 90 === 0 ? 2.5 : 1.5} fill={COLORS.clay}/>
          </Svg>
        );
      })}
      <Circle cx="24" cy="24" r="4" fill={COLORS.clay}/>
    </Svg>
  );
}

export default function TrialEndScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { trialDaysLeft, weeklyPainDrop, subscription } = useAuthStore() as any;
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (hasActiveEntitlement(info)) {
        router.replace('/subscription/subscribed');
      }
    } catch { /* silent */ } finally {
      setRestoring(false);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AppBar
        left={<IconBtn icon="close" onPress={() => router.back()}/>}
        right={
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.restoreText}>{restoring ? 'Restoring…' : 'Restore'}</Text>
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
            <Icon name="sparkle" size={28} color={COLORS.clay}/>
          </View>
        </View>

        <Text style={styles.eyebrow}>Day 7 of 7 · trial ending</Text>
        <Text style={styles.headline}>You're moving beautifully.</Text>

        {/* Pain drop stat */}
        <View style={styles.statPill}>
          <Text style={styles.statText}>↓ Pain reduced since you started</Text>
        </View>

        {/* Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Everything in full access</Text>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Icon name={f.icon as any} size={16} color={COLORS.clay}/>
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

        <TouchableOpacity
          style={styles.limitLink}
          onPress={() => router.back()}
        >
          <Text style={styles.limitText}>Continue with limits</Text>
        </TouchableOpacity>
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
    fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3, marginBottom: 8,
  },
  headline: {
    fontFamily: FONTS.serif, fontSize: 30, color: COLORS.ink,
    textAlign: 'center', marginBottom: 16,
  },

  statPill: {
    backgroundColor: COLORS.sageSoft, borderRadius: RADII.r4,
    paddingHorizontal: 16, paddingVertical: 8, marginBottom: 28,
  },
  statText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.sageDeep, fontWeight: '600' },

  featuresCard: {
    width: '100%', backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 16, marginBottom: 24, gap: 14,
  },
  featuresTitle: {
    fontFamily: FONTS.sans, fontSize: 13, fontWeight: '700', color: COLORS.ink, marginBottom: 4,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: COLORS.claySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  featureLabel: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink2 },

  ctaBtn: { marginBottom: 16 },
  limitLink: { paddingVertical: 12 },
  limitText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3 },
});
