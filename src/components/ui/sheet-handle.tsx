import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useIsDesktop } from '@/components/desktop/use-desktop';
import { useTheme } from '@/hooks/use-theme';

/**
 * The grab bar at the top of a bottom sheet. On desktop web the sheet opens as a centred pop-up that cannot be
 * dragged, so the bar is left out there instead of promising a gesture that does nothing.
 */
export function SheetHandle({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  const desktop = useIsDesktop();
  if (desktop) return null;
  return <View style={[style, { backgroundColor: colors.divider }]} />;
}
