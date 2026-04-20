import { importM3U, importXtream } from '../src/lib/edgeFunctions';
import * as externalImport from './externalImport';
import type { ExternalImportItem, ExternalImportPreview } from './externalImport';

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

export async function readXtreamPreview(credentialsInput: XtreamCredentials, options?: { includeSeriesInfo?: boolean; maxSeriesInfoRequests?: number }) {
  const credentials = normalizeXtreamCredentials(credentialsInput);
  if (!isValidCredentials(credentials)) {
    throw new Error('Host, username, and password are required.');
  }

  const preview = await importXtream({
    host: credentials.host,
    username: credentials.username,
    password: credentials.password,
    fullUrl: credentials.fullUrl || undefined,
    includeSeriesInfo: options?.includeSeriesInfo,
    maxSeriesInfoRequests: options?.maxSeriesInfoRequests,
  });

  return {
    ...preview,
    provider: 'custom',
    requestedUrl: credentials.fullUrl || credentials.host,
    resolvedUrl: preview.resolvedUrl || credentials.fullUrl || credentials.host,
    sourceKind: preview.sourceKind || 'api',
    contentType: preview.contentType || 'application/json',
    total: preview.total ?? preview.items.length,
    warnings: preview.warnings || [],
    liveCount: preview.liveCount ?? preview.items.filter((item) => item.type === 'channel').length,
    vodCount: preview.vodCount ?? preview.items.filter((item) => item.type === 'movie').length,
    seriesCount: preview.seriesCount ?? preview.items.filter((item) => item.type === 'series').length,
    endpointStatus: preview.endpointStatus || [],
  } as ImportSystemPreview;
}

export async function readM3UImportPreview(url: string) {
  const preview = await importM3U({ m3uUrl: url });
  return {
    ...preview,
    liveCount: preview.liveCount ?? preview.items.filter((item) => item.type === 'channel').length,
    vodCount: preview.vodCount ?? preview.items.filter((item) => item.type === 'movie').length,
    seriesCount: preview.seriesCount ?? preview.items.filter((item) => item.type === 'series').length,
    endpointStatus: preview.endpointStatus || [{ name: 'M3U', ok: preview.items.length > 0, message: `${preview.items.length} items` }],
  } as ImportSystemPreview;
}

export async function importSystemItems(preview: ImportSystemPreview) {
  return externalImport.importExternalItems(preview.items, {
    sourceUrl: preview.requestedUrl,
    provider: 'custom',
    sourceKind: preview.sourceKind,
  });
}
