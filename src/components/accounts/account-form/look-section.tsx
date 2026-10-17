import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { CardBackground } from '@/components/accounts/account-card';
import { ProCardThumb } from '@/components/cards/thumbs';
import { EvenGrid } from '@/components/ui/even-grid';
import { ThemedText } from '@/components/ui/themed-text';
import { ACCOUNT_ICONS } from '@/constants/accounts';
import type { IconName } from '@/constants/categories';
import {
  CARD_COLORS,
  CARD_DESIGNS,
  hslToHex,
  isProDesign,
  isValidHex,
  PRO_DESIGNS,
  type CardDesign,
} from '@/constants/card-styles';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

import { Strip } from './color-strip';
import { HUE_STOPS, LIGHT_MAX, LIGHT_MIN, PRO_STEP } from './constants';
import { styles } from './styles';

type Props = {
  design: CardDesign;
  setDesign: (d: CardDesign) => void;
  color: string;
  pickColor: (hex: string) => void;
  icon: IconName;
  pickIcon: (n: IconName) => void;
  /** Open the custom-colour panel straight away (an existing account whose colour is not one of the swatches). */
  initialShowCustom: boolean;
  /** Scroll the premium strip to this design when the sheet opens on an existing account. */
  scrollToDesign?: CardDesign;
};

