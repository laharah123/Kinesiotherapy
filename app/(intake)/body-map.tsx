import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BodyMap, type BodyRegion } from '@/components/figures/BodyMap';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/AppBar';
import { useIntakeStore } from '@/lib/store/intake';
import { Icon } from '@/lib/icons';
import { COLORS, FONTS, RADII } from '@/lib/tokens';

const REGION_LABELS: Record<BodyRegion, string> = {
  neck: 'Neck', leftShoulder: 'L. Shoulder', rightShoulder: 'R. Shoulder',
  chest: 'Chest', leftElbow: 'L. Elbow', rightElbow: 'R. Elbow',
  leftWrist: 'L. Wrist', rightWrist: 'R. Wrist',
  upperAbdomen: 'Upper abdomen', lowerAbdomen: 'Lower abdomen',
  leftHip: 'L. Hip', rightHip: 'R. Hip',
  leftKnee: 'L. Knee', rightKnee: 'R. Knee',
  upperBack: 'Upper back', midBack: 'Mid back', lowBack: 'Lower back',
  leftGlute: 'L. Glute', rightGlute: 'R. Glute',
  leftAnkle: 'L. Ankle', rightAnkle: 'R. Ankle',
};

export default function BodyMapScreen() {
  const router  = useRouter();
  const { selectedRegions, toggleRegion } = useIntakeStore();
  const [side, setSide] = useState<'front' | 'back'>('front');

  return (
    <View style={styles.root}>
      <AppBar
        title="Where does it hurt?"
        right={
          <TouchableOpacity onPress={() => router.push('/(intake)/condition')}>
            <Text style={styles.skipLink}>Skip</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.clay }]}/>
            <Text style={styles.legendText}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { borderWidth: 1.5, borderColor: COLORS.border }]}/>
            <Text style={styles.legendText}>Tap to add</Text>
          </View>
        </View>

        {/* Front / Back toggle */}
        <View style={styles.toggleWrap}>
          <SegmentedControl
            options={['Front', 'Back']}
            value={side === 'front' ? 'Front' : 'Back'}
            onChange={(v) => setSide(v === 'Front' ? 'front' : 'back')}
          />
        </View>

        {/* Body map */}
        <View style={styles.mapWrap}>
          <BodyMap
            width={220}
            side={side}
            selected={selectedRegions}
            onSelect={(r) => toggleRegion(r)}
            hot={COLORS.clay}
          />
        </View>

        {/* Selected chips */}
        {selectedRegions.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>Selected areas</Text>
            <View style={styles.chips}>
              {selectedRegions.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.chip}
                  onPress={() => toggleRegion(r)}
                >
                  <Text style={styles.chipText}>{REGION_LABELS[r]}</Text>
                  <Icon name="close" size={12} color={COLORS.clay}/>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.chipAdd}
                onPress={() => setSide(side === 'front' ? 'back' : 'front')}
              >
                <Icon name="plus" size={12} color={COLORS.ink3}/>
                <Text style={styles.chipAddText}>Add area</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={selectedRegions.length > 0 ? 'Continue' : 'Skip for now'}
          onPress={() => router.push('/(intake)/condition')}
          full
          icon="arrowRight"
          iconPosition="right"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { alignItems: 'center', paddingBottom: 120 },
  skipLink: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3 },

  legend: {
    flexDirection: 'row', gap: 20, marginTop: 16, marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: 'transparent',
  },
  legendText: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },

  toggleWrap: { marginVertical: 16 },
  mapWrap: { marginVertical: 8 },

  chipsSection: { alignSelf: 'stretch', paddingHorizontal: 20, marginTop: 24 },
  chipsLabel: {
    fontFamily: FONTS.sans, fontSize: 11, fontWeight: '700',
    letterSpacing: 1, textTransform: 'uppercase', color: COLORS.ink3,
    marginBottom: 10,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.claySoft,
    borderRadius: RADII.r4, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.clay },
  chipAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
    borderRadius: RADII.r4, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipAddText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink3 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 24, paddingBottom: 40,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
  },
});
