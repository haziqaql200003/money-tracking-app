import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SocialButtons } from '@/components/auth/social-buttons';
import { ThemedView } from '@/components/ui/themed-view';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { APP_NAME } from '@/constants/brand';
import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT, type TKey } from '@/i18n';
import { introSeen, markIntroSeen } from '@/services/intro';

/** The app's mark until the real logo is ready: swap this one component when it is. */
export function BrandMark({ size = 40 }: { size?: number }) {
  const colors = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="wallet" size={size * 0.52} color="#fff" />
    </View>
  );
}

const SLIDES: { tagKey: TKey; titleKey: TKey; bodyKey: TKey }[] = [
  { tagKey: 'ob.story.kira.tag', titleKey: 'ob.story.kira.title', bodyKey: 'ob.story.kira.body' },
  { tagKey: 'ob.story.faham.tag', titleKey: 'ob.story.faham.title', bodyKey: 'ob.story.faham.body' },
  { tagKey: 'ob.story.rancang.tag', titleKey: 'ob.story.rancang.title', bodyKey: 'ob.story.rancang.body' },
];

/**
 * First screen a signed-out person sees, after the splash.
 * 1. A three-part story (Kira, Faham, Rancang). It must be read to the end once; after that it is skipped.
 * 2. Two buttons: start (opens the sign-up choices) or sign in.
 */
