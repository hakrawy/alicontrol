import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/template';
import { useAppContext } from '../../contexts/AppContext';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';

export default function AdminLayout() {
  const { user, loading: authLoading, initialized } = useAuth();
  const { isAdmin, userDataLoading } = useAppContext();
  const { language } = useLocale();
  const copy = language === 'Arabic'
    ? {
        dashboard: 'لوحة الإدارة',
        movies: 'إدارة الأفلام',
        series: 'إدارة المسلسلات',
        adult: 'إدارة محتوى +18',
        channels: 'إدارة القنوات',
        imports: 'استيراد TMDB',
        users: 'إدارة المستخدمين',
        banners: 'إدارة البنرات',
        settings: 'إعدادات التطبيق',
      }
    : {
        dashboard: 'Admin Dashboard',
        movies: 'Manage Movies',
        series: 'Manage Series',
        adult: 'Manage +18 Content',
        channels: 'Manage Channels',
        imports: 'TMDB Imports',
        users: 'Manage Users',
        banners: 'Manage Banners',
        settings: 'App Settings',
      };

  if (authLoading || !initialized || userDataLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!isAdmin) {
    return <Redirect href="/(tabs)/profile" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: '#FFF',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: copy.dashboard }} />
      <Stack.Screen name="movies" options={{ title: copy.movies }} />
      <Stack.Screen name="series" options={{ title: copy.series }} />
      <Stack.Screen name="adult" options={{ title: copy.adult }} />
      <Stack.Screen name="channels" options={{ title: copy.channels }} />
      <Stack.Screen name="imports" options={{ title: copy.imports }} />
      <Stack.Screen name="users" options={{ title: copy.users }} />
      <Stack.Screen name="banners" options={{ title: copy.banners }} />
      <Stack.Screen name="settings" options={{ title: copy.settings }} />
    </Stack>
  );
}
