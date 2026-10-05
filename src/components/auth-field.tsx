import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/i18n';

type Props = TextInputProps & { label: string };

export function AuthField({ label, secureTextEntry, ...props }: Props) {
  const colors = useTheme();
  const { t } = useT();
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrap}>
      <ThemedText type="small" style={{ color: colors.textSecondary, marginBottom: Spacing.one }}>
        {label}
      </ThemedText>
      <View style={[styles.box, { backgroundColor: colors.backgroundElement, borderColor: colors.divider }]}>
        <TextInput
          {...props}
          secureTextEntry={hidden}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { color: colors.text }]}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10} accessibilityLabel={t('auth.field.toggleHint')}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.three },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: Spacing.three },
  input: { flex: 1, fontSize: 16, paddingVertical: 14 },
});
