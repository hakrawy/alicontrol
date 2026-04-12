import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ADDON_TIMEOUT_MS = 10000;

function withTimeout(promise, timeoutMs = ADDON_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

function sanitizeManifestUrl(manifestUrl) {
  return String(manifestUrl || '').trim().replace(/\/+$/, '');
}

function getAddonBaseUrl(manifestUrl) {
  return sanitizeManifestUrl(manifestUrl).replace(/\/manifest\.json$/i, '');
}

function buildAddonResourceUrl(manifestUrl, resourcePath) {
  return `${getAddonBaseUrl(manifestUrl)}/${String(resourcePath || '').replace(/^\/+/, '')}`;
}

function getAddonResourceName(resource) {
  if (typeof resource === 'string') return resource.trim().toLowerCase();
  if (resource && typeof resource === 'object' && typeof resource.name === 'string') return resource.name.trim().toLowerCase();
  return '';
}

function inferAddonKind(addon) {
  const manifest = addon?.manifest_json || {};
  const catalogs = Array.isArray(manifest.catalogs) ? manifest.catalogs : Array.isArray(addon?.catalogs) ? addon.catalogs : [];
  const resources = Array.isArray(manifest.resources) ? manifest.resources : Array.isArray(addon?.resources) ? addon.resources : [];
  const resourceNames = Array.from(new Set(resources.map(getAddonResourceName).filter(Boolean)));
  const hasCatalogs = catalogs.length > 0;
  const hasStreams = resourceNames.includes('stream');
  if (hasCatalogs && hasStreams) return 'hybrid';
  if (hasStreams) return 'stream';
  return 'catalog';
}

function parseYear(value) {
  if (!value) return new Date().getFullYear();
  const match = String(value).match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : new Date().getFullYear();
}

function extractImdbId(meta) {
  if (!meta) return null;
  const candidates = [
    meta.imdb_id,
    meta.imdbId,
    meta.imdb,
    meta.id && /^tt\d+$/i.test(String(meta.id)) ? meta.id : null,
  ].filter(Boolean);
  return candidates[0] ? String(candidates[0]).trim() : null;
}

function extractTmdbId(meta) {
  if (!meta) return null;
  return meta.tmdb_id || meta.tmdbId || null;
}

function inferLocalContentType(catalog) {
  const haystack = `${catalog?.id || ''} ${catalog?.type || ''} ${catalog?.name || ''}`.toLowerCase();
  if (haystack.includes('series') || haystack.includes('tv') || haystack.includes('show') || haystack.includes('anime')) {
    return 'series';
  }
  return 'movie';
}

function parseSeasonEpisodeFromText(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const patterns = [
    { regex: /s(?:eason)?\s*0?(\d{1,2})\s*e(?:pisode)?\s*0?(\d{1,3})/i, order: 'se' },
    { regex: /season\s*0?(\d{1,2}).*episode\s*0?(\d{1,3})/i, order: 'se' },
    { regex: /episode\s*0?(\d{1,3}).*season\s*0?(\d{1,2})/i, order: 'es' },
    { regex: /الموسم\s*(\d{1,2}).*الحلقة\s*(\d{1,3})/i, order: 'se' },
    { regex: /الحلقة\s*(\d{1,3}).*الموسم\s*(\d{1,2})/i, order: 'es' },
    { regex: /موسم\s*(\d{1,2}).*حلقة\s*(\d{1,3})/i, order: 'se' },
    { regex: /حلقة\s*(\d{1,3}).*موسم\s*(\d{1,2})/i, order: 'es' },
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (!match) continue;
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    return pattern.order === 'es'
      ? { seasonNumber: b, episodeNumber: a }
      : { seasonNumber: a, episodeNumber: b };
  }
  return null;
}

function parseEpisodeMetadata(video, index) {
  const parsed = parseSeasonEpisodeFromText(video?.title || '') ||
    parseSeasonEpisodeFromText(video?.name || '') ||
    parseSeasonEpisodeFromText(video?.description || '') ||
    parseSeasonEpisodeFromText(video?.overview || '');

  return {
    seasonNumber: Number(video?.season) || Number(video?.seasonNumber) || parsed?.seasonNumber || 1,
    episodeNumber: Number(video?.episode) || Number(video?.episodeNumber) || parsed?.episodeNumber || index + 1,
    title: String(video?.title || video?.name || '').trim() || `Episode ${index + 1}`,
    thumbnail: video?.thumbnail || video?.poster || '',
    description: video?.overview || video?.description || '',
  };
}

async function fetchJson(url, headers = {}) {
  const response = await withTimeout(fetch(url, { headers, redirect: 'follow' }));
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

function getAddonHeaders(addon) {
  return addon?.config_values?.headers && typeof addon.config_values.headers === 'object'
    ? addon.config_values.headers
    : {};
}

function applyAddonConfigToUrl(url, addon) {
  const configValues = addon?.config_values && typeof addon.config_values === 'object' ? addon.config_values : {};
  const urlObj = new URL(url);
  Object.entries(configValues).forEach(([key, value]) => {
    if (key === 'headers' || key === 'cookie' || value === undefined || value === null || value === '') return;
    if (!urlObj.searchParams.has(key)) {
      urlObj.searchParams.set(key, String(value));
    }
  });
  return urlObj.toString();
}

async function fetchAddonCatalogItems(addon, catalog) {
  const url = applyAddonConfigToUrl(buildAddonResourceUrl(addon.manifest_url, `catalog/${encodeURIComponent(catalog.type)}/${encodeURIComponent(catalog.id)}/skip=0.json`), addon);
  const payload = await fetchJson(url, getAddonHeaders(addon));
  return Array.isArray(payload?.metas) ? payload.metas : [];
}

async function fetchAddonMeta(addon, type, id) {
  const url = applyAddonConfigToUrl(buildAddonResourceUrl(addon.manifest_url, `meta/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`), addon);
  const payload = await fetchJson(url, getAddonHeaders(addon));
  return payload?.meta || null;
}

async function findMovie(meta) {
  const imdbId = extractImdbId(meta);
  const tmdbId = extractTmdbId(meta);
  const title = String(meta?.name || meta?.title || 'Untitled').trim();
  const year = parseYear(meta?.releaseInfo || meta?.year);

  if (imdbId) {
    const { data } = await supabase.from('movies').select('*').eq('imdb_id', imdbId).limit(1).maybeSingle();
    if (data) return data;
  }
  if (tmdbId) {
    const { data } = await supabase.from('movies').select('*').eq('tmdb_id', String(tmdbId)).limit(1).maybeSingle();
    if (data) return data;
  }

  const { data } = await supabase.from('movies').select('*').ilike('title', title).eq('year', year).limit(1).maybeSingle();
  return data || null;
}

async function upsertMovie(meta) {
  const existing = await findMovie(meta);
  const payload = {
    imdb_id: extractImdbId(meta),
    tmdb_id: extractTmdbId(meta) ? String(extractTmdbId(meta)) : null,
    title: String(meta?.name || meta?.title || 'Untitled').trim(),
    original_title: meta?.original_title || meta?.originalTitle || null,
    description: meta?.description || meta?.overview || '',
    poster: meta?.poster || meta?.background || '',
    backdrop: meta?.background || meta?.poster || '',
    trailer_url: '',
    stream_url: existing?.stream_url || '',
    genre: Array.isArray(meta?.genres) ? meta.genres : [],
    rating: Number.parseFloat(meta?.imdbRating || meta?.rating || '0') || 0,
    year: parseYear(meta?.releaseInfo || meta?.year),
    duration: meta?.runtime || meta?.runtimeMinutes || '',
    cast_members: Array.isArray(meta?.cast) ? meta.cast : [],
    quality: existing?.quality || ['Auto'],
    subtitle_url: existing?.subtitle_url || '',
    is_featured: existing?.is_featured || false,
    is_trending: existing?.is_trending || false,
    is_new: existing?.is_new ?? true,
    is_exclusive: existing?.is_exclusive || false,
    is_published: true,
    content_status: 'released',
  };

  if (existing) {
    const { data, error } = await supabase.from('movies').update(payload).eq('id', existing.id).select().single();
    if (error) throw error;
    return { row: data, merged: true };
  }

  const { data, error } = await supabase.from('movies').insert(payload).select().single();
  if (error) throw error;
  return { row: data, merged: false };
}

async function findSeries(meta) {
  const imdbId = extractImdbId(meta);
  const tmdbId = extractTmdbId(meta);
  const title = String(meta?.name || meta?.title || 'Untitled Series').trim();
  const year = parseYear(meta?.releaseInfo || meta?.year);

  if (imdbId) {
    const { data } = await supabase.from('series').select('*').eq('imdb_id', imdbId).limit(1).maybeSingle();
    if (data) return data;
  }
  if (tmdbId) {
    const { data } = await supabase.from('series').select('*').eq('tmdb_id', String(tmdbId)).limit(1).maybeSingle();
    if (data) return data;
  }

  const { data } = await supabase.from('series').select('*').ilike('title', title).eq('year', year).limit(1).maybeSingle();
  return data || null;
}

async function upsertSeries(meta) {
  const existing = await findSeries(meta);
  const payload = {
    imdb_id: extractImdbId(meta),
    tmdb_id: extractTmdbId(meta) ? String(extractTmdbId(meta)) : null,
    title: String(meta?.name || meta?.title || 'Untitled Series').trim(),
    original_title: meta?.original_title || meta?.originalTitle || null,
    description: meta?.description || meta?.overview || '',
    poster: meta?.poster || meta?.background || '',
    backdrop: meta?.background || meta?.poster || '',
    trailer_url: '',
    genre: Array.isArray(meta?.genres) ? meta.genres : [],
    rating: Number.parseFloat(meta?.imdbRating || meta?.rating || '0') || 0,
    year: parseYear(meta?.releaseInfo || meta?.year),
    cast_members: Array.isArray(meta?.cast) ? meta.cast : [],
    total_seasons: existing?.total_seasons || 0,
    total_episodes: existing?.total_episodes || 0,
    is_featured: existing?.is_featured || false,
    is_trending: existing?.is_trending || false,
    is_new: existing?.is_new ?? true,
    is_exclusive: existing?.is_exclusive || false,
    is_published: true,
    content_status: meta?.status || meta?.state || 'unknown',
    last_synced_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabase.from('series').update(payload).eq('id', existing.id).select().single();
    if (error) throw error;
    return { row: data, merged: true };
  }

  const { data, error } = await supabase.from('series').insert(payload).select().single();
  if (error) throw error;
  return { row: data, merged: false };
}

async function upsertExternalRef(payload) {
  const { error } = await supabase.from('content_external_refs').upsert(payload, {
    onConflict: 'addon_id,content_type,external_id',
  });
  if (error) throw error;
}

async function upsertSeason(seriesId, seasonNumber) {
  const payload = { series_id: seriesId, number: seasonNumber, title: `Season ${seasonNumber}` };
  const { data, error } = await supabase.from('seasons').upsert(payload, { onConflict: 'series_id,number' }).select().single();
  if (error) throw error;
  return data;
}

async function upsertEpisode(seriesId, seasonId, parsed, video) {
  const streamUrl = video?.stream_url || video?.url || '';
  const payload = {
    season_id: seasonId,
    series_id: seriesId,
    number: parsed.episodeNumber,
    title: parsed.title,
    description: parsed.description,
    thumbnail: parsed.thumbnail,
    stream_url: streamUrl,
    subtitle_url: video?.subtitle || video?.subtitle_url || '',
    duration: video?.duration || '',
  };
  const { data, error } = await supabase.from('episodes').upsert(payload, { onConflict: 'season_id,number' }).select().single();
  if (error) throw error;
  return data;
}

async function updateSeriesCounts(seriesId) {
  const { data: seasons } = await supabase.from('seasons').select('id').eq('series_id', seriesId);
  const { count: episodesCount } = await supabase.from('episodes').select('*', { count: 'exact', head: true }).eq('series_id', seriesId);
  const { error } = await supabase
    .from('series')
    .update({
      total_seasons: (seasons || []).length,
      total_episodes: episodesCount || 0,
      last_synced_at: new Date().toISOString(),
    })
    .eq('id', seriesId);
  if (error) throw error;
}

async function syncSeriesVideos(addon, catalog, seriesRow, meta) {
  const fullMeta = await fetchAddonMeta(addon, catalog.type, meta.id);
  if (!Array.isArray(fullMeta?.videos)) return 0;
  let count = 0;
  for (const [index, video] of fullMeta.videos.entries()) {
    const parsed = parseEpisodeMetadata(video, index);
    const season = await upsertSeason(seriesRow.id, parsed.seasonNumber);
    const episode = await upsertEpisode(seriesRow.id, season.id, parsed, video);
    await upsertExternalRef({
      addon_id: addon.id,
      content_type: 'episode',
      content_id: episode.id,
      external_type: catalog.type,
      external_id: video?.id || `${seriesRow.id}:${parsed.seasonNumber}:${parsed.episodeNumber}`,
      imdb_id: null,
      title: parsed.title,
      year: null,
      meta_json: video,
    });
    count += 1;
  }
  await updateSeriesCounts(seriesRow.id);
  return count;
}

async function syncCatalogAddon(addon) {
  const manifest = addon.manifest_json || {};
  const catalogs = Array.isArray(manifest.catalogs) ? manifest.catalogs : [];
  const summary = { movies: 0, mergedMovies: 0, series: 0, mergedSeries: 0, episodes: 0, errors: [] };

  for (const catalog of catalogs) {
    try {
      const items = await fetchAddonCatalogItems(addon, catalog);
      const localType = inferLocalContentType(catalog);
      for (const meta of items) {
        if (localType === 'movie') {
          const movie = await upsertMovie(meta);
          summary.movies += movie.merged ? 0 : 1;
          summary.mergedMovies += movie.merged ? 1 : 0;
          await upsertExternalRef({
            addon_id: addon.id,
            content_type: 'movie',
            content_id: movie.row.id,
            external_type: catalog.type,
            external_id: meta.id,
            imdb_id: extractImdbId(meta),
            title: movie.row.title,
            year: movie.row.year,
            meta_json: meta,
          });
          continue;
        }

        const series = await upsertSeries(meta);
        summary.series += series.merged ? 0 : 1;
        summary.mergedSeries += series.merged ? 1 : 0;
        await upsertExternalRef({
          addon_id: addon.id,
          content_type: 'series',
          content_id: series.row.id,
          external_type: catalog.type,
          external_id: meta.id,
          imdb_id: extractImdbId(meta),
          title: series.row.title,
          year: series.row.year,
          meta_json: meta,
        });
        summary.episodes += await syncSeriesVideos(addon, catalog, series.row, meta);
      }
    } catch (error) {
      summary.errors.push(`${catalog?.name || catalog?.id || 'catalog'}: ${error.message}`);
    }
  }

  await supabase
    .from('addons')
    .update({
      last_catalog_sync_at: new Date().toISOString(),
      last_series_sync_at: new Date().toISOString(),
      last_imported_at: new Date().toISOString(),
      sync_error: summary.errors.length ? summary.errors.join(' | ').slice(0, 1500) : null,
    })
    .eq('id', addon.id);

  return summary;
}

async function main() {
  const { data, error } = await supabase
    .from('addons')
    .select('*')
    .eq('enabled', true);

  if (error) throw error;

  const addons = (data || []).filter((addon) => inferAddonKind(addon) !== 'stream');
  const report = [];

  for (const addon of addons) {
    try {
      const summary = await syncCatalogAddon(addon);
      report.push({ addon: addon.name, ...summary });
      console.log(`[sync] ${addon.name}`, summary);
    } catch (syncError) {
      console.error(`[sync] ${addon.name} failed`, syncError);
      await supabase.from('addons').update({ sync_error: String(syncError?.message || syncError) }).eq('id', addon.id);
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
