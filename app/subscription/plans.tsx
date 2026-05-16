import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  fetchPackages, purchasePackage, restorePurchases,
  hasActiveEntitlement, type PurchaseResult,
} from '@/lib/revenuecat';
import { useAuthStore } from '@/lib/store/auth';
import { AppBar } from '@/components/ui/AppBar';
import { IconBtn } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, PRICING, RADII } from '@/lib/tokens';

type PlanKey = 'monthly' | 'yearly';

function TrustItem({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={trust.item}>
      <Icon name={icon as any} size={14} color={COLORS.ink3}/>
      <Text style={trust.text}>{label}</Text>
    </View>
  );
}
const trust = StyleSheet.create({
  item: { alignItems: 'center', gap: 4 },
  text: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink3, textAlign: 'center' },
});

export default function PlansScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { setSubscription } = useAuthStore();

  const [selected, setSelected]   = useState<PlanKey>('yearly');
  const [packages, setPackages]   = useState<{ monthly: any; yearly: any }>({ monthly: null, yearly: null });
  const [loading, setLoading]     = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    fetchPackages().then(setPackages).catch(() => {});
  }, []);

  async function handlePurchase() {
    const pkg = selected === 'yearly' ? packages.yearly : packages.monthly;
    setLoading(true); setError(null);
    try {
      if (pkg) {
        const result: PurchaseResult = await purchasePackage(pkg);
        if (result.success) {
          router.replace('/subscription/subscribed');
          return;
        }
        if (!result.cancelled) setError(result.error ?? 'Purchase failed.');
      } else {
        // RevenueCat not configured — dev mode, go straight to subscribed
        router.replace('/subscription/subscribed');
      }
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (hasActiveEntitlement(info)) router.replace('/subscription/subscribed');
    } catch { /* silent */ } finally {
      setRestoring(false);
    }
  }

  const renewalDate = new Date(Date.now() + (selected === 'yearly' ? 365 : 30) * 86_400_000)
    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <AppBar
        left={<IconBtn icon="back" onPress={() => router.back()}/>}
        title="Choose your plan"
        right={
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.restoreText}>{restoring ? 'Restoring…' : 'Restore'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Yearly card */}
        <TouchableOpacity
          style={[styles.planCard, selected === 'yearly' && styles.planCardSelected]}
          onPress={() => setSelected('yearly')}
          activeOpacity={0.8}
        >
          <View style={styles.planTop}>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Yearly</Text>
              <Text style={styles.planSub}>Just $8.33/month</Text>
            </View>
            <View style={styles.planRight}>
              <Tag label="Save 36%" tone="sage"/>
              <Text style={styles.planPrice}>{PRICING.yearly.price}<Text style={styles.planPeriod}>/yr</Text></Text>
            </View>
            <View style={[styles.radio, selected === 'yearly' && styles.radioSelected]}>
              {selected === 'yearly' && <View style={styles.radioDot}/>}
            </View>
          </View>
        </TouchableOpacity>

        {/* Monthly card */}
        <TouchableOpacity
          style={[styles.planCard, selected === 'monthly' && styles.planCardSelected]}
          onPress={() => setSelected('monthly')}
          activeOpacity={0.8}
        >
          <View style={styles.planTop}>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planSub}>Flexible, cancel anytime</Text>
            </View>
            <View style={styles.planRight}>
              <Text style={styles.planPrice}>{PRICING.monthly.price}<Text style={styles.planPeriod}>/mo</Text></Text>
            </View>
            <View style={[styles.radio, selected === 'monthly' && styles.radioSelected]}>
              {selected === 'monthly' && <View style={styles.radioDot}/>}
            </View>
          </View>
        </TouchableOpacity>

        {/* Trust row */}
        <View style={styles.trustRow}>
          <TrustItem icon="check" label={"Cancel\nanytime"}/>
          <TrustItem icon="close" label={"No\nads"}/>
          <TrustItem icon="shield" label={"30-day\nrefund"}/>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <Text style={styles.timelineTitle}>What happens next</Text>
          <View style={styles.timelineRow}>
            <View style={styles.timelineDot}/>
            <View>
              <Text style={styles.timelineLabel}>Today</Text>
              <Text style={styles.timelineDesc}>Full access unlocks immediately</Text>
            </View>
          </View>
          <View style={styles.timelineLine}/>
          <View style={styles.timelineRow}>
            <View style={[styles.timelineDot, styles.timelineDotMuted]}/>
            <View>
              <Text style={[styles.timelineLabel, { color: COLORS.ink3 }]}>{renewalDate}</Text>
              <Text style={styles.timelineDesc}>
                Renews at {selected === 'yearly' ? PRICING.yearly.price : PRICING.monthly.price}
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <Button
          label={`Continue with ${selected === 'yearly' ? 'Yearly' : 'Monthly'}`}
          full
          loading={loading}
          onPress={handlePurchase}
          style={styles.cta}
        />

        <Text style={styles.finePrint}>
          Auto-renews. Cancel any time in your App Store or Play Store settings.
          Prices in USD. By continuing you agree to our Terms of Service.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  restoreText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3 },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  error: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.clay,
    backgroundColor: COLORS.claySoft, borderRadius: RADII.r1,
    padding: 10, marginBottom: 12,
  },

  planCard: {
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 16, marginBottom: 12,
  },
  planCardSelected: { borderColor: COLORS.clay, backgroundColor: COLORS.claySoft },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planInfo: { flex: 1 },
  planName: { fontFamily: FONTS.sans, fontSize: 16, fontWeight: '700', color: COLORS.ink },
  planSub: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3, marginTop: 2 },
  planRight: { alignItems: 'flex-end', gap: 4 },
  planPrice: { fontFamily: FONTS.serif, fontSize: 22, color: COLORS.ink },
  planPeriod: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.clay },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.clay },

  trustRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 20, marginBottom: 4,
  },

  timeline: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 16, marginBottom: 24,
  },
  timelineTitle: {
    fontFamily: FONTS.sans, fontSize: 12, fontWeight: '700', color: COLORS.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: COLORS.clay, marginTop: 3,
  },
  timelineDotMuted: { backgroundColor: COLORS.borderSoft },
  timelineLine: {
    width: 2, height: 20, backgroundColor: COLORS.borderSoft,
    marginLeft: 5, marginVertical: 4,
  },
  timelineLabel: { fontFamily: FONTS.sans, fontSize: 14, fontWeight: '600', color: COLORS.ink },
  timelineDesc: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3, marginTop: 2 },

  cta: { marginBottom: 14 },
  finePrint: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink4,
    textAlign: 'center', lineHeight: 16,
  },
});