export default function WelcomeScreen() {
  const colors = useTheme();
  const { t } = useT();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [stage, setStage] = useState<'loading' | 'story' | 'start'>('loading');
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pager = useRef<ScrollView>(null);

  useEffect(() => {
    let alive = true;
    void introSeen().then((seen) => alive && setStage(seen ? 'start' : 'story'));
    return () => {
      alive = false;
    };
  }, []);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width)));
  }
  function next() {
    if (page < SLIDES.length - 1) {
      pager.current?.scrollTo({ x: (page + 1) * width, animated: true });
      setPage(page + 1);
      return;
    }
    markIntroSeen();
    setStage('start');
  }

  if (stage === 'loading') return <ThemedView style={styles.flex} />;

  if (stage === 'story') {
    const last = page === SLIDES.length - 1;
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.top}>
            <View style={styles.brandRow}>
              <BrandMark size={34} />
              <Text style={[Type.heading, { color: colors.accent }]}>{APP_NAME}</Text>
            </View>
            <Text style={[Type.label, { color: colors.textSecondary }]}>{`${page + 1} / ${SLIDES.length}`}</Text>
          </View>

          <ScrollView
            ref={pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onScrollEnd}
            style={styles.flex}
          >
            {SLIDES.map((s, i) => (
              <View key={s.tagKey} style={[styles.slide, { width }]}>
                <StoryArt index={i} />
                <Text style={[Type.overline, { color: colors.accent, marginTop: Spacing.four }]}>{t(s.tagKey)}</Text>
                <Text style={[styles.slideTitle, { color: colors.text }]}>{t(s.titleKey)}</Text>
                <Text style={[Type.body, { color: colors.textSecondary }]}>{t(s.bodyKey)}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {SLIDES.map((s, i) => (
              <View key={s.tagKey} style={[styles.dot, { backgroundColor: i === page ? colors.accent : colors.divider }, i === page && styles.dotOn]} />
            ))}
          </View>
          <View style={styles.footer}>
            <Button label={last ? t('ob.story.start') : t('ob.story.next')} variant={last ? 'primary' : 'secondary'} onPress={next} />
            <Text style={[Type.caption, styles.hint, { color: colors.textSecondary }]}>{t('ob.story.swipeHint')}</Text>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.top}>
          <View style={styles.brandRow}>
            <BrandMark size={38} />
            <Text style={[Type.heading, { color: colors.accent }]}>{APP_NAME}</Text>
          </View>
        </View>
        <View style={styles.heroWrap}>
          <HeroCards />
        </View>
        <View style={styles.startBottom}>
          <Text style={[styles.motto, { color: colors.text }]}>{t('ob.start.motto')}</Text>
          <Text style={[Type.body, { color: colors.textSecondary, marginBottom: Spacing.three }]}>{t('ob.start.sub')}</Text>
          <Button label={t('ob.start.begin')} onPress={() => setSheet(true)} />
          <Pressable onPress={() => router.push('/login')} style={styles.secondary} accessibilityRole="button">
            <Text style={[Type.heading, { color: colors.accent }]}>{t('ob.start.haveAccount')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={t('ob.start.sheetTitle')}>
        <View style={styles.sheetBody}>
          <SocialButtons bare onError={setError} />
          <Button
            label={t('ob.start.withEmail')}
            variant="secondary"
            icon="mail-outline"
            onPress={() => {
              setSheet(false);
              router.push('/register');
            }}
          />
          {error ? <Text style={[Type.label, { color: colors.negative }]}>{error}</Text> : null}
          <Text style={[Type.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('ob.start.consentLine')}
            <Text style={{ color: colors.accent, fontWeight: '700' }} onPress={() => router.push('/privacy')}>
              {t('auth.register.consentLink')}
            </Text>
            .
          </Text>
        </View>
      </Sheet>
    </ThemedView>
  );
}

/** Two tilted cards and a record chip: a quick picture of what the app is for. Drawn with views, no images. */
function HeroCards() {
  const colors = useTheme();
  const { t } = useT();
  return (
    <View style={styles.hero}>
      <View style={[styles.cardBack, { backgroundColor: '#5B73E8' }]} />
      <View style={[styles.cardFront, { backgroundColor: colors.accent }]}>
        <Text style={[Type.label, styles.onCardDim]}>{t('ob.art.goalName')}</Text>
        {/* i18n-ignore: amount in the sample picture */}
        <Text style={[Type.title, styles.onCard]}>RM 2,480</Text>
        <View style={styles.barTrack}>
          <View style={styles.barFill} />
        </View>
      </View>
      <View style={[styles.chip, { backgroundColor: colors.backgroundElement }]}>
        <View style={[styles.chipIcon, { backgroundColor: '#FFF1DC' }]}>
          <Ionicons name="restaurant" size={14} color="#A66A00" />
        </View>
        <View>
          <Text style={[Type.label, { color: colors.text }]}>{t('ob.art.nasiLemak')}</Text>
          <Text style={[Type.micro, { color: colors.textSecondary }]}>{t('ob.art.justNow')}</Text>
        </View>
        {/* i18n-ignore: amount in the sample picture */}
        <Text style={[Type.label, { color: colors.text, marginLeft: 8 }]}>-RM 6.50</Text>
      </View>
    </View>
  );
}

/** The picture at the top of each story page. */
function StoryArt({ index }: { index: number }) {
  const colors = useTheme();
  const { t } = useT();
  if (index === 0) {
    const rows: [TKey, string, boolean][] = [
      ['ob.art.nasiLemak', 'RM 6.50', false],
      ['ob.art.tehTarik', 'RM 2.50', false],
      ['ob.art.grab', 'RM 14.20', true],
    ];
    return (
      <View style={[styles.art, { backgroundColor: colors.backgroundElement }]}>
        {rows.map(([k, amt, hi]) => (
          <View key={k} style={[styles.artRow, { backgroundColor: hi ? colors.accentSoft : colors.background }]}>
            <Text style={[Type.label, { color: hi ? colors.accent : colors.text }]}>{t(k)}</Text>
            <Text style={[Type.label, { color: hi ? colors.accent : colors.text }]}>{amt}</Text>
          </View>
        ))}
        <View style={[styles.artPlus, { backgroundColor: colors.accent }]}>
          <Ionicons name="add" size={30} color="#fff" />
        </View>
      </View>
    );
  }
  if (index === 1) {
    const bars: [TKey, number, string][] = [
      ['ob.art.food', 42, colors.accent],
      ['ob.art.transport', 23, '#5B73E8'],
      ['ob.art.bills', 18, '#8EA0F2'],
    ];
    return (
      <View style={[styles.art, { backgroundColor: colors.backgroundElement, gap: 14 }]}>
        <Text style={[Type.label, { color: colors.textSecondary }]}>{t('ob.art.whereMoney')}</Text>
        {bars.map(([k, pct, c]) => (
          <View key={k} style={{ gap: 6 }}>
            <View style={styles.between}>
              <Text style={[Type.label, { color: colors.text }]}>{t(k)}</Text>
              <Text style={[Type.label, { color: colors.text }]}>{`${pct}%`}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.background }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: c }]} />
            </View>
          </View>
        ))}
        <View style={[styles.note, { backgroundColor: '#FFF1DC' }]}>
          <Text style={[Type.label, { color: '#6B4300' }]}>{t('ob.art.priciestDay')}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.art, { backgroundColor: colors.accent, gap: 10 }]}>
      <Text style={[Type.label, styles.onCardDim]}>{t('ob.art.goalTrip')}</Text>
      {/* i18n-ignore: amount in the sample picture */}
      <Text style={[Type.display, styles.onCard]}>RM 1,850</Text>
      <Text style={[Type.label, styles.onCardDim]}>{t('ob.art.goalOf')}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { backgroundColor: '#FFD43B' }]} />
      </View>
      <View style={styles.pills}>
        {(['ob.art.pillBudget', 'ob.art.pillBills', 'ob.art.pillDebt'] as TKey[]).map((k) => (
          <View key={k} style={styles.pill}>
            <Text style={[Type.caption, styles.onCard]}>{t(k)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingTop: Spacing.two, height: 52 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slide: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  slideTitle: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.5, marginVertical: Spacing.two },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: Spacing.three },
  dot: { width: 8, height: 8, borderRadius: Radius.pill },
  dotOn: { width: 24 },
  footer: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  hint: { textAlign: 'center', marginTop: Spacing.two },
  art: { height: 280, borderRadius: Radius.xl, padding: Spacing.four, justifyContent: 'flex-start', gap: 10, overflow: 'hidden' },
  artRow: { height: 50, borderRadius: Radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three },
  artPlus: { position: 'absolute', right: Spacing.four, bottom: Spacing.four, width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: 12, borderRadius: 6 },
  note: { marginTop: 'auto', padding: 10, borderRadius: Radius.md },
  pills: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)' },
  onCard: { color: '#FFFFFF' },
  onCardDim: { color: 'rgba(255,255,255,0.82)' },
  heroWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { width: 320, height: 260 },
  cardBack: { position: 'absolute', left: 10, top: 10, width: 230, height: 140, borderRadius: 24, transform: [{ rotate: '-10deg' }] },
  cardFront: { position: 'absolute', left: 66, top: 36, width: 240, height: 148, borderRadius: 24, padding: 20, justifyContent: 'space-between', transform: [{ rotate: '4deg' }] },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  barFill: { width: '62%', height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  chip: { position: 'absolute', left: 0, top: 190, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, shadowColor: '#0C111F', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  chipIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  startBottom: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.three, gap: 6 },
  motto: { fontSize: 36, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  secondary: { height: 52, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { gap: 12, paddingBottom: Spacing.three },
});
