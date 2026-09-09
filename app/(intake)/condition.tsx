import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { CONDITIONS, CONDITION_FILTER_TAGS, type BodyArea } from '@/data/conditions';
import { AppBar } from '@/components/ui/AppBar';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { Glyph } from '@/lib/glyphs';
import { Icon } from '@/lib/icons';
import { useIntakeStore } from '@/lib/store/intake';
import { COLORS, FONTS, RADII, fontFor } from '@/lib/tokens';

const FILTER_LABELS: Record<BodyArea, string> = {
  back: 'Back', neck: 'Neck', shoulder: 'Shoulder', wrist: 'Wrist',
  knee: 'Knee', hip: 'Hip', foot: 'Foot', core: 'Core', whole: 'Whole body',
};

export default function ConditionScreen() {
  const router = useRouter();
  const { selectedCondition, setCondition } = useIntakeStore();
  const [filter, setFilter]   = useState<BodyArea | 'all'>('all');
  const [query, setQuery]     = useState('');
  const [searching, setSearching] = useState(false);

  const visible = useMemo(() => {
    return CONDITIONS.filter((c) => {
      const matchFilter = filter === 'all' || c.filterTag === filter;
      const matchQuery  = !query || c.name.toLowerCase().includes(query.toLowerCase());
      return matchFilter && matchQuery;
    });
  }, [filter, query]);

  function handleSelect(id: string) {
    setCondition(selectedCondition === id ? null : id);
  }

  return (
    <View style={styles.root}>
      <AppBar
        left={<Icon name="back" size={22} color={COLORS.ink} onPress={() => router.back()}/>}
        title="What's the problem?"
        right={
          searching ? (
            <TouchableOpacity onPress={() => { setSearching(false); setQuery(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setSearching(true)}>
              <Icon name="search" size={22} color={COLORS.ink}/>
            </TouchableOpacity>
          )
        }
      />

      {searching && (
        <View style={styles.searchBar}>
          <Icon name="search" size={16} color={COLORS.ink3}/>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conditions…"
            placeholderTextColor={COLORS.ink4}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      )}

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {(['all', ...CONDITION_FILTER_TAGS] as const).map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.filterChip, filter === tag && styles.filterChipActive]}
            onPress={() => setFilter(tag)}
          >
            <Text style={[styles.filterChipText, filter === tag && styles.filterChipTextActive]}>
              {tag === 'all' ? 'All' : FILTER_LABELS[tag]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {visible.map((c) => {
          const isSelected = selectedCondition === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => handleSelect(c.id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <Glyph kind={c.glyphKind} size={40} color={COLORS.clay} bg={COLORS.claySoft}/>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardName}>{c.name}</Text>
                <View style={styles.cardMeta}>
                  <Tag label={c.badgeText} tone={c.tone}/>
                  <Text style={styles.cardTime}>{c.routineTemplate.dailyMinutes} min/day</Text>
                </View>
              </View>
              <Icon
                name={isSelected ? 'check' : 'chevron'}
                size={18}
                color={isSelected ? COLORS.clay : COLORS.ink4}
              />
            </TouchableOpacity>
          );
        })}

        {visible.length === 0 && (
          <Text style={styles.empty}>No conditions match "{query}".</Text>
        )}

        <View style={styles.listPad}/>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={selectedCondition ? 'Continue' : "Skip — I'll explore"}
          onPress={() => router.push('/(intake)/questionnaire')}
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
  cancelText: { fontFamily: FONTS.sans, fontSize: 14, color: COLORS.clay },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink },

  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: RADII.r4, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.claySoft, borderColor: COLORS.clay },
  filterChipText: { fontFamily: FONTS.sans, fontSize: 13, color: COLORS.ink2 },
  filterChipTextActive: { fontFamily: fontFor('600'), color: COLORS.clay },

  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADII.r2, padding: 14,
  },
  cardSelected: { borderColor: COLORS.clay, backgroundColor: COLORS.claySoft },
  cardLeft: {},
  cardBody: { flex: 1, gap: 6 },
  cardName: { fontFamily: fontFor('600'), fontSize: 15, color: COLORS.ink },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTime: { fontFamily: FONTS.sans, fontSize: 12, color: COLORS.ink3 },
  empty: {
    fontFamily: FONTS.sans, fontSize: 14, color: COLORS.ink3,
    textAlign: 'center', marginTop: 40,
  },
  listPad: { height: 100 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 24, paddingBottom: 40, backgroundColor: COLORS.bg,
    borderTopWidth: 1, borderTopColor: COLORS.borderSoft,
  },
});
