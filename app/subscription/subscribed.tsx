import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useAuthStore } from '@/lib/store/auth';
import {
  getCustomerInfo, extractSubscriptionStatus, addCustomerInfoListener,
} from '@/lib/revenuecat';
import { Button } from '@/components/ui/Button';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

function ExpandingRings() {
  const scale1 = useRef(new Animated.Value(0.4)).current;
  const scale2 = useRef(new Animated.Value(0.4)).current;
  const scale3 = useRef(new Animated.Value(0.4)).current;
  const op1    = useRef(new Animated.Value(0.6)).current;
  const op2    = useRef(new Animated.Value(0.4)).current;
  const op3    = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const ring = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.6, duration: 1800, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: 1800, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 0.4, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.6 - delay * 0.0001, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );

    ring(scale1, op1, 0).start();
    ring(scale2, op2, 600).start();
    ring(scale3, op3, 1200).start();
  }, []);

  return (
    <View style={rings.wrap}>
      {[{ s: scale1, o: op1 }, { s: scale2, o: op2 }, { s: scale3, o: op3 }].map(({ s, o }, i) => (
        <Animated.View
          key={i}
          style={[
            rings.ring,
            { transform: [{ scale: s }], opacity: o },
          ]}
        />
      ))}
      {/* Centre check circle */}
      <View style={rings.center}>
        <Text style={rings.check}>✓</Text>
      </View>
      {/* Floating accent circles */}
      <View style={[rings.accent, rings.accentOchre, { top: 10, right: 20 }]}/>
      <View style={[rings.accent, rings.accentSage,  { bottom: 20, left: 10 }]}/>
    </View>
  );
}

const rings = StyleSheet.create({
  wrap: {
    width: 200, height: 200,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 2, borderColor: COLORS.clay,
  },
  center: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.clay,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  check: { color: '#fff', fontSize: 28, fontWeight: '700' },
  accent: { position: 'absolute', width: 18, height: 18, borderRadius: 9 },
  accentOchre: { backgroundColor: COLORS.ochre },
  accentSage:  { backgroundColor: COLORS.sage },
});

export default function SubscribedScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { subscription, setSubscription } = useAuthStore();

  // Confirm subscription with RevenueCat
  useEffect(() => {
    const remove = addCustomerInfoListener((info) => {
      const status = extractSubscriptionStatus(info);
      if (status.isActive) {
        setSubscription({
          id: 'rc',
          planType: status.planType,
          status: 'active',
          trialEndsAt: null,
          currentPeriodEnds: status.expiresAt,
        });
      }
    });

    getCustomerInfo()
      .then((info) => {
        const status = extractSubscriptionStatus(info);
        if (status.isActive) {
          setSubscription({
            id: 'rc',
            planType: status.planType,
            status: 'active',
            trialEndsAt: null,
            currentPeriodEnds: status.expiresAt,
          });
        }
      })
      .catch(() => {});

    return remove;
  }, []);

  const planLabel = subscription?.planType === 'yearly' ? 'Yearly plan' : 'Monthly plan';
  const renewalDate = subscription?.currentPeriodEnds
    ? new Date(subscription.currentPeriodEnds).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      })
    : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.content}>
        <ExpandingRings/>

        <Text style={styles.eyebrow}>You're in.</Text>
        <Text style={styles.headline}>Welcome to full access.</Text>
        <Text style={styles.sub}>
          Unlimited plans, adaptive sessions, and progress tracking — all yours.
        </Text>

        {/* Subscription summary card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Plan</Text>
            <Text style={styles.cardValue}>{planLabel}</Text>
          </View>
          {renewalDate && (
            <>
              <View style={styles.cardDivider}/>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Renews</Text>
                <Text style={styles.cardValue}>{renewalDate}</Text>
              </View>
            </>
          )}
          <View style={styles.cardDivider}/>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Manage</Text>
            <Text style={styles.manageLink}>App Store settings</Text>
          </View>
        </View>
      </View>

      <Button
        label="Back to today"
        full
        onPress={() => router.replace('/(main)')}
        icon="home"
        style={styles.cta}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: COLORS.bgAlt,
    alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: 12 },

  eyebrow: {
    fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', color: COLORS.ink3,
    marginTop: 24,
  },
  headline: { fontFamily: FONTS.serif, fontSize: 30, color: COLORS.ink, textAlign: 'center' },
  sub: {
    fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink2,
    textAlign: 'center', lineHeight: 21, paddingHorizontal: 8,
  },

  card: {
    width: '100%', backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 0, overflow: 'hidden',
    marginTop: 8,
  },
  cardRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  cardLabel: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },
  cardValue: { fontFamily: FONTS.sans, fontSize: 13, fontWeight: '600', color: COLORS.ink },
  cardDivider: { height: 1, backgroundColor: COLORS.borderSoft },
  manageLink: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.clay },

  cta: { width: '100%' },
});
