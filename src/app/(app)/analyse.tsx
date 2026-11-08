import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { ScrollViewRef } from '@/utils/rn-refs';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsDesktop } from '@/components/desktop/use-desktop';
import { AnalyseDeep } from '@/components/analyse/analyse-deep';
import { AnalyseInsight } from '@/components/analyse/analyse-insight';
import { AnalyseOverview } from '@/components/analyse/analyse-overview';
import { PeriodSheet } from '@/components/analyse/period-sheet';
import { StoryShelf } from '@/components/story/report-stories';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { GlassSegmented } from '@/components/glass/glass-segmented';
import { ThemedText } from '@/components/ui/themed-text';
import { ThemedView } from '@/components/ui/themed-view';
import { FontSize, Spacing } from '@/constants/theme';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { toDateKey } from '@/utils/dates';
import { PERIOD_PRESETS, rangeLabel, resolvePeriod, type PeriodPreset } from '@/utils/faham-period';
import type { Window } from '@/utils/insights';

export default function AnalyseScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { ready } = useTransactions();
  const scrollRef = useRef<ScrollViewRef>(null);
  const desktop = useIsDesktop();

  const [preset, setPreset] = useState<PeriodPreset>('6M');
  const [custom, setCustom] = useState<Window | null>(null);
  const [pickingDates, setPickingDates] = useState(false);
  const [tab, setTab] = useState<'overview' | 'deep' | 'insight'>('overview');

  const todayKey = toDateKey(new Date());
  // One period for Ringkasan and Terperinci; every "vs before" figure uses its `previous` window.
  const period = useMemo(() => resolvePeriod(preset, todayKey, custom), [preset, todayKey, custom]);

  const choosePreset = (k: PeriodPreset) => {
    // Custom only takes effect once dates are picked; cancelling keeps the period that was showing.
    if (k === 'custom') setPickingDates(true);
    else setPreset(k);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.titleBlock}>
            <ThemedText type="title" style={styles.heading}>
              {t('plan.analyse.title')}
            </ThemedText>
            <ThemedText type="small" style={{ color: colors.textSecondary }}>
              {t('plan.analyse.subtitle')}
            </ThemedText>
          </View>
          {!(ready) ? <ScreenSkeleton variant="cards" /> : (
          <>

          {/* Overview / Deep dive (forecast included) / Insight */}
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

          {/* Period (the Insights tab looks at fixed stretches and says so itself) */}
          {tab !== 'insight' ? (
          <View style={styles.segment}>
            <GlassSegmented
              height={36}
              trackColor={colors.backgroundSelected}
              options={PERIOD_PRESETS.map((k) => ({ key: k, label: t(`plan.analyse.preset.${k}` as TKey) }))}
              value={preset}
              onChange={choosePreset}
            />
            <View style={styles.caption}>
              <ThemedText type="small" style={[styles.flex, { color: colors.textSecondary }]} numberOfLines={2}>
                {t('plan.analyse.periodCaption', { range: rangeLabel(period.window), prev: rangeLabel(period.previous) })}
              </ThemedText>
              {preset === 'custom' ? (
                <Pressable onPress={() => setPickingDates(true)} hitSlop={8} accessibilityRole="button">
                  <ThemedText type="smallBold" style={{ color: colors.accent }}>
                    {t('plan.analyse.periodEdit')}
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          </View>
          ) : null}

          {tab === 'insight' ? (
            <View style={desktop && styles.narrow}>
              <StoryShelf />
              <AnalyseInsight todayKey={todayKey} />
            </View>
          ) : tab === 'deep' ? (
            <View style={desktop && styles.narrow}>
              <AnalyseDeep period={period} todayKey={todayKey} />
            </View>
          ) : (
            <AnalyseOverview
              key={period.id}
              period={period}
              todayKey={todayKey}
              onOpenInsight={() => {
                setTab('insight');
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            />
          )}

          <ThemedText type="small" style={[styles.footnote, styles.center, { color: colors.textSecondary }]}>
            {t('plan.analyse.transfersNote')}
          </ThemedText>
          </>
          )}
        </ScrollView>
      </SafeAreaView>
      <PeriodSheet
        visible={pickingDates}
        initial={custom ?? period.window}
        todayKey={todayKey}
        onClose={() => setPickingDates(false)}
        onApply={(range) => {
          setCustom(range);
          setPreset('custom');
          setPickingDates(false);
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
  caption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two, paddingHorizontal: Spacing.one },
  flex: { flex: 1 },
  footnote: { fontSize: FontSize.caption, lineHeight: 16, marginBottom: Spacing.three },
  center: { textAlign: 'center' },
});
