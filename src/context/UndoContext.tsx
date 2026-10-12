import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';
import { FontSize, Radius } from '@/constants/theme';

type OfferOptions = { durationMs?: number; actionLabel?: string; onAction?: () => void };
type Offer = { id: number; message: string; onUndo: () => void; durationMs: number; actionLabel?: string; onAction?: () => void };
type UndoValue = { offer: (message: string, onUndo: () => void, options?: OfferOptions) => void };

const UndoContext = createContext<UndoValue | null>(null);
const SHOW_MS = 5000;

/** A short "Undo" bar at the bottom, shown after something is deleted by a swipe. */
export function UndoProvider({ children }: { children: ReactNode }) {
  const colors = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<Offer | null>(null);

  const offer = useCallback((message: string, onUndo: () => void, options?: OfferOptions) => {
    setCurrent({ id: Date.now() + Math.random(), message, onUndo, durationMs: options?.durationMs ?? SHOW_MS, actionLabel: options?.actionLabel, onAction: options?.onAction });
  }, []);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => setCurrent(null), current.durationMs);
    return () => clearTimeout(timer);
  }, [current]);

  const value = useMemo(() => ({ offer }), [offer]);

  return (
    <UndoContext.Provider value={value}>
      {children}
      {current ? (
        <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 70 }]}>
          <View style={[styles.bar, { backgroundColor: colors.text }]}>
            <Text style={[styles.text, { color: colors.background }]} numberOfLines={2}>
              {current.message}
            </Text>
            {current.actionLabel && current.onAction ? (
              <Pressable
                onPress={() => {
                  current.onAction?.();
                  setCurrent(null);
                }}
                hitSlop={10}
                accessibilityRole="button"
              >
                <Text style={[styles.undo, { color: colors.accent }]}>{current.actionLabel}</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                current.onUndo();
                setCurrent(null);
              }}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={[styles.undo, { color: colors.accent }]}>{t('common.undo')}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const ctx = useContext(UndoContext);
  if (!ctx) throw new Error('useUndo must be used within an UndoProvider');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: Radius.md, maxWidth: 520, width: '100%' },
  text: { flex: 1, fontSize: FontSize.label },
  undo: { fontSize: FontSize.label, fontWeight: '700' },
});
