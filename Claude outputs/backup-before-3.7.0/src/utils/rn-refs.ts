import type { ComponentRef } from 'react';
import type { ScrollView, TextInput, View } from 'react-native';

/**
 * Instance types for refs. Since React Native 0.88 the types of View, ScrollView and TextInput are
 * components, not the objects a ref gives back, so `useRef<View>` no longer type-checks.
 */
export type ViewRef = ComponentRef<typeof View>;
export type ScrollViewRef = ComponentRef<typeof ScrollView>;
export type TextInputRef = ComponentRef<typeof TextInput>;
