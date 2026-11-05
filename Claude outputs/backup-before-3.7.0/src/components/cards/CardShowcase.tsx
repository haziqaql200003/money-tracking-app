import React, { useState } from 'react';

import { useT } from '@/i18n';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CardColorPicker } from './CardColorPicker';
import { FlipCard } from './FlipCard';
import { PRO_CARD_DESIGNS } from './index';
import { DEFAULT_ACCENT } from './palette';

type DesignId = (typeof PRO_CARD_DESIGNS)[number]['id'];

// Temporary test screen: render <CardShowcase /> anywhere to try the Pro cards.
// Pick a design, change its colour, flip it over, and toggle hide/show balance.
export default function CardShowcase() {
  const { t } = useT();
  const [designId, setDesignId] = useState<DesignId>('songket');
  const [hidden, setHidden] = useState(false);
  const [accents, setAccents] = useState<Record<DesignId, string>>({ ...DEFAULT_ACCENT });

  const design = PRO_CARD_DESIGNS.find((d) => d.id === designId)!;
  const accent = accents[designId];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <View style={styles.tabs}>
        {PRO_CARD_DESIGNS.map((d) => (
          <Pressable
            key={d.id}
            onPress={() => setDesignId(d.id)}
            style={[styles.tab, d.id === designId && styles.tabOn]}
          >
            <Text style={[styles.tabText, d.id === designId && styles.tabTextOn]}>{d.name}</Text>
          </Pressable>
        ))}
      </View>

      <FlipCard key={designId} style={styles.cardWrap}>
        {(side, flip) => (
          <design.Component
            bank="Maybank"
            balance={4280.5}
            income={5200}
            spending={2150.75}
            last4="2831"
            hidden={hidden}
            onToggleHidden={() => setHidden((h) => !h)}
            side={side}
            onFlip={flip}
            accent={accent}
          />
        )}
      </FlipCard>
      <Text style={styles.desc}>{t(design.descriptionKey)}</Text>

      <CardColorPicker
        accent={accent}
        onChange={(hex) => setAccents((prev) => ({ ...prev, [designId]: hex }))}
      />

      <View style={styles.actions}>
        <Pressable
          onPress={() => setAccents((prev) => ({ ...prev, [designId]: design.defaultAccent }))}
          style={styles.btn}
        >
          <Text style={styles.btnText}>{t('acct.picker.reset')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0b10' },
  wrap: { padding: 20, paddingTop: 60, paddingBottom: 60, gap: 20 },
  cardWrap: { alignSelf: 'stretch' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
  },
  tabOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  tabText: { color: '#ddd', fontSize: 14 },
  tabTextOn: { color: '#000', fontWeight: '600' },
  desc: { color: '#999', fontSize: 13, marginTop: -8 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  btnText: { color: '#fff', fontSize: 13 },
});
