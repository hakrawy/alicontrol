import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import * as api from '../../services/api';
import type { Movie, PlaybackSourceRecord, Series } from '../../services/api';

const emptyForm = {
  addon_or_provider_name: '',
  server_name: '',
  quality: 'Auto',
  language: '',
  subtitle: '',
  stream_url: '',
  stream_type: 'direct',
  notes: '',
};

export default function AdminSources() {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { language, direction, isRTL } = useLocale();
  const [contentType, setContentType] = useState<'movie' | 'series'>('movie');
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedContentTitle, setSelectedContentTitle] = useState('');
  const [sources, setSources] = useState<PlaybackSourceRecord[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const copy = language === 'Arabic'
    ? {
        title: 'إدارة مصادر التشغيل',
        search: 'ابحث عن فيلم أو مسلسل...',
        choose: 'اختر العنصر أولًا',
        save: 'حفظ المصدر',
        checking: 'فحص',
      }
    : {
        title: 'Playback Source Manager',
        search: 'Search movies or series...',
        choose: 'Choose a content item first',
        save: 'Save Source',
        checking: 'Validate',
      };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [moviesData, seriesData] = await Promise.all([api.fetchAllMoviesAdmin(), api.fetchAllSeriesAdmin()]);
        setMovies(moviesData);
        setSeries(seriesData);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const items = contentType === 'movie' ? movies : series;
  const filteredItems = useMemo(
    () => items.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 20),
    [items, query]
  );

  const loadSources = async (nextContentId: string, nextTitle: string) => {
    setSelectedContentId(nextContentId);
    setSelectedContentTitle(nextTitle);
    setEditingSourceId(null);
    setForm({ ...emptyForm });
    const rows = await api.fetchPlaybackSourceRecords(contentType, nextContentId);
    setSources(rows);
  };

  const saveSource = async () => {
    if (!selectedContentId) {
      showAlert('Missing content', copy.choose);
      return;
    }
    setWorking(true);
    try {
      const validation = await api.validatePlaybackSourceUrl(form.stream_url);
      await api.upsertPlaybackSourceRecord({
        id: editingSourceId || undefined,
        content_type: contentType,
        content_id: selectedContentId,
        ...form,
        status: validation.status,
        last_checked_at: validation.checkedAt,
        source_origin: 'manual',
      });
      await loadSources(selectedContentId, selectedContentTitle);
      setEditingSourceId(null);
      setForm({ ...emptyForm });
    } catch (error: any) {
      showAlert('Save failed', error?.message || 'Could not save this playback source.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>{copy.title}</Text>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          {(['movie', 'series'] as const).map((type) => (
            <Pressable key={type} style={[styles.chip, contentType === type && styles.chipActive]} onPress={() => { setContentType(type); setSelectedContentId(null); setSelectedContentTitle(''); setSources([]); }}>
              <Text style={[styles.chipText, contentType === type && styles.chipTextActive]}>{type === 'movie' ? (language === 'Arabic' ? 'أفلام' : 'Movies') : (language === 'Arabic' ? 'مسلسلات' : 'Series')}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={copy.search}
          placeholderTextColor={theme.textMuted}
          textAlign={isRTL ? 'right' : 'left'}
        />
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <Pressable key={item.id} style={[styles.listItem, selectedContentId === item.id && styles.listItemActive]} onPress={() => void loadSources(item.id, item.title)}>
              <Text style={styles.listTitle}>{item.title}</Text>
              <Text style={styles.listMeta}>{item.year}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{selectedContentTitle || copy.choose}</Text>
        <TextInput style={styles.input} value={form.addon_or_provider_name} onChangeText={(value) => setForm((prev) => ({ ...prev, addon_or_provider_name: value }))} placeholder="Provider / Add-on" placeholderTextColor={theme.textMuted} />
        <TextInput style={styles.input} value={form.server_name} onChangeText={(value) => setForm((prev) => ({ ...prev, server_name: value }))} placeholder="Server name" placeholderTextColor={theme.textMuted} />
        <TextInput style={styles.input} value={form.quality} onChangeText={(value) => setForm((prev) => ({ ...prev, quality: value }))} placeholder="Quality" placeholderTextColor={theme.textMuted} />
        <TextInput style={styles.input} value={form.language} onChangeText={(value) => setForm((prev) => ({ ...prev, language: value }))} placeholder="Language" placeholderTextColor={theme.textMuted} />
        <TextInput style={styles.input} value={form.subtitle} onChangeText={(value) => setForm((prev) => ({ ...prev, subtitle: value }))} placeholder="Subtitle URL or label" placeholderTextColor={theme.textMuted} />
        <TextInput style={styles.input} value={form.stream_type} onChangeText={(value) => setForm((prev) => ({ ...prev, stream_type: value }))} placeholder="Stream type" placeholderTextColor={theme.textMuted} />
        <TextInput style={styles.input} value={form.stream_url} onChangeText={(value) => setForm((prev) => ({ ...prev, stream_url: value }))} placeholder="https://..." placeholderTextColor={theme.textMuted} autoCapitalize="none" autoCorrect={false} />
        <TextInput style={[styles.input, styles.notes]} value={form.notes} onChangeText={(value) => setForm((prev) => ({ ...prev, notes: value }))} placeholder="Notes" placeholderTextColor={theme.textMuted} multiline />
        <Pressable style={styles.primaryBtn} onPress={saveSource} disabled={working}>
          {working ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{copy.save}</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{language === 'Arabic' ? 'المصادر الحالية' : 'Current Sources'}</Text>
        {sources.map((source) => (
          <View key={source.id} style={styles.sourceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sourceTitle}>{source.addon_or_provider_name || source.server_name || 'Source'}</Text>
              <Text style={styles.sourceMeta}>{source.server_name} • {source.quality} • {source.status}</Text>
            </View>
            <Pressable
              style={styles.iconBtn}
              onPress={() => {
                setForm({
                  addon_or_provider_name: source.addon_or_provider_name,
                  server_name: source.server_name,
                  quality: source.quality,
                  language: source.language,
                  subtitle: source.subtitle,
                  stream_url: source.stream_url,
                  stream_type: source.stream_type,
                  notes: source.notes,
                });
                setEditingSourceId(source.id);
              }}
            >
              <MaterialIcons name="edit" size={18} color={theme.primary} />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={async () => {
                const checked = await api.validatePlaybackSourceRecord(source.id);
                await loadSources(checked.content_id, selectedContentTitle);
              }}
            >
              <MaterialIcons name="verified" size={18} color={theme.accent} />
            </Pressable>
            <Pressable
              style={styles.iconBtn}
              onPress={async () => {
                await api.deletePlaybackSourceRecord(source.id);
                if (selectedContentId) {
                  await loadSources(selectedContentId, selectedContentTitle);
                }
              }}
            >
              <MaterialIcons name="delete" size={18} color={theme.error} />
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 16 },
  card: { backgroundColor: theme.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border, gap: 10, marginBottom: 14 },
  toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  chipTextActive: { color: '#FFF' },
  input: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight, paddingHorizontal: 14, color: '#FFF' },
  notes: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  list: { gap: 8 },
  listItem: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  listItemActive: { borderColor: theme.primary, backgroundColor: theme.primaryDark },
  listTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  listMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  primaryBtn: { height: 46, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surfaceLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border },
  sourceTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  sourceMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
});
