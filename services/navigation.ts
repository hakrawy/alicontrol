import type { ContentItem } from './api';

/**
 * Build a typed navigation route for content detail pages.
 * Shared across Home, Search, Movies, Series, Watchlist, etc.
 */
export function buildContentRoute(item: ContentItem) {
  return {
    pathname: '/content/[id]' as const,
    params: {
      id: item.id,
      preview: JSON.stringify({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        poster: item.poster,
        backdrop: item.backdrop,
        genre: item.genre,
        rating: item.rating,
        year: item.year,
        cast_members: item.cast_members,
        quality: item.type === 'movie' ? (item as any).quality : ['Auto'],
        stream_url: item.type === 'movie' ? (item as any).stream_url : '',
        stream_sources: item.type === 'movie' ? (item as any).stream_sources || [] : [],
        subtitle_url: item.type === 'movie' ? (item as any).subtitle_url : '',
        is_new: item.is_new,
        is_exclusive: item.is_exclusive,
        live_viewers: item.live_viewers,
        view_count: item.view_count,
      }),
    },
  };
}
