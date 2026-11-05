import { useCallback, useMemo } from 'react';

import { useAuth } from '@/context/AuthContext';
import { usePersistedState } from '@/hooks/use-persisted-state';
import type { TKey } from '@/i18n';

/**
 * Which sections Home shows, and in what order (3.7.0, Home A5). Saved per account, so it follows the pengguna to
 * another phone. The account cards stay at the top and are not part of this list.
 */
export type HomeWidget = 'today' | 'quick' | 'bento' | 'chart' | 'recent';

export const HOME_WIDGETS: { id: HomeWidget; labelKey: TKey; icon: string }[] = [
  { id: 'today', labelKey: 'home.layout.w.today', icon: 'sunny-outline' },
  { id: 'quick', labelKey: 'home.layout.w.quick', icon: 'flash-outline' },
  { id: 'bento', labelKey: 'home.layout.w.bento', icon: 'grid-outline' },
  { id: 'chart', labelKey: 'home.layout.w.chart', icon: 'bar-chart-outline' },
  { id: 'recent', labelKey: 'home.layout.w.recent', icon: 'list-outline' },
];

type Stored = { order: HomeWidget[]; hidden: HomeWidget[] };
const DEFAULT: Stored = { order: ['today', 'quick', 'bento', 'chart', 'recent'], hidden: [] };
const ALL = DEFAULT.order;

/** Saved data from another version may miss a section or hold one that no longer exists. */
function clean(s: Stored | null | undefined): Stored {
  const order = (s?.order ?? []).filter((id, i, list) => ALL.includes(id) && list.indexOf(id) === i);
  for (const id of ALL) if (!order.includes(id)) order.push(id);
  const hidden = (s?.hidden ?? []).filter((id) => ALL.includes(id));
  return { order, hidden };
}

export function useHomeLayout() {
  const { user } = useAuth();
  const [stored, setStored] = usePersistedState<Stored>('home-layout', DEFAULT, user?.id ?? null);
  const layout = useMemo(() => clean(stored), [stored]);

  const visible = useMemo(() => layout.order.filter((id) => !layout.hidden.includes(id)), [layout]);

  const toggle = useCallback(
    (id: HomeWidget) =>
      setStored((prev) => {
        const s = clean(prev);
        return { ...s, hidden: s.hidden.includes(id) ? s.hidden.filter((x) => x !== id) : [...s.hidden, id] };
      }),
    [setStored],
  );

  const move = useCallback(
    (id: HomeWidget, dir: -1 | 1) =>
      setStored((prev) => {
        const s = clean(prev);
        const i = s.order.indexOf(id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= s.order.length) return s;
        const order = s.order.slice();
        [order[i], order[j]] = [order[j], order[i]];
        return { ...s, order };
      }),
    [setStored],
  );

  const reset = useCallback(() => setStored(DEFAULT), [setStored]);

  return { order: layout.order, hidden: layout.hidden, visible, toggle, move, reset };
}
