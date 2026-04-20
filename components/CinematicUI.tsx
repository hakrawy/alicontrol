import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../constants/theme';
import { useAdaptivePerformance } from '../hooks/useAdaptivePerformance';

export function CinematicBackdrop({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) {
  const perf = useAdaptivePerformance();
  return (
    <View style={[styles.backdrop, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(34,211,238,0.10)', 'rgba(99,102,241,0.08)', 'rgba(10,10,15,0)']}
        style={styles.topWash}
      />
      {!perf.lowPowerVisuals ? (
        <>
          <View pointerEvents="none" style={styles.glowA} />
          <View pointerEvents="none" style={styles.glowB} />
        </>
      ) : null}
      {children}
    </View>
  );
}

export function CinematicHeader({
  eyebrow,
  title,
  subtitle,
  icon = 'auto-awesome',
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerIcon}>
        <MaterialIcons name={icon} size={24} color="#FFF" />
      </View>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function SkeletonGrid({ count = 8, columns = 2 }: { count?: number; columns?: number }) {
  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <Animated.View
          key={index}
          entering={FadeInDown.delay(index * 35).duration(220)}
          style={[styles.skeletonCard, { width: `${100 / columns}%` }]}
        >
          <View style={styles.skeletonPoster} />
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLine} />
        </Animated.View>
      ))}
    </View>
  );
}

export function GlassButton({
  label,
  icon,
  onPress,
  active,
}: {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable style={[styles.glassButton, active && styles.glassButtonActive]} onPress={onPress}>
      {icon ? <MaterialIcons name={icon} size={16} color={active ? '#FFF' : theme.textSecondary} /> : null}
      <Text style={[styles.glassButtonText, active && styles.glassButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.background, overflow: 'hidden' },
  topWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  glowA: { position: 'absolute', top: -120, right: -70, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(34,211,238,0.13)' },
  glowB: { position: 'absolute', bottom: 120, left: -120, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(99,102,241,0.11)' },
  headerCard: { marginHorizontal: 16, marginTop: 8, marginBottom: 12, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(26,26,38,0.72)', padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary },
  eyebrow: { color: '#A7F3D0', fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.7 },
  headerSubtitle: { color: theme.textSecondary, fontSize: 13, marginTop: 4 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingTop: 10 },
  skeletonCard: { padding: 6 },
  skeletonPoster: { aspectRatio: 2 / 3, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  skeletonLineWide: { height: 12, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 10, width: '80%' },
  skeletonLine: { height: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 7, width: '54%' },
  glassButton: { minHeight: 38, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  glassButtonActive: { backgroundColor: theme.primary, borderColor: theme.primaryLight },
  glassButtonText: { color: theme.textSecondary, fontSize: 12, fontWeight: '900' },
  glassButtonTextActive: { color: '#FFF' },
});
