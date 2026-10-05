import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EvenGrid } from '@/components/even-grid';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CARD_COLORS, isLightColor } from '@/constants/card-styles';
import type { IconName } from '@/constants/categories';
import { Spacing } from '@/constants/theme';
import { useCategories } from '@/context/CategoriesContext';
import { useProfile } from '@/context/ProfileContext';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { formatDate } from '@/i18n/format';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type LinkItem = { icon: IconName; label: string; subtitle: string; tint: string; href: '/more/budgets' | '/more/categories' | '/more/settings' };

export function AccountModal({ visible, onClose }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { displayName, setDisplayName, avatarColor, setAvatarColor } = useProfile();
  const { transactions, accounts } = useTransactions();
  const { categories } = useCategories();

  const [name, setName] = useState(displayName);

  useEffect(() => {
    if (visible) setName(displayName);
  }, [visible, displayName]);

  function commitName() {
    const trimmed = name.trim();
    if (trimmed) setDisplayName(trimmed);
    else setName(displayName);
  }

  const trackingSince = useMemo(() => {
    if (transactions.length === 0) return null;
    const earliest = transactions.reduce((min, tx) => (tx.date < min ? tx.date : min), transactions[0].date);
    const [y, m, d] = earliest.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [transactions]);

  const avatarInk = isLightColor(avatarColor) ? '#111827' : '#FFFFFF';

  const links: LinkItem[] = [
    { icon: 'pie-chart-outline', label: t('acct.profile.budgets'), subtitle: t('acct.profile.budgetsSub'), tint: colors.accent, href: '/more/budgets' },
    { icon: 'pricetags-outline', label: t('acct.profile.categories'), subtitle: t('acct.profile.categoriesSub'), tint: '#F0529C', href: '/more/categories' },
    { icon: 'settings-outline', label: t('acct.profile.settings'), subtitle: t('acct.profile.settingsSub'), tint: '#14B8A6', href: '/more/settings' },
  ];

  function goTo(href: LinkItem['href']) {
    onClose();
    router.push(href);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />

        <ThemedView
          style={[styles.modalBox, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, Spacing.three) }]}
        >
          <View style={[styles.handle, { backgroundColor: colors.divider }]} />

          <SheetHeader
            title={t('acct.profile.title')}
            right={
              <Pressable onPress={onClose} hitSlop={12}>
                <ThemedText type="small" style={{ color: colors.accent, fontWeight: '600' }}>
                  {t('common.done')}
                </ThemedText>
              </Pressable>
            }
          />

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Identity */}
            <View style={styles.identity}>
              <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
                <ThemedText style={[styles.avatarLetter, { color: avatarInk }]}>
                  {(name || '?').charAt(0).toUpperCase()}
                </ThemedText>
              </View>

              <TextInput
                style={[styles.nameInput, { color: colors.text }]}
                value={name}
                onChangeText={setName}
                onEndEditing={commitName}
                placeholder={t('acct.profile.namePlaceholder')}
                placeholderTextColor={colors.textSecondary}
                textAlign="center"
                maxLength={24}
                returnKeyType="done"
              />
              {trackingSince ? (
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('acct.profile.since', { date: formatDate(trackingSince) })}
                </ThemedText>
              ) : null}
            </View>

            {/* Avatar colour */}
            <View style={styles.swatchGrid}>
              <EvenGrid columns={5} rowGap={12}>
                {CARD_COLORS.map((c) => {
                  const active = avatarColor === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => setAvatarColor(c)}
                      style={[styles.swatch, { backgroundColor: c }, active && { borderColor: colors.text }]}
                      accessibilityLabel={t('acct.profile.avatarColourA11y', { color: c })}
                    />
                  );
                })}
              </EvenGrid>
            </View>

            {/* Stats */}
            <View style={[styles.statsCard, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.statCell}>
                <ThemedText style={styles.statValue}>{transactions.length}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('acct.profile.transactions')}
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.statCell}>
                <ThemedText style={styles.statValue}>{accounts.length}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('acct.profile.accounts')}
                </ThemedText>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
              <View style={styles.statCell}>
                <ThemedText style={styles.statValue}>{categories.length}</ThemedText>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>
                  {t('acct.profile.categories')}
                </ThemedText>
              </View>
            </View>

            {/* Quick links */}
            <View style={[styles.linksCard, { backgroundColor: colors.backgroundElement }]}>
              {links.map((item, i) => (
                <Pressable
                  key={item.label}
                  onPress={() => goTo(item.href)}
                  style={({ pressed }) => [
                    styles.linkRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <View style={[styles.linkIcon, { backgroundColor: `${item.tint}26` }]}>
                    <Ionicons name={item.icon} size={18} color={item.tint} />
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type="small">{item.label}</ThemedText>
                    <ThemedText type="small" style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 16 }}>
                      {item.subtitle}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>

            <ThemedText type="small" style={[styles.footer, { color: colors.textSecondary }]}>
              {t('acct.profile.footer')}
            </ThemedText>
          </ScrollView>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalBox: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.three },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  sheetTitle: { fontSize: 18 },

  identity: { alignItems: 'center', gap: 4, marginBottom: Spacing.three },
  avatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  avatarLetter: { fontSize: 32, fontWeight: '700' },
  nameInput: { fontSize: 22, fontWeight: '700', minWidth: 160, paddingVertical: 2 },

  swatchGrid: { marginBottom: Spacing.four, paddingHorizontal: Spacing.two },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: 'transparent' },

  statsCard: { flexDirection: 'row', borderRadius: 18, paddingVertical: Spacing.three, marginBottom: Spacing.three },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },

  linksCard: { borderRadius: 18, paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  linkIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  footer: { textAlign: 'center', marginBottom: Spacing.three },
});