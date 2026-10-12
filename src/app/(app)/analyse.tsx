import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnalyseDeep } from '@/components/analyse-deep';
import { AnalyseInsight } from '@/components/analyse-insight';
import { AnalyseOverview } from '@/components/analyse-overview';
import { StoryShelf } from '@/components/story/report-stories';
import { ScreenSkeleton } from '@/components/ui/skeleton';
import { GlassSegmented } from '@/components/glass/glass-segmented';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, Spacing } from '@/constants/theme';
import { useTransactions } from '@/context/TransactionsContext';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { toDateKey } from '@/utils/dates';

const RANGES = [1, 3, 6, 12] as const;

export default function AnalyseScreen() {
  const colors = useTheme();
  const { t } = useT();
  const { ready } = useTransactions();
  const scrollRef = useRef<ScrollView>(null);

  const [months, setMonths] = useState<(typeof RANGES)[number]>(6);
  const [tab, setTab] = useState<'overview' | 'deep' | 'insight'>('overview');

  const todayKey = toDateKey(new Date());

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

          {/* Range (the Insights tab looks at fixed stretches, so it has no range) */}
          {tab !== 'insight' ? (
          <View style={styles.segment}>
            <GlassSegmented
              height={36}
              trackColor={colors.backgroundSelected}
              options={RANGES.map((r) => ({ key: String(r), label: r === 1 ? t('plan.analyse.rangeOne') : t('plan.analyse.rangeLabel', { n: r }) }))}
              value={String(months)}
              onChange={(k) => setMonths(Number(k) as typeof months)}
            />
          </View>
          ) : null}

          {tab === 'insight' ? (
            <>
              <StoryShelf />
              <AnalyseInsight todayKey={todayKey} />
            </>
          ) : tab === 'deep' ? (
            <AnalyseDeep months={months} todayKey={todayKey} />
          ) : (
            <AnalyseOverview
              key={months}
              months={months}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  content: { paddingBottom: 130 },
  titleBlock: { paddingVertical: Spacing.three, gap: 2 },
  heading: { fontSize: FontSize.display, lineHeight: 40 },
  segment: { marginBottom: Spacing.three },
  footnote: { fontSize: FontSize.caption, lineHeight: 16, marginBottom: Spacing.three },
  center: { textAlign: 'center' },
});
