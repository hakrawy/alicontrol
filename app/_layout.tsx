import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider } from '@/template';
import { AppProvider } from '../contexts/AppContext';
import { LocaleProvider, useLocale } from '../contexts/LocaleContext';
import { PremiumLoader } from '../components/PremiumLoader';

function AppShell() {
  const { direction } = useLocale();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 850);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, direction }}>
      <StatusBar style="light" />
      {/* Global web max-width centering wrapper */}
      {Platform.OS === 'web' && (
        <style>{`
          :root {
            --app-max-width: 1280px;
          }
          * {
            box-sizing: border-box;
          }
          /* Prevent horizontal overflow on mobile */
          html, body {
            overflow-x: hidden;
            background-color: #0A0A0F;
          }
          /* Smooth scrolling */
          * {
            scroll-behavior: smooth;
          }
          /* Better font rendering */
          body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: geometricPrecision;
            overscroll-behavior: none;
          }
          ::selection {
            background: rgba(99,102,241,0.38);
          }
          ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(15,23,42,0.35);
          }
          ::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, rgba(99,102,241,0.8), rgba(34,211,238,0.65));
            border-radius: 999px;
            border: 2px solid rgba(10,10,15,0.8);
          }
          button, [role="button"] {
            transition: transform 160ms ease, opacity 160ms ease, filter 160ms ease;
          }
          button:active, [role="button"]:active {
            transform: scale(0.985);
          }
          /* Input range styles (used in video player) */
          input[type=range]:focus {
            outline: none;
          }
        `}</style>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0A0A0F' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="content/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="player" options={{ animation: 'fade', orientation: 'all' }} />
        <Stack.Screen name="watchroom" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="settings/[slug]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="admin" />
      </Stack>
      {booting ? <PremiumLoader /> : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AlertProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <LocaleProvider>
            <AppProvider>
              <AppShell />
            </AppProvider>
          </LocaleProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </AlertProvider>
  );
}
