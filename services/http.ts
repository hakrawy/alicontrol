export function getErrorMessage(error: unknown, fallback = 'Request failed.') {
  if (!error) return fallback;
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string') return error.trim() || fallback;
  if (typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      hint?: unknown;
      context?: {
        body?: {
          message?: unknown;
          error?: unknown;
        };
      };
    };
    const parts = [
      candidate.message,
      candidate.details,
      candidate.hint,
      candidate.context?.body?.message,
      candidate.context?.body?.error,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (parts.length > 0) {
      return parts.map((value) => value.trim()).join(': ');
    }
  }

  return fallback;
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function shouldRetryFetch(error: unknown) {
  if (!error || typeof error !== 'object') return true;
  return (error as { name?: string }).name !== 'AbortError';
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
  attempts = 2,
  retryDelayMs = 250
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= Math.max(1, attempts); attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      if (response.ok || attempt === attempts) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetryFetch(error)) {
        throw error;
      }
    }

    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed.');
}

export async function fetchTextWithRetry(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
  attempts = 2,
  retryDelayMs = 250
) {
  const response = await fetchWithRetry(url, options, timeoutMs, attempts, retryDelayMs);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.text();
}

export async function fetchJsonWithRetry<T = unknown>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000,
  attempts = 2,
  retryDelayMs = 250
) {
  const response = await fetchWithRetry(url, options, timeoutMs, attempts, retryDelayMs);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
