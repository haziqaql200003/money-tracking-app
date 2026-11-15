import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fadeIn, useMotionAllowed } from '@/components/analyse/ui/motion';
import { IconButton } from '@/components/ui/icon-button';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { Spacing, Type } from '@/constants/theme';
import { useT } from '@/i18n';

type Props = {
  visible: boolean;
  /** The back button and Android back: one page back, or close on the first page. */
  onBack: () => void;
  title: string;
  right?: ReactNode;
  /** Pinned under the scrolling body, above the home indicator. */
  footer?: ReactNode;
  /** Changing this scrolls the body back to the top (a new page). */
  pageKey?: string;
  children: ReactNode;
};

/**
 * A full-screen page that slides over Faham: back button, title, scrolling body and an optional pinned footer.
 * Everything that opens from it (sheets, the story player) is rendered INSIDE it, so iOS presents it on top.
 */
export function FullScreen({ visible, onBack, title, right, footer, pageKey, children }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const motion = useMotionAllowed();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onBack} statusBarTranslucent>
      <ThemedView style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <IconButton icon="chevron-back" onPress={onBack} label={t('common.back')} />
          <ThemedText style={[Type.heading, styles.title]} numberOfLines={1} accessibilityRole="header">
            {title}
          </ThemedText>
          <View style={styles.right}>{right}</View>
        </View>
        <ScrollView key={pageKey} style={styles.flex} contentContainerStyle={[styles.body, { paddingBottom: footer ? Spacing.three : insets.bottom + Spacing.five }]} showsVerticalScrollIndicator={false}>
          {/* Each page fades in (none with Reduce Motion) */}
          <Animated.View key={pageKey} entering={fadeIn(motion, 200)}>
            {children}
          </Animated.View>
        </ScrollView>
        {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>{footer}</View> : null}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  title: { flex: 1 },
  right: { minWidth: 40, alignItems: 'flex-end' },
  body: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  footer: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
});
