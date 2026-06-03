import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, sp, r, font } from '../theme';

interface Props {
  children: ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={s.wrap}>
        <Text style={s.icon}>⚠️</Text>
        <Text style={s.title}>Etwas ist schiefgelaufen</Text>
        <Text style={s.msg}>{this.props.label ?? 'Dieser Tab'} konnte nicht geladen werden.</Text>
        <Text style={s.detail} numberOfLines={3}>
          {this.state.error?.message}
        </Text>
        <TouchableOpacity style={s.btn} onPress={() => this.setState({ hasError: false, error: null })}>
          <Text style={s.btnTxt}>Neu laden</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: sp.xl, gap: sp.md },
  icon: { fontSize: 40 },
  title: { ...font.h3, textAlign: 'center' },
  msg: { ...font.small, textAlign: 'center' },
  detail: { fontSize: 11, color: colors.textMuted, textAlign: 'center', fontFamily: 'monospace' },
  btn: { marginTop: sp.sm, backgroundColor: colors.accent, borderRadius: r.full, paddingHorizontal: sp.lg, paddingVertical: sp.sm },
  btnTxt: { color: colors.bg, fontWeight: '700' },
});
