import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native'; // atau hook anda sendiri

export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light'; // sebarang nilai lain jatuh ke 'light'
  return Colors[theme];
}