/** "Look": card design, premium designs, colour (swatches or custom) and icon. */
export function LookSection({ design, setDesign, color, pickColor, icon, pickIcon, initialShowCustom, scrollToDesign }: Props) {
  const { t } = useT();
  const colors = useTheme();
  const proRef = useRef<ScrollView>(null);
  const [showCustom, setShowCustom] = useState(initialShowCustom);
  const [hue, setHue] = useState(220);
  const [light, setLight] = useState(50);
  const [hexInput, setHexInput] = useState(color);
  const isCustomColor = !CARD_COLORS.includes(color);

  // Keep the hex box in step when the colour changes from swatches/strips (adjusting state while rendering, no effect).
  const [hexFor, setHexFor] = useState(color);
  if (hexFor !== color) {
    setHexFor(color);
    setHexInput(color);
  }

  // Bring the chosen premium design into view when the sheet opens on an existing account.
  useEffect(() => {
    if (!scrollToDesign) return;
    const idx = PRO_DESIGNS.findIndex((d) => d.id === scrollToDesign);
    if (idx <= 0) return;
    const id = setTimeout(() => proRef.current?.scrollTo({ x: idx * PRO_STEP, animated: false }), 60);
    return () => clearTimeout(id);
  }, [scrollToDesign]);

  function onHexChange(text: string) {
    const cleaned = ('#' + text.replace(/[^0-9a-fA-F]/g, '')).slice(0, 7).toUpperCase();
    setHexInput(cleaned);
    if (isValidHex(cleaned)) pickColor(cleaned);
  }

  return (
    <>
      <ThemedText type="smallBold" style={[styles.section, { color: colors.textSecondary }]}>
        {t('acct.add.secLook')}
      </ThemedText>
      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 0 }]}>
        {t('acct.add.design')}
      </ThemedText>
      <View style={styles.designRow}>
        {CARD_DESIGNS.map((d) => {
          const active = design === d.id;
          return (
            <Pressable key={d.id} style={styles.designItem} onPress={() => setDesign(d.id)}>
              <View
                style={[
                  styles.designThumb,
                  { borderColor: active ? colors.accent : colors.divider, borderWidth: active ? 2 : 1 },
                ]}
              >
                <CardBackground color={color} design={d.id} />
              </View>
              <ThemedText
                type="small"
                style={{ color: active ? colors.text : colors.textSecondary, fontWeight: active ? '600' : '500' }}
              >
                {t(d.labelKey)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('acct.add.premium')}
      </ThemedText>
      <ScrollView
        ref={proRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={PRO_STEP}
        snapToAlignment="start"
        decelerationRate="fast"
        style={styles.proScroll}
        contentContainerStyle={styles.proStrip}
      >
        {PRO_DESIGNS.map((d) => {
          const active = design === d.id;
          return (
            <Pressable
              key={d.id}
              style={styles.proItem}
              onPress={() => setDesign(d.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View
                style={[
                  styles.proThumb,
                  { borderColor: active ? colors.accent : colors.divider, borderWidth: active ? 2 : 1 },
                ]}
              >
                <ProCardThumb design={d.id} />
                {active ? (
                  <View style={[styles.proCheck, { backgroundColor: colors.accent }]}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                ) : null}
              </View>
              <ThemedText
                type="small"
                style={{ color: active ? colors.text : colors.textSecondary, fontWeight: active ? '600' : '500' }}
              >
                {d.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {isProDesign(design) ? (
        <ThemedText type="small" style={[styles.helper, { color: colors.textSecondary }]}>
          {t('acct.add.premiumNote')}
        </ThemedText>
      ) : (
        <>
      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('acct.add.colour')}
      </ThemedText>
      <EvenGrid columns={5} rowGap={12}>
        {CARD_COLORS.map((c) => {
          const active = color === c;
          return (
            <Pressable
              key={c}
              onPress={() => {
                pickColor(c);
                setShowCustom(false);
              }}
              style={[styles.swatch, { backgroundColor: c }, active && { borderColor: colors.text }]}
              accessibilityLabel={t('acct.add.colourA11y', { color: c })}
            />
          );
        })}
      </EvenGrid>
      <Pressable
        onPress={() => setShowCustom((v) => !v)}
        style={[
          styles.customButton,
          { backgroundColor: colors.backgroundElement, borderColor: isCustomColor || showCustom ? colors.text : colors.divider },
        ]}
        accessibilityLabel={t('acct.add.customColour')}
      >
        <Ionicons name="color-palette" size={18} color={isCustomColor ? color : colors.textSecondary} />
        <ThemedText type="small" style={{ fontWeight: '600' }}>
          {t('acct.add.customColour')}
        </ThemedText>
      </Pressable>

      {showCustom ? (
        <View style={[styles.customPanel, { backgroundColor: colors.backgroundElement }]}>
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('acct.add.colour')}
          </ThemedText>
          <Strip
            segments={HUE_STOPS}
            ratio={hue / 360}
            onPick={(r) => {
              const h = Math.round(r * 359);
              setHue(h);
              pickColor(hslToHex(h, 72, light));
            }}
          />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('acct.add.shade')}
          </ThemedText>
          <Strip
            segments={Array.from({ length: 12 }, (_, i) =>
              hslToHex(hue, 72, LIGHT_MIN + ((LIGHT_MAX - LIGHT_MIN) * i) / 11),
            )}
            ratio={(light - LIGHT_MIN) / (LIGHT_MAX - LIGHT_MIN)}
            onPick={(r) => {
              const l = Math.round(LIGHT_MIN + r * (LIGHT_MAX - LIGHT_MIN));
              setLight(l);
              pickColor(hslToHex(hue, 72, l));
            }}
          />
          <ThemedText type="small" style={{ color: colors.textSecondary }}>
            {t('acct.add.hex')}
          </ThemedText>
          <TextInput
            style={[styles.hexInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.divider }]}
            value={hexInput}
            onChangeText={onHexChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
          />
        </View>
      ) : null}
        </>
      )}

      <ThemedText type="small" style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {t('acct.add.icon')}
      </ThemedText>
      <View style={[styles.iconBox, { backgroundColor: colors.backgroundElement }]}>
        <EvenGrid columns={6} rowGap={8}>
          {ACCOUNT_ICONS.map((n) => {
            const active = n === icon;
            return (
              <Pressable
                key={n}
                onPress={() => pickIcon(n)}
                style={[styles.iconCell, active && { backgroundColor: `${color}26`, borderColor: color }]}
                accessibilityLabel={t('acct.add.iconA11y', { name: n })}
              >
                <Ionicons name={n} size={20} color={active ? color : colors.textSecondary} />
              </Pressable>
            );
          })}
        </EvenGrid>
      </View>
    </>
  );
}
