import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export function PremiumLoader({ label = 'ali dohal', hint = 'Preparing your cinematic experience' }: { label?: string; hint?: string }) {
  return (
    <View style={styles.overlay}>
      <LinearGradient colors={['rgba(10,10,15,0.94)', 'rgba(15,23,42,0.98)', '#020617']} style={StyleSheet.absoluteFill} />
      <View style={styles.orbA} />
      <View style={styles.orbB} />
      <View style={styles.card}>
        <View style={styles.logoShell}>
          <LinearGradient colors={['rgba(34,211,238,0.9)', 'rgba(99,102,241,0.85)', 'rgba(16,185,129,0.8)']} style={styles.logo}>
            <MaterialIcons name="play-arrow" size={42} color="#FFF" />
          </LinearGradient>
        </View>
        <Text style={styles.brand}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#A7F3D0" />
          <Text style={styles.loadingText}>Loading premium layers</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orbA: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(34,211,238,0.18)', top: -80, right: -60 },
  orbB: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(16,185,129,0.14)', bottom: -120, left: -90 },
  card: { width: 300, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(15,23,42,0.72)', alignItems: 'center', padding: 24, shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 28, shadowOffset: { width: 0, height: 16 } },
  logoShell: { width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  logo: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  brand: { marginTop: 18, color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 0.8, textTransform: 'lowercase' },
  hint: { marginTop: 6, color: theme.textSecondary, fontSize: 12, textAlign: 'center' },
  loadingRow: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: '#D1FAE5', fontSize: 12, fontWeight: '800' },
});
