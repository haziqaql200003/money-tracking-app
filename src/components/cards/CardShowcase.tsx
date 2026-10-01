import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRO_CARD_DESIGNS } from './index';

// Temporary test screen: render <CardShowcase /> anywhere to preview the 3 cards.
export default function CardShowcase() {
  const [hidden, setHidden] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.wrap}>
      <Pressable onPress={() => setHidden((h) => !h)} style={styles.btn}>
        <Text style={styles.btnText}>{hidden ? 'Tunjuk baki' : 'Sembunyi baki'}</Text>
      </Pressable>

      {PRO_CARD_DESIGNS.map((design) => (
        <View key={design.id} style={styles.item}>
          <Text style={styles.label}>
            {design.name} · {design.description}
          </Text>
          <design.Component bank="Maybank" balance={4280.5} last4="2831" hidden={hidden} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0b0b10' },
  wrap: { padding: 20, paddingTop: 60, gap: 24 },
  item: { gap: 8 },
  label: { color: '#bbb', fontSize: 13 },
  btn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#555',
  },
  btnText: { color: '#fff', fontSize: 13 },
});