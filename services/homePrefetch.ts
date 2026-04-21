import { Image } from 'expo-image';
import type { Banner, Channel, ContentItem, WatchRoom } from './api';

export interface HomePrefetchPayload {
  banners: Banner[];
  trendingMovies?: ContentItem[];
  featuredMovies?: ContentItem[];
  newContent?: ContentItem[];
  allMovies?: ContentItem[];
  allSeries?: ContentItem[];
  channels?: Channel[];
  activeRooms?: WatchRoom[];
  limit?: number;
}

function uniqueUrls(urls: Array<string | undefined | null>) {
  return [...new Set(urls.map((url) => String(url || '').trim()).filter(Boolean))];
}

function collectContentImages(items: Array<ContentItem | Channel | WatchRoom | Banner>) {
  return items.flatMap((item: any) => [item.poster, item.backdrop, item.logo, item.content_poster].filter(Boolean));
}

export async function prefetchHomeAssets(payload: HomePrefetchPayload) {
  const limit = Math.max(6, Number(payload.limit || 18));
  const urls = uniqueUrls([
    ...collectContentImages(payload.banners),
    ...collectContentImages((payload.trendingMovies || []).slice(0, limit)),
    ...collectContentImages((payload.featuredMovies || []).slice(0, limit)),
    ...collectContentImages((payload.newContent || []).slice(0, limit)),
    ...collectContentImages((payload.allMovies || []).slice(0, limit)),
    ...collectContentImages((payload.allSeries || []).slice(0, limit)),
    ...collectContentImages((payload.channels || []).slice(0, limit)),
    ...collectContentImages((payload.activeRooms || []).slice(0, 6)),
  ]);

  if (urls.length === 0) {
    return { prefetched: 0, success: true };
  }

  try {
    const success = await Image.prefetch(urls, { cachePolicy: 'disk' });
    return { prefetched: urls.length, success };
  } catch {
    return { prefetched: urls.length, success: false };
  }
}
