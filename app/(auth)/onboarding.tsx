import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  ScrollView, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Ellipse, Line } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { markOnboardingComplete } from '@/lib/auth/bootstrap';
import { useAuthStore } from '@/lib/store/auth';
import { COLORS, FONTS } from '@/lib/tokens';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Step illustrations ────────────────────────────────────────────────────────

function ArcIllustration() {
  return (
    <Svg width={200} height={160} viewBox="0 0 200 160">
      <Path d="M 20 140 Q 100 20 180 140" stroke={COLORS.clay} strokeWidth="6" fill="none" strokeLinecap="round"/>
      <Circle cx="100" cy="52" r="16" fill={COLORS.claySoft}/>
      <Circle cx="100" cy="52" r="8"  fill={COLORS.clay}/>
      <Path d="M 50 140 Q 100 80 150 140" stroke={COLORS.claySoft2} strokeWidth="4" fill="none" strokeLinecap="round"/>
    </Svg>
  );
}

function TrackIllustration() {
  return (
    <Svg width={200} height={160} viewBox="0 0 200 160">
      {[130, 100, 70, 50, 80, 60, 40].map((h, i) => (
        <Path
          key={i}
          d={`M ${20 + i * 26} ${140} L ${20 + i * 26} ${140 - h}`}
          stroke={i === 6 ? COLORS.clay : COLORS.claySoft2}
          strokeWidth="18"
          strokeLinecap="round"
        />
      ))}
      <Line x1="8" y1="140" x2="192" y2="140" stroke={COLORS.borderSoft} strokeWidth="2"/>
    </Svg>
  );
}

function PersonalisedIllustration() {
  return (
    <Svg width={200} height={160} viewBox="0 0 200 160">
      {/* Simple body map silhouette */}
      <Ellipse cx="100" cy="30"  rx="18" ry="20" fill={COLORS.claySoft2}/>
      <Path
        d="M 76 50 C 68 54 62 64 60 80 L 58 118 L 66 118 L 70 90 L 74 118 L 86 118 L 90 80 L 96 80 L 110 80 L 114 118 L 126 118 L 130 90 L 134 118 L 142 118 L 140 80 C 138 64 132 54 124 50 Z"
        fill={COLORS.claySoft2}
      />
      {/* Highlighted regions */}
      <Ellipse cx="100" cy="80" rx="14" ry="12" fill={COLORS.clay} fillOpacity="0.35"/>
      <Circle  cx="100" cy="80" r="4"  fill={COLORS.clay}/>
    </Svg>
  );
}

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    Illustration: ArcIllustration,
    title: 'Move without pain.',
    body: 'Personalised kinesiotherapy exercises, designed to get you moving freely again.',
  },
  {
    Illustration: TrackIllustration,
    title: 'Track how you feel.',
    body: 'Rate pain after every exercise. Your routine adapts in real time so recovery stays on track.',
  },
  {
    Illustration: PersonalisedIllustration,
    title: 'Made for your body.',
    body: 'Tell us where it hurts. We build a programme tailored to your condition and goals.',
  },
];

export default function OnboardingScreen() {
  const router    = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setStep(idx);
  }

  /** Marks onboarding done, then sends the user on: intake when signed in,
   *  sign up when not. */
  async function finish() {
    await markOnboardingComplete();
    if (useAuthStore.getState().user) router.replace('/(intake)/body-map');
    else router.replace('/(auth)/signup');
  }

  function next() {
    if (step < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (step + 1) * SCREEN_W, animated: true });
    } else {
      finish();
    }
  }

  const isLast = step === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      {/* Skip */}
      <TouchableOpacity style={styles.skip} onPress={finish}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map(({ Illustration, title, body }, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_W }]}>
            <View style={styles.illustrationWrap}>
              <Illustration/>
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]}/>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <Button
          label={isLast ? 'Get started' : 'Next'}
          onPress={next}
          full
          icon={isLast ? 'arrowRight' : undefined}
          iconPosition="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  skip: {
    position: 'absolute', top: 56, right: 24, zIndex: 10,
  },
  skipText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3 },
  slide: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 36, paddingTop: 80,
  },
  illustrationWrap: {
    width: 200, height: 160, marginBottom: 48,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    fontFamily: FONTS.serif, fontSize: 32, color: COLORS.ink,
    textAlign: 'center', marginBottom: 14,
  },
  body: {
    fontFamily: FONTS.sans, fontSize: 15, color: COLORS.ink2,
    textAlign: 'center', lineHeight: 23,
  },
  dots: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.borderSoft,
  },
  dotActive: { backgroundColor: COLORS.clay, width: 18 },
  footer: { paddingHorizontal: 24, paddingBottom: 48 },
});
