import * as externalImport from './externalImport';
import type { ExternalImportItem, ExternalImportPreview } from './externalImport';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { importM3U as importM3UEdge, importXtream as importXtreamEdge } from '@/src/lib/edgeFunctions';
import { getErrorMessage } from '@/services/http';

export interface XtreamCredentials {
  host: string;
  username: string;
  password: string;
  fullUrl?: string;
}

export interface ImportSystemPreview extends ExternalImportPreview {
  liveCount: number;
  vodCount: number;
  seriesCount: number;
  endpointStatus: Array<{ name: string; ok: boolean; message: string }>;
}

export interface ImportHistoryEntry {
  id: string;
  mode: 'xtream' | 'm3u';
  label: string;
  requestedUrl: string;
  resolvedUrl: string;
  createdAt: string;
  total: number;
  imported: number;
  skipped: number;
  validated: number;
  status: 'success' | 'failed';
  message: string;
}

const IMPORT_HISTORY_KEY = 'import_history_v1';
const IMPORT_HISTORY_LIMIT = 8;

function cleanHost(host: string) {
  let value = String(host || '').trim();
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`.replace(/\/+$/, '');
  } catch {
    return value.replace(/\/+$/, '');
  }
}

function parseFullM3UUrl(fullUrl: string): XtreamCredentials | null {
  try {
    const value = /^https?:\/\//i.test(fullUrl.trim()) ? fullUrl.trim() : `http://${fullUrl.trim()}`;
    const parsed = new URL(value);
    const username = parsed.searchParams.get('username') || '';
    const password = parsed.searchParams.get('password') || '';
    if (!username || !password) return null;
    return {
      host: `${parsed.protocol}//${parsed.host}`,
      username,
      password,
      fullUrl: value,
    };
  } catch {
    return null;
  }
}

export function normalizeXtreamCredentials(input: XtreamCredentials): XtreamCredentials {
  if (input.fullUrl?.trim()) {
    const parsed = parseFullM3UUrl(input.fullUrl.trim());
    if (parsed) return parsed;
  }
  return {
    host: cleanHost(input.host),
    username: input.username.trim(),
    password: input.password.trim(),
    fullUrl: input.fullUrl?.trim() || '',
  };
}

function isValidCredentials(credentials: XtreamCredentials) {
  const normalized = normalizeXtreamCredentials(credentials);
  return Boolean(normalized.host && normalized.username && normalized.password);
}

