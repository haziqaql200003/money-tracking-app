import { AuroraCard } from './AuroraCard';
import { BatikCard } from './BatikCard';
import { DirajaCard } from './DirajaCard';
import { GlassCard } from './GlassCard';
import { SongketCard } from './SongketCard';
import { TitaniumCard } from './TitaniumCard';
import { DEFAULT_ACCENT } from './palette';

export { AuroraCard, BatikCard, DirajaCard, GlassCard, SongketCard, TitaniumCard };
export { CardColorPicker } from './CardColorPicker';
export { ACCENT_PRESETS, DEFAULT_ACCENT } from './palette';
export type { WakiraCardProps } from './shared';

// Use this list to build the card design picker (all are Pro).
// Every card takes an `accent` colour, so Pro users can recolour it.
export const PRO_CARD_DESIGNS = [
  {
    id: 'songket',
    name: 'Songket', // i18n-ignore: design name
    descriptionKey: 'acct.design.songketDesc' as const,
    defaultAccent: DEFAULT_ACCENT.songket,
    Component: SongketCard,
  },
  {
    id: 'glass',
    name: 'Glass', // i18n-ignore: design name
    descriptionKey: 'acct.design.glassDesc' as const,
    defaultAccent: DEFAULT_ACCENT.glass,
    Component: GlassCard,
  },
  {
    id: 'aurora',
    name: 'Aurora', // i18n-ignore: design name
    descriptionKey: 'acct.design.auroraDesc' as const,
    defaultAccent: DEFAULT_ACCENT.aurora,
    Component: AuroraCard,
  },
  {
    id: 'titanium',
    name: 'Titanium', // i18n-ignore: design name
    descriptionKey: 'acct.design.titaniumDesc' as const,
    defaultAccent: DEFAULT_ACCENT.titanium,
    Component: TitaniumCard,
  },
  {
    id: 'diraja',
    name: 'Songket Diraja', // i18n-ignore: design name
    descriptionKey: 'acct.design.dirajaDesc' as const,
    defaultAccent: DEFAULT_ACCENT.diraja,
    Component: DirajaCard,
  },
  {
    id: 'batik',
    name: 'Batik', // i18n-ignore: design name
    descriptionKey: 'acct.design.batikDesc' as const,
    defaultAccent: DEFAULT_ACCENT.batik,
    Component: BatikCard,
  },
] as const;
