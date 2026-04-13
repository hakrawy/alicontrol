import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { theme } from '../../constants/theme';
import * as api from '../../services/api';
import { useLocale } from '../../contexts/LocaleContext';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  color: string;
}

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, direction, isRTL } = useLocale();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const copy = useMemo(
    () =>
      language === 'Arabic'
        ? {
            totalUsers: 'إجمالي المستخدمين',
            movies: 'الأفلام',
            series: 'المسلسلات',
            adult: 'عناوين +18',
            activeRooms: 'الغرف النشطة',
            channels: 'القنوات',
            banners: 'البنرات',
            management: 'الإدارة',
            manageMovies: 'إدارة الأفلام',
            manageSeries: 'إدارة المسلسلات',
            manageAdult: 'إدارة محتوى +18',
            manageChannels: 'إدارة القنوات',
            tmdbImports: 'استيراد TMDB',
            manageUsers: 'إدارة المستخدمين',
            manageBanners: 'إدارة البنرات',
            settings: 'إعدادات التطبيق',
            items: 'عنصر',
            topMovies: 'الأفلام الأعلى مشاهدة',
            topSeries: 'المسلسلات الأعلى مشاهدة',
            views: 'مشاهدة',
            rating: 'تقييم',
          }
        : {
            totalUsers: 'Total Users',
            movies: 'Movies',
            series: 'Series',
            adult: 'Adult Titles',
            activeRooms: 'Active Rooms',
            channels: 'Channels',
            banners: 'Banners',
            management: 'MANAGEMENT',
            manageMovies: 'Manage Movies',
            manageSeries: 'Manage Series',
            manageAdult: 'Manage +18 Content',
            manageChannels: 'Manage Channels',
            tmdbImports: 'TMDB Imports',
            manageUsers: 'Manage Users',
            manageBanners: 'Manage Banners',
            settings: 'App Settings',
            items: 'items',
            topMovies: 'TOP MOVIES BY VIEWS',
            topSeries: 'TOP SERIES BY VIEWS',
            views: 'views',
            rating: 'rating',
          },
    [language]
  );

  const load = async () => {
    try {
      const data = await api.fetchAnalytics();
      setAnalytics(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const stats: StatCard[] = analytics
    ? [
        { label: copy.totalUsers, value: analytics.totalUsers, icon: 'people', color: theme.primary },
        { label: copy.movies, value: analytics.totalMovies, icon: 'movie', color: theme.accent },
        { label: copy.series, value: analytics.totalSeries, icon: 'tv', color: theme.success },
        { label: copy.adult, value: analytics.totalAdultContent || 0, icon: 'shield', color: '#C084FC' },
        { label: copy.activeRooms, value: analytics.activeRooms, icon: 'groups', color: theme.error },
        { label: copy.channels, value: analytics.totalChannels, icon: 'live-tv', color: theme.info },
        { label: copy.banners, value: analytics.totalBanners, icon: 'image', color: '#EC4899' },
      ]
    : [];

  const menuItems = [
    { label: copy.manageMovies, icon: 'movie', route: '/admin/movies', color: theme.accent, count: analytics?.totalMovies },
    { label: copy.manageSeries, icon: 'tv', route: '/admin/series', color: theme.success, count: analytics?.totalSeries },
    { label: copy.manageAdult, icon: 'shield', route: '/admin/adult', color: '#C084FC', count: analytics?.totalAdultContent || 0 },
    { label: copy.manageChannels, icon: 'live-tv', route: '/admin/channels', color: theme.error, count: analytics?.totalChannels },
    { label: copy.tmdbImports, icon: 'cloud-download', route: '/admin/imports', color: '#38BDF8' },
    { label: copy.manageUsers, icon: 'people', route: '/admin/users', color: theme.primary, count: analytics?.totalUsers },
    { label: copy.manageBanners, icon: 'image', route: '/admin/banners', color: '#EC4899', count: analytics?.totalBanners },
    { label: copy.settings, icon: 'settings', route: '/admin/settings', color: theme.textSecondary },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { direction }]}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
          progressBackgroundColor={theme.surface}
        />
      }
    >
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <Animated.View key={stat.label} entering={FadeInDown.delay(index * 60).duration(320)} style={styles.statCard}>
            <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}20` }]}>
              <MaterialIcons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Animated.View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>{copy.management}</Text>
      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <Animated.View key={item.label} entering={FadeInDown.delay(180 + index * 50).duration(320)}>
            <Pressable style={[styles.menuCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} onPress={() => router.push(item.route as any)}>
              <View style={[styles.menuIconWrap, { backgroundColor: `${item.color}20` }]}>
                <MaterialIcons name={item.icon as any} size={28} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLabel, { textAlign: isRTL ? 'right' : 'left' }]}>{item.label}</Text>
                {item.count !== undefined ? <Text style={[styles.menuCount, { textAlign: isRTL ? 'right' : 'left' }]}>{item.count} {copy.items}</Text> : null}
              </View>
              <MaterialIcons name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={theme.textMuted} />
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {analytics?.topMovies?.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{copy.topMovies}</Text>
          {analytics.topMovies.map((movie: any, index: number) => (
            <Animated.View key={movie.id} entering={FadeInDown.delay(320 + index * 40).duration(260)}>
              <View style={[styles.topItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.topRank}>#{index + 1}</Text>
                {movie.poster ? <Image source={{ uri: movie.poster }} style={styles.topPoster} contentFit="cover" transition={180} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{movie.title}</Text>
                  <Text style={[styles.topMeta, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {api.formatViewers(movie.view_count)} {copy.views} · {movie.rating} {copy.rating}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </>
      ) : null}

      {analytics?.topSeries?.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{copy.topSeries}</Text>
          {analytics.topSeries.map((series: any, index: number) => (
            <Animated.View key={series.id} entering={FadeInDown.delay(420 + index * 40).duration(260)}>
              <View style={[styles.topItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.topRank}>#{index + 1}</Text>
                {series.poster ? <Image source={{ uri: series.poster }} style={styles.topPoster} contentFit="cover" transition={180} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.topTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{series.title}</Text>
                  <Text style={[styles.topMeta, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {api.formatViewers(series.view_count)} {copy.views} · {series.rating} {copy.rating}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: '47%', backgroundColor: theme.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, gap: 8 },
  statIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  menuGrid: { gap: 8, marginBottom: 24 },
  menuCard: { alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  menuIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#FFF' },
  menuCount: { fontSize: 12, color: theme.textSecondary, marginTop: 1 },
  topItem: { alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border },
  topRank: { fontSize: 18, fontWeight: '800', color: theme.primary, width: 32, textAlign: 'center' },
  topPoster: { width: 36, height: 54, borderRadius: 6 },
  topTitle: { fontSize: 14, fontWeight: '600', color: '#FFF' },
  topMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
});
