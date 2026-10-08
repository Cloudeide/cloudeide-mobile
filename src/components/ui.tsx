/**
 * The few pieces every screen uses, in the website's colours.
 *
 * Dark only, like the desktop app and the site: a near-black with a trace of
 * warmth, panels a step above it, and white for the one thing to press.
 */

import type { ReactNode } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#0d0c0b',
  panel: '#161513',
  raised: '#1d1b19',
  border: '#272522',
  borderStrong: '#4a453f',
  text: '#f2f2f0',
  text2: '#a8a39c',
  text3: '#6e6963',
  accent: '#e2b062',
  add: '#3fb56b',
  del: '#e5534b',
  online: '#3fb56b',
};

export const mono = 'monospace';

export function Button(props: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'quiet' | 'danger';
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const kind = props.kind ?? 'primary';
  const off = props.disabled || props.busy;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      disabled={off}
      style={({ pressed }) => [
        s.button,
        kind === 'primary' ? s.primary : s.quiet,
        pressed && { opacity: 0.8 },
        off && { opacity: 0.5 },
        props.style,
      ]}
    >
      {props.busy
        ? <ActivityIndicator color={kind === 'primary' ? colors.bg : colors.text} />
        : <Text style={[s.buttonText, kind === 'primary' ? { color: colors.bg } : { color: kind === 'danger' ? colors.del : colors.text }]}>{props.label}</Text>}
    </Pressable>
  );
}

export function Card(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, props.style]}>{props.children}</View>;
}

export function Screen(props: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.screen, props.style]}>{props.children}</View>;
}

/** The mark from the site. */
export function Logo({ size = 40 }: { size?: number }) {
  return <Image source={require('../../assets/logo-white.png')} style={{ width: size, height: size }} accessibilityLabel="CloudeIDE" />;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, padding: 16 },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.text },
  quiet: { backgroundColor: colors.raised, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
  buttonText: { fontSize: 16, fontWeight: '600' },
  h1: { color: colors.text, fontSize: 30, fontWeight: '700', letterSpacing: -0.5 },
  h2: { color: colors.text, fontSize: 18, fontWeight: '600' },
  body: { color: colors.text, fontSize: 16, lineHeight: 23 },
  muted: { color: colors.text2, fontSize: 15, lineHeight: 21 },
  faint: { color: colors.text3, fontSize: 13 },
});
