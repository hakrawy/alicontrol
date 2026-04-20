import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export function AdminPageShell({
  title,
  subtitle,
  icon = 'dashboard',
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.shell}>
      <LinearGradient colors={['rgba(99,102,241,0.16)', 'rgba(34,211,238,0.08)', 'rgba(10,10,15,0)']} style={styles.wash} pointerEvents="none" />
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.header}>
        <View style={styles.icon}>
          <MaterialIcons name={icon} size={24} color="#FFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: theme.background, overflow: 'hidden' },
  wash: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 },
  glow: { position: 'absolute', top: -130, right: -120, width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(34,211,238,0.10)' },
  header: { marginHorizontal: 16, marginTop: 14, marginBottom: 12, padding: 16, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(26,26,38,0.74)', flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 50, height: 50, borderRadius: 17, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 23, fontWeight: '900', letterSpacing: -0.4 },
  subtitle: { color: theme.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
});
