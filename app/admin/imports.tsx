import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAlert } from '@/template';
import { theme } from '../../constants/theme';
import { useLocale } from '../../contexts/LocaleContext';
import * as api from '../../services/api';

type ImportMethod = 'json' | 'csv' | 'url';
type ContentType = 'movie' | 'series';

export default function AdminImports() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showAlert } = useAlert();
  const { language, direction, isRTL } = useLocale();
  const [metadataType, setMetadataType] = useState<ContentType>('movie');
  const [metadataMethod, setMetadataMethod] = useState<ImportMethod>('json');
  const [metadataInput, setMetadataInput] = useState('');
  const [sourcesType, setSourcesType] = useState<'movie' | 'series'>('movie');
  const [sourcesMethod, setSourcesMethod] = useState<ImportMethod>('json');
  const [sourcesInput, setSourcesInput] = useState('');
  const [validateUrl, setValidateUrl] = useState('');
  const [imdbId, setImdbId] = useState('');
  const [imdbType, setImdbType] = useState<ContentType>('movie');
  const [imdbPreview, setImdbPreview] = useState<any | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const copy = language === 'Arabic'
    ? {
        title: 'الاستيراد المتقدم',
        manifestTitle: 'استيراد من Manifest',
        manifestHint: 'إدارة إضافات manifest واستيراد محتواها من الصفحة المخصصة.',
        openManifest: 'فتح إدارة الإضافات',
        metadataTitle: 'استيراد بيانات المحتوى',
        metadataHint: 'استورد بيانات الأفلام أو المسلسلات من JSON أو CSV أو رابط API يعيد بيانات خام.',
        sourcesTitle: 'استيراد مصادر التشغيل',
        sourcesHint: 'استورد الروابط بشكل منفصل واربطها بالمحتوى الموجود حسب imdb_id أو tmdb_id أو title + year.',
        validateTitle: 'فحص رابط تشغيل',
        validateHint: 'اختبر الرابط قبل إضافته واعرف هل يعمل أم لا.',
        imdbTitle: 'استيراد فيلم أو مسلسل عبر IMDb',
        imdbHint: 'اجلب البيانات مباشرة عبر IMDb ID ثم احفظها في مكتبتك.',
        fetchData: 'جلب البيانات',
        saveItem: 'حفظ',
        importNow: 'استيراد الآن',
        checkNow: 'فحص الرابط',
        json: 'JSON',
        csv: 'CSV',
        url: 'رابط API',
        movies: 'أفلام',
        series: 'مسلسلات',
      }
    : {
        title: 'Advanced Imports',
        manifestTitle: 'Import from Manifest',
        manifestHint: 'Manage manifest add-ons and import their catalogs from the dedicated page.',
        openManifest: 'Open Add-ons',
        metadataTitle: 'Import Content Metadata',
        metadataHint: 'Import movies or series metadata from JSON, CSV, or an API URL that returns raw data.',
        sourcesTitle: 'Import Playback Sources',
        sourcesHint: 'Import playback links separately and merge them into existing content by imdb_id, tmdb_id, or title + year.',
        validateTitle: 'Validate Stream URL',
        validateHint: 'Test a playback URL before approving it.',
        imdbTitle: 'Import from IMDb ID',
        imdbHint: 'Fetch one movie or series by IMDb ID, review it, then save it into your library.',
        fetchData: 'Fetch Data',
        saveItem: 'Save',
        importNow: 'Import Now',
        checkNow: 'Validate URL',
        json: 'JSON',
        csv: 'CSV',
        url: 'API URL',
        movies: 'Movies',
        series: 'Series',
      };

  const runMetadataImport = async () => {
    setWorking('metadata');
    try {
      const result = await api.importContentMetadata(metadataType, metadataMethod, metadataInput);
      showAlert('Import complete', `Total: ${result.total}\nImported: ${result.imported}\nMerged: ${result.merged}`);
      setMetadataInput('');
    } catch (error: any) {
      showAlert('Import failed', error?.message || 'Could not import metadata.');
    } finally {
      setWorking(null);
    }
  };

  const runSourceImport = async () => {
    setWorking('sources');
    try {
      const result = await api.importPlaybackSources(sourcesType, sourcesMethod, sourcesInput);
      showAlert('Source import complete', `Total: ${result.total}\nImported: ${result.imported}\nMerged: ${result.merged}\nFailed matches: ${result.failed}`);
      setSourcesInput('');
    } catch (error: any) {
      showAlert('Import failed', error?.message || 'Could not import playback sources.');
    } finally {
      setWorking(null);
    }
  };

  const runValidation = async () => {
    setWorking('validate');
    try {
      const result = await api.validatePlaybackSourceUrl(validateUrl.trim());
      showAlert('Validation result', `${result.status.toUpperCase()}\n${result.message}`);
    } catch (error: any) {
      showAlert('Validation failed', error?.message || 'Could not validate this URL.');
    } finally {
      setWorking(null);
    }
  };

  const fetchImdbMetadata = async () => {
    setWorking('imdb-fetch');
    try {
      const result = await api.fetchCinemetaMetadataByImdbId(imdbId.trim(), imdbType);
      setImdbPreview(result);
    } catch (error: any) {
      showAlert('Fetch failed', error?.message || 'Could not fetch metadata for this IMDb ID.');
    } finally {
      setWorking(null);
    }
  };

  const saveImdbMetadata = async () => {
    setWorking('imdb-save');
    try {
      await api.importContentFromImdbId(imdbId.trim(), imdbType);
      showAlert('Saved', `${imdbPreview?.title || 'Item'} was saved successfully.`);
      setImdbPreview(null);
      setImdbId('');
    } catch (error: any) {
      showAlert('Save failed', error?.message || 'Could not save this IMDb item.');
    } finally {
      setWorking(null);
    }
  };

  return (
    <ScrollView style={[styles.container, { direction }]} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>{copy.title}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{copy.manifestTitle}</Text>
        <Text style={styles.cardHint}>{copy.manifestHint}</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push('/admin/addons')}>
          <Text style={styles.primaryBtnText}>{copy.openManifest}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{copy.imdbTitle}</Text>
        <Text style={styles.cardHint}>{copy.imdbHint}</Text>
        <View style={styles.toggleRow}>
          {(['movie', 'series'] as ContentType[]).map((type) => (
            <Pressable key={type} style={[styles.chip, imdbType === type && styles.chipActive]} onPress={() => setImdbType(type)}>
              <Text style={[styles.chipText, imdbType === type && styles.chipTextActive]}>{type === 'movie' ? copy.movies : copy.series}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={imdbId}
          onChangeText={setImdbId}
          placeholder="tt1234567"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.primaryBtn} onPress={fetchImdbMetadata} disabled={working === 'imdb-fetch'}>
          {working === 'imdb-fetch' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{copy.fetchData}</Text>}
        </Pressable>
        {imdbPreview ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>{imdbPreview.title}</Text>
            <Text style={styles.previewMeta}>{imdbPreview.year} • {imdbPreview.rating || 0}</Text>
            <Text style={styles.previewText}>{imdbPreview.description || 'No synopsis available.'}</Text>
            <Pressable style={styles.primaryBtn} onPress={saveImdbMetadata} disabled={working === 'imdb-save'}>
              {working === 'imdb-save' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{copy.saveItem}</Text>}
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{copy.metadataTitle}</Text>
        <Text style={styles.cardHint}>{copy.metadataHint}</Text>
        <View style={styles.toggleRow}>
          {(['movie', 'series'] as ContentType[]).map((type) => (
            <Pressable key={type} style={[styles.chip, metadataType === type && styles.chipActive]} onPress={() => setMetadataType(type)}>
              <Text style={[styles.chipText, metadataType === type && styles.chipTextActive]}>{type === 'movie' ? copy.movies : copy.series}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.toggleRow}>
          {(['json', 'csv', 'url'] as ImportMethod[]).map((method) => (
            <Pressable key={method} style={[styles.chip, metadataMethod === method && styles.chipActive]} onPress={() => setMetadataMethod(method)}>
              <Text style={[styles.chipText, metadataMethod === method && styles.chipTextActive]}>{copy[method]}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.textarea, { textAlign: isRTL ? 'right' : 'left' }]}
          multiline
          value={metadataInput}
          onChangeText={setMetadataInput}
          placeholder={metadataMethod === 'url' ? 'https://example.com/movies.json' : '[{"title":"Example","year":2024}]'}
          placeholderTextColor={theme.textMuted}
        />
        <Pressable style={styles.primaryBtn} onPress={runMetadataImport} disabled={working === 'metadata'}>
          {working === 'metadata' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{copy.importNow}</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{copy.sourcesTitle}</Text>
        <Text style={styles.cardHint}>{copy.sourcesHint}</Text>
        <View style={styles.toggleRow}>
          {(['movie', 'series'] as const).map((type) => (
            <Pressable key={type} style={[styles.chip, sourcesType === type && styles.chipActive]} onPress={() => setSourcesType(type)}>
              <Text style={[styles.chipText, sourcesType === type && styles.chipTextActive]}>{type === 'movie' ? copy.movies : copy.series}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.toggleRow}>
          {(['json', 'csv', 'url'] as ImportMethod[]).map((method) => (
            <Pressable key={method} style={[styles.chip, sourcesMethod === method && styles.chipActive]} onPress={() => setSourcesMethod(method)}>
              <Text style={[styles.chipText, sourcesMethod === method && styles.chipTextActive]}>{copy[method]}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.textarea, { textAlign: isRTL ? 'right' : 'left' }]}
          multiline
          value={sourcesInput}
          onChangeText={setSourcesInput}
          placeholder={sourcesMethod === 'url' ? 'https://example.com/sources.json' : '[{"title":"Example","year":2024,"server_name":"Server A","stream_url":"https://..."}]'}
          placeholderTextColor={theme.textMuted}
        />
        <Pressable style={styles.primaryBtn} onPress={runSourceImport} disabled={working === 'sources'}>
          {working === 'sources' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{copy.importNow}</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{copy.validateTitle}</Text>
        <Text style={styles.cardHint}>{copy.validateHint}</Text>
        <TextInput
          style={styles.input}
          value={validateUrl}
          onChangeText={setValidateUrl}
          placeholder="https://..."
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable style={styles.primaryBtn} onPress={runValidation} disabled={working === 'validate'}>
          {working === 'validate' ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryBtnText}>{copy.checkNow}</Text>}
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{language === 'Arabic' ? 'إدارة مصادر المحتوى' : 'Manage Content Sources'}</Text>
        <Text style={styles.cardHint}>{language === 'Arabic' ? 'لإضافة المصادر يدويًا أو تعديلها لفيلم أو مسلسل معين.' : 'Open the dedicated source manager to add, edit, validate, or remove sources for one item.'}</Text>
        <Pressable style={styles.secondaryBtn} onPress={() => router.push('/admin/sources')}>
          <Text style={styles.secondaryBtnText}>{language === 'Arabic' ? 'فتح مدير المصادر' : 'Open Source Manager'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 16 },
  card: { backgroundColor: theme.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: theme.border, gap: 12, marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  cardHint: { fontSize: 13, color: theme.textSecondary, lineHeight: 21 },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  chipTextActive: { color: '#FFF' },
  input: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight, paddingHorizontal: 14, color: '#FFF' },
  textarea: { minHeight: 150, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight, paddingHorizontal: 14, paddingVertical: 12, color: '#FFF', textAlignVertical: 'top' },
  primaryBtn: { height: 46, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  secondaryBtn: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  previewCard: { borderRadius: 14, backgroundColor: theme.surfaceLight, borderWidth: 1, borderColor: theme.border, padding: 14, gap: 8 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  previewMeta: { fontSize: 12, color: theme.textSecondary },
  previewText: { fontSize: 13, color: theme.textSecondary, lineHeight: 20 },
});
