import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import type { IconName } from '@/constants/categories';

type Props = { icon: IconName; color: string; size?: number };

/** Round tinted badge with a vector icon (replaces the old emoji circle). */
export function CategoryIcon({ icon, color, size = 42 }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${color}26`, // ~15% tint
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}