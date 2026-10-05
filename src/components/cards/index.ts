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
    name: 'Songket',
    description: 'Corak tenunan emas atas hitam',
    defaultAccent: DEFAULT_ACCENT.songket,
    Component: SongketCard,
  },
  {
    id: 'glass',
    name: 'Glass',
    description: 'Kaca berkilat dengan cahaya warna di dalam',
    defaultAccent: DEFAULT_ACCENT.glass,
    Component: GlassCard,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Aurora atas gunung salji, tasik dan kabin bercahaya',
    defaultAccent: DEFAULT_ACCENT.aurora,
    Component: AuroraCard,
  },
  {
    id: 'titanium',
    name: 'Titanium',
    description: 'Kad hitam titanium, logam berus dan cip',
    defaultAccent: DEFAULT_ACCENT.titanium,
    Component: TitaniumCard,
  },
  {
    id: 'diraja',
    name: 'Songket Diraja',
    description: 'Songket merah hati bertenun emas, dengan kepala kain dan pucuk rebung',
    defaultAccent: DEFAULT_ACCENT.diraja,
    Component: DirajaCard,
  },
  {
    id: 'batik',
    name: 'Batik',
    description: 'Bunga raya bercanting, awan larat dan warna celup',
    defaultAccent: DEFAULT_ACCENT.batik,
    Component: BatikCard,
  },
] as const;
