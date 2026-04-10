import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { t } = useLocale();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
          paddingHorizontal: 8,
          backgroundColor: theme.background,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color, size }) => <MaterialIcons name="home-filled" size={size} color={color} /> }} />
      <Tabs.Screen name="search" options={{ title: t('tabs.search'), tabBarIcon: ({ color, size }) => <MaterialIcons name="search" size={size} color={color} /> }} />
      <Tabs.Screen name="live" options={{ title: t('tabs.live'), tabBarIcon: ({ color, size }) => <MaterialIcons name="live-tv" size={size} color={color} /> }} />
      <Tabs.Screen name="watchlist" options={{ title: t('tabs.watchlist'), tabBarIcon: ({ color, size }) => <MaterialIcons name="bookmark" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