function apiUrl(credentials: XtreamCredentials, action: string, params: Record<string, string | number | undefined> = {}) {
  const normalized = normalizeXtreamCredentials(credentials);
  const url = new URL(`${cleanHost(normalized.host)}/player_api.php`);
  url.searchParams.set('username', normalized.username);
  url.searchParams.set('password', normalized.password);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchJsonEndpoint<T>(url: string, timeoutMs = 18000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json,*/*' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

function buildFallbackWarning(mode: 'xtream' | 'm3u', error: unknown) {
  const message = getErrorMessage(error, 'Unknown error');
  return `${mode.toUpperCase()} server import fallback used: ${message}`;
}

function createHistoryId() {
  return `import_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function fetchImportHistory() {
  try {
    const raw = await AsyncStorage.getItem(IMPORT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ImportHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function recordImportHistoryEntry(
  entry: Omit<ImportHistoryEntry, 'id' | 'createdAt'> & { createdAt?: string }
) {
  const current = await fetchImportHistory();
  const next: ImportHistoryEntry = {
    id: createHistoryId(),
    createdAt: entry.createdAt || new Date().toISOString(),
    mode: entry.mode,
    label: entry.label,
    requestedUrl: entry.requestedUrl,
    resolvedUrl: entry.resolvedUrl,
    total: Number(entry.total || 0),
    imported: Number(entry.imported || 0),
    skipped: Number(entry.skipped || 0),
    validated: Number(entry.validated || 0),
    status: entry.status,
    message: entry.message,
  };

  const nextHistory = [next, ...current].slice(0, IMPORT_HISTORY_LIMIT);
  await AsyncStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(nextHistory));
  return next;
}

export async function clearImportHistory() {
  await AsyncStorage.removeItem(IMPORT_HISTORY_KEY);
}

function categoryLabel(categories: Record<string, string>, id: unknown, fallback = '') {
  return categories[String(id || '')] || fallback || 'Imported';
}

function makeItem(input: Partial<ExternalImportItem> & { name: string; url: string }, index: number): ExternalImportItem {
  return {
    id: input.id || `xtream_${index}_${String(input.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`,
    selected: input.selected ?? true,
    name: input.name,
    logo: input.logo || '',
    group: input.group || 'Xtream',
    url: input.url,
    type: input.type || 'channel',
    streamType: input.streamType || (input.url.includes('.m3u8') ? 'hls' : 'direct'),
    quality: input.quality || 'Auto',
    language: input.language || '',
    server: input.server || 'Xtream',
    provider: input.provider || 'Xtream Codes',
    sourceKind: input.sourceKind || 'api',
    headers: input.headers || {},
    referer: input.referer || '',
    userAgent: input.userAgent || '',
    externalId: input.externalId || input.id || input.url,
    raw: input.raw || {},
    status: input.status || 'untested',
    statusMessage: input.statusMessage || 'Not tested yet',
  };
}

async function fetchCategories(credentials: XtreamCredentials) {
  const endpoints = [
    ['live', 'get_live_categories'],
    ['vod', 'get_vod_categories'],
    ['series', 'get_series_categories'],
  ] as const;
  const result: Record<string, string> = {};
  await Promise.all(endpoints.map(async ([prefix, action]) => {
    try {
      const rows = await fetchJsonEndpoint<any[]>(apiUrl(credentials, action), 9000);
      rows.forEach((row) => {
        result[`${prefix}:${row.category_id}`] = row.category_name || row.name || '';
      });
    } catch {
      // Categories are helpful but not required for import.
    }
  }));
  return result;
}

function liveUrl(credentials: XtreamCredentials, streamId: string | number, extension = 'ts') {
  const normalized = normalizeXtreamCredentials(credentials);
  return `${cleanHost(normalized.host)}/live/${encodeURIComponent(normalized.username)}/${encodeURIComponent(normalized.password)}/${streamId}.${extension || 'ts'}`;
}

function movieUrl(credentials: XtreamCredentials, streamId: string | number, extension = 'mp4') {
  const normalized = normalizeXtreamCredentials(credentials);
  return `${cleanHost(normalized.host)}/movie/${encodeURIComponent(normalized.username)}/${encodeURIComponent(normalized.password)}/${streamId}.${extension || 'mp4'}`;
}

function seriesUrl(credentials: XtreamCredentials, episodeId: string | number, extension = 'mp4') {
  const normalized = normalizeXtreamCredentials(credentials);
  return `${cleanHost(normalized.host)}/series/${encodeURIComponent(normalized.username)}/${encodeURIComponent(normalized.password)}/${episodeId}.${extension || 'mp4'}`;
}

function mapLiveStreams(rows: any[], credentials: XtreamCredentials, categories: Record<string, string>) {
  return rows.map((row, index) => makeItem({
    id: `live_${row.stream_id || index}`,
    name: row.name || `Live ${index + 1}`,
    logo: row.stream_icon || '',
    group: categoryLabel(categories, `live:${row.category_id}`, row.category_name),
    url: liveUrl(credentials, row.stream_id, 'ts'),
    type: 'channel',
    streamType: 'ts',
    server: 'Xtream Live',
    externalId: String(row.stream_id || ''),
    raw: row,
  }, index));
}

function mapVodStreams(rows: any[], credentials: XtreamCredentials, categories: Record<string, string>) {
  return rows.map((row, index) => makeItem({
    id: `vod_${row.stream_id || index}`,
    name: row.name || `Movie ${index + 1}`,
    logo: row.stream_icon || row.cover || '',
    group: categoryLabel(categories, `vod:${row.category_id}`, row.category_name),
    url: movieUrl(credentials, row.stream_id, row.container_extension || 'mp4'),
    type: 'movie',
    streamType: row.container_extension === 'm3u8' ? 'hls' : 'mp4',
    quality: row.rating_5based ? `${row.rating_5based}/5` : 'Auto',
    server: 'Xtream VOD',
    externalId: String(row.stream_id || ''),
    raw: row,
  }, index));
}

async function mapSeries(rows: any[], credentials: XtreamCredentials, categories: Record<string, string>, maxInfoRequests: number) {
  const items: ExternalImportItem[] = [];
  const limitedRows = rows.slice(0, Math.max(0, maxInfoRequests));

  for (const [index, row] of rows.entries()) {
    let firstEpisode: any = null;
    if (index < limitedRows.length) {
      try {
        const info = await fetchJsonEndpoint<any>(apiUrl(credentials, 'get_series_info', { series_id: row.series_id }), 12000);
        const seasons = Object.values(info?.episodes || {}).flat() as any[];
        firstEpisode = seasons.find((episode) => episode?.id || episode?.episode_id) || null;
      } catch {
        firstEpisode = null;
      }
    }

    items.push(makeItem({
      id: `series_${row.series_id || index}`,
      name: row.name || `Series ${index + 1}`,
      logo: row.cover || row.series_icon || '',
      group: categoryLabel(categories, `series:${row.category_id}`, row.category_name),
      url: firstEpisode ? seriesUrl(credentials, firstEpisode.id || firstEpisode.episode_id, firstEpisode.container_extension || 'mp4') : `xtream-series://${row.series_id}`,
      type: 'series',
      streamType: firstEpisode ? 'mp4' : 'direct',
      server: firstEpisode ? 'Xtream Series Episode' : 'Xtream Series',
      externalId: String(row.series_id || ''),
      raw: row,
      status: firstEpisode ? 'untested' : 'unknown',
      statusMessage: firstEpisode ? 'First episode attached' : 'Series imported without episode stream. Use sync later to hydrate episodes.',
    }, index));
  }
  return items;
}

async function buildLocalXtreamPreview(
  credentialsInput: XtreamCredentials,
  options?: { includeSeriesInfo?: boolean; maxSeriesInfoRequests?: number }
) {
  const credentials = normalizeXtreamCredentials(credentialsInput);
  const warnings: string[] = [];

  const fetchRows = async (action: string, label: string) => {
    try {
      return await fetchJsonEndpoint<any[]>(apiUrl(credentials, action), 12000);
    } catch (error) {
      warnings.push(`${label}: ${getErrorMessage(error, 'Unavailable')}`);
      return [] as any[];
    }
  };

  const [categories, liveRows, vodRows, seriesRows] = await Promise.all([
    fetchCategories(credentials).catch((error) => {
      warnings.push(`Categories: ${getErrorMessage(error, 'Unavailable')}`);
      return {} as Record<string, string>;
    }),
    fetchRows('get_live_streams', 'Live streams'),
    fetchRows('get_vod_streams', 'VOD streams'),
    fetchRows('get_series', 'Series'),
  ]);

  const seriesInfoRequests = options?.includeSeriesInfo
    ? Math.max(0, options.maxSeriesInfoRequests ?? 3)
    : 0;

  const items = [
    ...mapLiveStreams(liveRows, credentials, categories),
    ...mapVodStreams(vodRows, credentials, categories),
    ...(await mapSeries(seriesRows, credentials, categories, seriesInfoRequests)),
  ];

  return {
    provider: 'custom',
    requestedUrl: credentials.fullUrl || credentials.host,
    resolvedUrl: credentials.fullUrl || credentials.host,
    sourceKind: 'api',
    contentType: 'application/json',
    total: items.length,
    items,
    warnings,
    liveCount: items.filter((item) => item.type === 'channel').length,
    vodCount: items.filter((item) => item.type === 'movie').length,
    seriesCount: items.filter((item) => item.type === 'series').length,
    endpointStatus: [
      { name: 'Live streams', ok: liveRows.length > 0, message: `${liveRows.length} items` },
      { name: 'VOD streams', ok: vodRows.length > 0, message: `${vodRows.length} items` },
      { name: 'Series', ok: seriesRows.length > 0, message: `${seriesRows.length} items` },
    ],
  } as ImportSystemPreview;
}

async function buildLocalM3UPreview(url: string) {
  const preview = await externalImport.readExternalImportSource(url, 'playlist');
  const items = Array.isArray(preview.items) ? (preview.items as ExternalImportItem[]) : [];
  return {
    provider: 'playlist',
    requestedUrl: url,
    resolvedUrl: preview.resolvedUrl || url,
    sourceKind: 'm3u',
    contentType: preview.contentType || 'application/vnd.apple.mpegurl',
    total: Number(preview.total || items.length || 0),
    items,
    warnings: Array.isArray(preview.warnings) ? preview.warnings : [],
    liveCount: Number(items.filter((item) => item.type === 'channel').length),
    vodCount: Number(items.filter((item) => item.type === 'movie').length),
    seriesCount: Number(items.filter((item) => item.type === 'series').length),
    endpointStatus: [{ name: 'M3U', ok: items.length > 0 || Number(preview.total || 0) > 0, message: `${items.length || Number(preview.total || 0)} items` }],
  } as ImportSystemPreview;
}

export async function readXtreamPreview(credentialsInput: XtreamCredentials, options?: { includeSeriesInfo?: boolean; maxSeriesInfoRequests?: number }) {
  const credentials = normalizeXtreamCredentials(credentialsInput);
  if (!isValidCredentials(credentials)) {
    throw new Error('Host, username, and password are required.');
  }

  try {
    const result = await importXtreamEdge({
      host: credentials.host,
      username: credentials.username,
      password: credentials.password,
    });

    const items = Array.isArray(result.items) ? result.items as ExternalImportItem[] : [];
    return {
      provider: 'custom',
      requestedUrl: credentials.fullUrl || credentials.host,
      resolvedUrl: result.resolvedUrl || credentials.fullUrl || credentials.host,
      sourceKind: 'api',
      contentType: result.contentType || 'application/json',
      total: Number(result.total || items.length || 0),
      items,
      warnings: Array.isArray(result.warnings) ? result.warnings : [],
      liveCount: Number(result.liveCount || items.filter((item) => item.type === 'channel').length),
      vodCount: Number(result.vodCount || items.filter((item) => item.type === 'movie').length),
      seriesCount: Number(result.seriesCount || items.filter((item) => item.type === 'series').length),
      endpointStatus: Array.isArray(result.endpointStatus)
        ? result.endpointStatus as ImportSystemPreview['endpointStatus']
        : [],
    } as ImportSystemPreview;
  } catch (error) {
    const fallback = await buildLocalXtreamPreview(credentials, options);
    return {
      ...fallback,
      warnings: [...(fallback.warnings || []), buildFallbackWarning('xtream', error)],
      endpointStatus: [
        { name: 'Edge Function', ok: false, message: getErrorMessage(error, 'Unavailable') },
        ...(fallback.endpointStatus || []),
      ],
    } as ImportSystemPreview;
  }
}

export async function readM3UImportPreview(url: string) {
  try {
    const preview = await importM3UEdge({ m3uUrl: url });
    const items = Array.isArray(preview.items) ? preview.items as ExternalImportItem[] : [];
    return {
      provider: 'playlist',
      requestedUrl: url,
      resolvedUrl: preview.resolvedUrl || url,
      sourceKind: 'm3u',
      contentType: preview.contentType || 'application/vnd.apple.mpegurl',
      total: Number(preview.total || items.length || 0),
      items,
      warnings: Array.isArray(preview.warnings) ? preview.warnings : [],
      liveCount: Number(preview.liveCount || items.filter((item) => item.type === 'channel').length),
      vodCount: Number(preview.vodCount || items.filter((item) => item.type === 'movie').length),
      seriesCount: Number(preview.seriesCount || items.filter((item) => item.type === 'series').length),
      endpointStatus: [{ name: 'M3U', ok: items.length > 0 || Number(preview.total || 0) > 0, message: `${items.length || Number(preview.total || 0)} items` }],
    } as ImportSystemPreview;
  } catch (error) {
    const fallback = await buildLocalM3UPreview(url);
    return {
      ...fallback,
      warnings: [...(fallback.warnings || []), buildFallbackWarning('m3u', error)],
      endpointStatus: [
        { name: 'Edge Function', ok: false, message: getErrorMessage(error, 'Unavailable') },
        ...(fallback.endpointStatus || []),
      ],
    } as ImportSystemPreview;
  }
}

export async function importSystemItems(preview: ImportSystemPreview) {
  return externalImport.importExternalItems(preview.items, {
    sourceUrl: preview.requestedUrl,
    provider: 'custom',
    sourceKind: preview.sourceKind,
  });
}
