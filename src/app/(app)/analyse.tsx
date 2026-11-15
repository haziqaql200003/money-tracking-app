import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ScrollViewRef } from '@/utils/rn-refs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsDesktop } from '@/components/desktop/use-desktop';
import { AnalyseDeep, DeepSectionBar, type DeepSection } from '@/components/analyse/analyse-deep';
import { AnalyseInsight } from '@/components/analyse/analyse-insight';
import { AnalyseOverview } from '@/components/analyse/analyse-overview';
import { PeriodSheet } from '@/components/analyse/period-sheet';
import { BigAmount } from '@/components/analyse/ui/big-amount';
import { fadeIn, fadeOut, useMotionAllowed } from '@/components/analyse/ui/motion';
import { PeriodPill, periodName } from '@/components/analyse/ui/period-pill';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { GlassSegmented } from '@/components/glass/glass-segmented';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { FontSize, Spacing } from '@/constants/theme';
import { useTransactions } from '@/context/TransactionsContext';
import { useLedger } from '@/hooks/use-ledger';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { toDateKey } from '@/utils/dates';
import { resolvePeriod, stepCycle, type PeriodChoice } from '@/utils/faham-period';
import { windowSummary } from '@/utils/insights';

export default function AnalyseScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { ready } = useTransactions();
  const scrollRef = useRef<ScrollViewRef>(null);
  const desktop = useIsDesktop();

  // 3.8.1: Ringkasan opens on this payday month, Terperinci on the last 6 months (trends need more than one).
  // Each tab keeps its own period; every "vs before" figure uses that period's `previous` window.
  const [choices, setChoices] = useState<{ overview: PeriodChoice; deep: PeriodChoice }>({ overview: { preset: '1M' }, deep: { preset: '6M' } });
  const [picking, setPicking] = useState(false);
  const [tab, setTab] = useState<'overview' | 'deep' | 'insight'>('overview');
  const [section, setSection] = useState<DeepSection>('cashflow');
  // Where the pinned section bar sits, and how far the page is scrolled (both only read in handlers).
  const barY = useRef(0);
  const scrollY = useRef(0);

  const todayKey = toDateKey(new Date());
  const which = tab === 'deep' ? 'deep' : 'overview';
  const choice = choices[which];
  const period = useMemo(() => resolvePeriod(choice.preset, todayKey, choice.custom, choice.cycleKey), [choice, todayKey]);
  const setChoice = (c: PeriodChoice) => setChoices((all) => ({ ...all, [which]: c }));
  const prev = stepCycle(period, -1, todayKey);
  const next = stepCycle(period, 1, todayKey);

  // A small bar that stays at the top once the hero card has scrolled away (Ringkasan only).
  const { entries } = useLedger();
  const [compact, setCompact] = useState(false);
  const kept = useMemo(() => windowSummary(entries, period.window).net, [entries, period]);
  const toTop = () => scrollRef.current?.scrollTo({ y: 0, animated: true });
  // A new section starts at its top: if the page was scrolled past the bar, jump back to where the bar pins.
  const pickSection = (s: DeepSection) => {
    setSection(s);
    if (scrollY.current > barY.current) scrollRef.current?.scrollTo({ y: barY.current, animated: false });
  };
  const deepReady = ready && tab === 'deep';
  // A new tab, period or Terperinci section cross-fades in; with Reduce Motion it simply appears.
  const motion = useMotionAllowed();
  // (Terperinci fades its own sections, so switching one does not rebuild the whole tab.)
  const contentKey = `${tab}|${tab === 'insight' ? '' : period.id}`;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.fill}>
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          scrollEventThrottle={32}
          // Children below stay at fixed positions so index 3 is always the Terperinci section bar.
          stickyHeaderIndices={deepReady ? [3] : undefined}
          onScroll={(e) => {
            scrollY.current = e.nativeEvent.contentOffset.y;
            const down = scrollY.current > 420;
            if (down !== compact) setCompact(down);
          }}
        >
          <View style={styles.titleBlock}>
            <ThemedText type="title" style={styles.heading}>
              {t('plan.analyse.title')}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.analyse.subtitle')}
            </ThemedText>
          </View>
          {/* 1: Overview / Deep dive (forecast included) / Insight */}
          {ready ? (
            <View style={styles.segment}>
              <GlassSegmented
                options={(['overview', 'deep', 'insight'] as const).map((id) => ({
                  key: id,
                  label: id === 'overview' ? t('plan.analyse.tabOverview') : id === 'deep' ? t('plan.analyse.tabDeep') : t('fc.insight.tab'),
                }))}
                value={tab}
                onChange={setTab}
              />
            </View>
          ) : (
            <ScreenSkeleton variant="cards" />
          )}

          {/* 2: Period pill (the Insights tab looks at fixed stretches and says so itself) */}
          <View style={ready && tab !== 'insight' ? styles.segment : undefined}>
            {ready && tab !== 'insight' ? (
              <PeriodPill
                period={period}
                onOpen={() => setPicking(true)}
                onStep={period.cycleKey ? (dir) => {
                  const to = dir < 0 ? prev : next;
                  if (to) setChoice(to);
                } : undefined}
                canPrev={!!prev}
                canNext={!!next}
              />
            ) : null}
          </View>

          {/* 3: Terperinci's section bar, pinned while scrolling */}
          <View onLayout={(e) => {
            barY.current = e.nativeEvent.layout.y;
          }} style={desktop && styles.narrow}>
            {deepReady ? <DeepSectionBar value={section} onChange={pickSection} /> : null}
          </View>

          {/* 4: the tab itself */}
          <Animated.View key={contentKey} entering={fadeIn(motion)}>
            {!ready ? null : tab === 'insight' ? (
              <View style={desktop && styles.narrow}>
                <AnalyseInsight todayKey={todayKey} />
              </View>
            ) : tab === 'deep' ? (
              <View style={desktop && styles.narrow}>
                <AnalyseDeep period={period} todayKey={todayKey} section={section} />
              </View>
            ) : (
              <AnalyseOverview
                key={period.id}
                period={period}
                todayKey={todayKey}
                onOpenInsight={() => {
                  setTab('insight');
                  toTop();
                }}
                onOpenDeep={() => {
                  setTab('deep');
                  toTop();
                }}
              />
            )}
          </Animated.View>

          {/* 5 */}
          <ThemedText type="small" style={[styles.footnote, styles.center, { color: colors.textSecondary }]}>
            {ready ? t('plan.analyse.transfersNote') : ''}
          </ThemedText>
        </ScrollView>
        {compact && tab === 'overview' && ready ? (
          <Animated.View entering={fadeIn(motion, 180)} exiting={fadeOut(motion)} style={[styles.compact, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
            <Pressable onPress={toTop} style={styles.compactRow} accessibilityRole="button" accessibilityLabel={t('plan.analyse.compact.top')}>
              <ThemedText type="smallBold" style={styles.compactTitle}>{t('plan.analyse.tabOverview')}</ThemedText>
              <View style={[styles.compactChip, { backgroundColor: colors.backgroundSelected }]}>
                <ThemedText type="small" style={styles.compactChipText} numberOfLines={1}>{periodName(period, t)}</ThemedText>
              </View>
              <View style={styles.compactKept}>
                <ThemedText type="small" style={{ color: colors.textSecondary }}>{t('plan.analyse.compact.kept')}</ThemedText>
                <BigAmount amount={kept} size="row" color={kept < 0 ? colors.negative : colors.positive} />
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
        </View>
      </SafeAreaView>
      <PeriodSheet
        visible={picking}
        period={period}
        todayKey={todayKey}
        onClose={() => setPicking(false)}
        onApply={(c) => {
          setChoice(c);
          setPicking(false);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  titleBlock: { paddingVertical: Spacing.three, gap: 2 },
  heading: { fontSize: FontSize.display, lineHeight: 40 },
  narrow: { maxWidth: 980 },
  segment: { marginBottom: Spacing.three },
  fill: { flex: 1 },
  compact: { position: 'absolute', top: 0, left: 0, right: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two, minHeight: 48 },
  compactTitle: { fontSize: FontSize.body },
  compactChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, flexShrink: 1 },
  compactChipText: { fontSize: FontSize.caption, fontWeight: '700' },
  compactKept: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  footnote: { fontSize: FontSize.caption, lineHeight: 16, marginBottom: Spacing.three },
  center: { textAlign: 'center' },
});
