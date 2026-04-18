export type SourceStatus =
  | 'playable_direct'
  | 'needs_proxy'
  | 'blocked'
  | 'broken'
  | 'geo_restricted'
  | 'invalid_playlist'
  | 'timeout'
  | 'unknown';

export interface SourceInspectionResult {
  status: SourceStatus;
  httpStatus?: number;
  contentType?: string;
  isM3U: boolean;
  isHtml: boolean;
  detectedBlockPage: boolean;
  latencyMs: number;
  reason?: string;
}

const TIMEOUT = 8000;

export async function inspectSource(url: string): Promise<SourceInspectionResult> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    clearTimeout(timeout);

    const latency = Date.now() - start;
    const contentType = res.headers.get('content-type') || '';

    let text = '';
    try {
      text = await res.text();
      text = text.slice(0, 2000); // فقط أول جزء للفحص
    } catch {}

    const isHtml = contentType.includes('text/html') || text.includes('<html');
    const isM3U = text.includes('#EXTM3U');
    const status = res.status;

    // 🔴 حالات واضحة
    if (status === 403 || status === 451) {
      return {
        status: 'blocked',
        httpStatus: status,
        contentType,
        isM3U,
        isHtml,
        detectedBlockPage: true,
        latencyMs: latency,
        reason: 'Blocked or forbidden',
      };
    }

    if (status === 404 || status === 410) {
      return {
        status: 'broken',
        httpStatus: status,
        contentType,
        isM3U,
        isHtml,
        detectedBlockPage: false,
        latencyMs: latency,
        reason: 'Not found',
      };
    }

    // 🧠 تحليل المحتوى
    if (isHtml) {
      return {
        status: 'invalid_playlist',
        httpStatus: status,
        contentType,
        isM3U: false,
        isHtml: true,
        detectedBlockPage: true,
        latencyMs: latency,
        reason: 'HTML instead of m3u8',
      };
    }

    if (!isM3U) {
      return {
        status: 'invalid_playlist',
        httpStatus: status,
        contentType,
        isM3U: false,
        isHtml: false,
        detectedBlockPage: false,
        latencyMs: latency,
        reason: 'Not a valid HLS playlist',
      };
    }

    // 🟢 صالح
    return {
      status: 'playable_direct',
      httpStatus: status,
      contentType,
      isM3U: true,
      isHtml: false,
      detectedBlockPage: false,
      latencyMs: latency,
    };
  } catch (err: any) {
    return {
      status: err.name === 'AbortError' ? 'timeout' : 'unknown',
      isM3U: false,
      isHtml: false,
      detectedBlockPage: false,
      latencyMs: Date.now() - start,
      reason: err.message,
    };
  }
}
