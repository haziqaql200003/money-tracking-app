import { AuroraCard } from './AuroraCard';
import { GlassCard } from './GlassCard';
import { SongketCard } from './SongketCard';

export { AuroraCard, GlassCard, SongketCard };
export type { WakiraCardProps } from './shared';

// Use this list to build the card design picker (all three are Pro)
export const PRO_CARD_DESIGNS = [
  { id: 'songket', name: 'Songket', description: 'Corak tenunan emas atas hitam', Component: SongketCard },
  { id: 'glass', name: 'Glass', description: 'Kaca beku lutsinar', Component: GlassCard },
  { id: 'aurora', name: 'Aurora', description: 'Cahaya aurora bergerak', Component: AuroraCard },
] as const;