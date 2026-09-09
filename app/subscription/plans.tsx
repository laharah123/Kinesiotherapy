import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { PRIVACY_URL, TERMS_URL } from '@/lib/plans/links';
import { useRouter } from 'expo-router';

import {
  fetchPackages, purchasePackage, restorePurchases,
  hasActiveEntitlement, applyCustomerInfoToStore, isPurchasesConfigured,
  STORE_NAME, type Packages, type PurchaseResult,
} from '@/lib/revenuecat';
import { useAuthStore } from '@/lib/store/auth';
import { AppBar } from '@/components/ui/AppBar';
import { IconBtn } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, PRICING, RADII, fontFor } from '@/lib/tokens';
import type { IconName } from '@/lib/tokens';

type PlanKey = 'monthly' | 'yearly';
type LoadState = 'loading' | 'ready' | 'unavailable';

function TrustItem({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={trust.item}>
      <Icon name={icon} size={14} color={COLORS.ink3}/>
      <Text style={trust.text}>{label}</Text>
    </View>
  );
}
const trust = StyleSheet.create({
  item: { alignItems: 'center', gap: 4, flex: 1 },
  text: { fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink3, textAlign: 'center' },
});

export default function PlansScreen() {
  const router = useRouter();
  const setSubscription = useAuthStore((s) => s.setSubscription);

  const [selected, setSelected]   = useState<PlanKey>('yearly');
  const [packages, setPackages]   = useState<Packages>({ monthly: null, yearly: null });
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loading, setLoading]     = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [note, setNote]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadState('loading');
    const pkgs = await fetchPackages();
    setPackages(pkgs);
    setLoadState(pkgs.monthly || pkgs.yearly ? 'ready' : 'unavailable');
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handlePurchase() {
    const pkg = selected === 'yearly' ? packages.yearly : packages.monthly;
    // No package means no way to charge anyone. Never unlock on this path.
    if (!pkg) {
      setError('Purchases are not available right now.');
      return;
    }

    setLoading(true);
    setError(null);
    setNote(null);
    try {
      const result: PurchaseResult = await purchasePackage(pkg);
      if (result.success) {
        // Unlock the UI now; the RevenueCat webhook writes the database row.
        applyCustomerInfoToStore(result.customerInfo);
        router.replace('/subscription/subscribed');
        return;
      }
      if (result.cancelled) {
        setNote('Purchase cancelled. Nothing was charged.');
        return;
      }
      setError(result.error ?? 'Purchase failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore() {
    setRestoring(true);
    setError(null);
    setNote(null);
    try {
      const info = await restorePurchases();
      if (hasActiveEntitlement(info)) {
        applyCustomerInfoToStore(info);
        router.replace('/subscription/subscribed');
        return;
      }
      setNote(`No subscription to restore on this ${STORE_NAME} account.`);
    } finally {
      setRestoring(false);
    }
  }

  /** Dev only: unlocks the local UI without any purchase. Never ships enabled. */
  function simulatePurchase() {
    setSubscription({
      id: 'dev-simulated',
      planType: selected,
      status: 'active',
      trialEndsAt: null,
      currentPeriodEnds: new Date(
        Date.now() + (selected === 'yearly' ? 365 : 30) * 86_400_000,
      ).toISOString(),
    });
    router.replace('/subscription/subscribed');
  }

  const yearlyPrice  = packages.yearly?.product.priceString  ?? PRICING.yearly.price;
  const monthlyPrice = packages.monthly?.product.priceString ?? PRICING.monthly.price;
  const selectedPrice = selected === 'yearly' ? yearlyPrice : monthlyPrice;

  // Only claim a saving we can actually compute from the prices on screen.
  const savingsPct = (() => {
    const monthly = packages.monthly?.product.price;
    const yearly  = packages.yearly?.product.price;
    if (monthly && yearly) {
      const pct = Math.round((1 - yearly / (monthly * 12)) * 100);
      return pct > 0 ? pct : null;
    }
    if (packages.monthly || packages.yearly) return null;   // store prices, one side missing
    return 36;                                              // the fallback PRICING pair
  })();

  const renewalDate = new Date(Date.now() + (selected === 'yearly' ? 365 : 30) * 86_400_000)
    .toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  const unavailable = loadState === 'unavailable';

  return (
    <View style={styles.root}>
      <AppBar
        left={<IconBtn icon="back" onPress={() => router.back()}/>}
        title="Choose your plan"
        right={
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.restoreText}>{restoring ? 'Restoring...' : 'Restore'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {error && <Text style={styles.error}>{error}</Text>}
        {note  && <Text style={styles.note}>{note}</Text>}

        {unavailable && (
          <View style={styles.unavailable}>
            <Text style={styles.unavailableTitle}>Purchases are not available right now</Text>
            <Text style={styles.unavailableBody}>
              {isPurchasesConfigured()
                ? `We could not reach ${STORE_NAME}. Check your connection and try again.`
                : 'This build has no store keys, so nothing can be purchased in it.'}
            </Text>
            <Button label="Try again" variant="ghost" onPress={load} style={styles.retry}/>
            {__DEV__ && (
              <Button
                label="Simulate purchase (dev)"
                variant="ghost"
                onPress={simulatePurchase}
                style={styles.retry}
              />
            )}
          </View>
        )}

        {/* Yearly card */}
        <TouchableOpacity
          style={[styles.planCard, selected === 'yearly' && styles.planCardSelected]}
          onPress={() => setSelected('yearly')}
          activeOpacity={0.8}
        >
          <View style={styles.planTop}>
            <View style={styles.planInfo}>
              <Text style={styles.planName}>Yearly</Text>
              <Text style={styles.planSub}>
                {packages.yearly ? 'Billed once a year' : PRICING.yearly.sub}
              </Text>
            </View>
            <View style={styles.planRight}>
              {savingsPct != null && <Tag label={`Save ${savingsPct}%`} tone="sage"/>}
              <Text style={styles.planPrice}>{yearlyPrice}<Text style={styles.planPeriod}>/yr</Text></Text>
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
              <Text style={styles.planSub}>Billed every month</Text>
            </View>
            <View style={styles.planRight}>
              <Text style={styles.planPrice}>{monthlyPrice}<Text style={styles.planPeriod}>/mo</Text></Text>
            </View>
            <View style={[styles.radio, selected === 'monthly' && styles.radioSelected]}>
              {selected === 'monthly' && <View style={styles.radioDot}/>}
            </View>
          </View>
        </TouchableOpacity>

        {/* Trust row */}
        <View style={styles.trustRow}>
          <TrustItem icon="check" label={'Cancel\nany time'}/>
          <TrustItem icon="close" label={'No\nads'}/>
          <TrustItem icon="lock"  label={`Billed by\n${STORE_NAME}`}/>
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
              <Text style={styles.timelineDesc}>Renews at {selectedPrice} unless you cancel</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <Button
          label={
            loadState === 'loading'
              ? 'Loading plans...'
              : `Continue with ${selected === 'yearly' ? 'Yearly' : 'Monthly'}`
          }
          full
          loading={loading}
          disabled={loadState !== 'ready'}
          onPress={handlePurchase}
          style={styles.cta}
        />

        <Text style={styles.finePrint}>
          Auto renews until you cancel. Cancel any time in your {STORE_NAME} settings.
          By continuing you agree to our{' '}
          <Text style={styles.finePrintLink} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.finePrintLink} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>Privacy Policy</Text>.
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
  note: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink2,
    backgroundColor: COLORS.surface2, borderRadius: RADII.r1,
    padding: 10, marginBottom: 12,
  },

  unavailable: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 16, marginBottom: 16, gap: 8,
  },
  unavailableTitle: {
    fontFamily: fontFor('700'), fontSize: 14, color: COLORS.ink },
  unavailableBody: {
    fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink2, lineHeight: 19,
  },
  retry: { alignSelf: 'flex-start' },

  planCard: {
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 16, marginBottom: 12,
  },
  planCardSelected: { borderColor: COLORS.clay, backgroundColor: COLORS.claySoft },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planInfo: { flex: 1 },
  planName: { fontFamily: fontFor('700'), fontSize: 16, color: COLORS.ink },
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
    fontFamily: fontFor('700'), fontSize: 12, color: COLORS.ink3,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
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
  timelineLabel: { fontFamily: fontFor('600'), fontSize: 14, color: COLORS.ink },
  timelineDesc: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3, marginTop: 2 },

  cta: { marginBottom: 14 },
  finePrint: {
    fontFamily: FONTS.sans, fontSize: 11, color: COLORS.ink4,
    textAlign: 'center', lineHeight: 16,
  },
  finePrintLink: { color: COLORS.ink3, textDecorationLine: 'underline' },
});
