import { ActivityIndicator } from 'react-native';

import { ThemedView } from '@/components/themed-view';

/**
 * The browser returns here after Google sign-in (wakira://auth-callback). The sign-in sheet picks the address up
 * itself; this screen only exists so the router has somewhere to land instead of showing "unmatched route".
 */
export default function AuthCallback() {
  return (
    <ThemedView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </ThemedView>
  );
}
