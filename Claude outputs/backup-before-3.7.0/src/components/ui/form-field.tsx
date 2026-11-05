import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FieldProps = {
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Label + control + helper/error. Wrap any control (chips, pickers) or use <TextField>. */
export function FormField({ label, helper, error, children, style }: FieldProps) {
  const colors = useTheme();
  return (
    <View style={[styles.field, style]}>
      <Text style={[Type.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
      {error ? (
        <Text style={[Type.caption, { color: colors.negative }]} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text style={[Type.caption, { color: colors.textSecondary }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  helper?: string;
  error?: string;
  style?: StyleProp<ViewStyle>;
};

export function TextField({ label, helper, error, style, ...input }: TextFieldProps) {
  const colors = useTheme();
  return (
    <FormField label={label} helper={helper} error={error} style={style}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        {...input}
        style={[
          Type.body,
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderColor: error ? colors.negative : colors.divider,
          },
        ]}
      />
    </FormField>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one + 2, marginTop: Spacing.three },
  input: { minHeight: 52, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three },
});
