const DEFAULT_UA =
  'ai4good-planner/1.0 (+https://josiahwsmith10.github.io/ai4good-planner; unofficial schedule mirror)';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface FetchOptions {
  retries?: number;
  timeoutMs?: number;
  userAgent?: string;
}

/**
 * Single polite GET of the programme page. One request per run — no crawling.
 * Retries with backoff + jitter on 429/5xx (honouring Retry-After); throws after exhaustion.
 * 403s get a separate minutes-scale ladder: the host's gateway hands them out as short
 * IP-reputation penalties (shared CI runner IPs), which outlast any seconds-scale retry.
 */
export async function fetchHtml(url: string, opts: FetchOptions = {}): Promise<string> {
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const ua = opts.userAgent ?? DEFAULT_UA;
  let lastErr: unknown;
  let lastStatus = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoff =
        lastStatus === 403
          ? Math.min(90_000, 30_000 * attempt) + Math.floor(Math.random() * 5_000)
          : Math.min(8_000, 500 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 400);
      await sleep(backoff);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': ua, Accept: 'text/html,application/xhtml+xml' },
        signal: controller.signal,
      });
      lastStatus = res.status;
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after'));
        if (Number.isFinite(retryAfter) && retryAfter > 0)
          await sleep(Math.min(30_000, retryAfter * 1000));
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`fetchHtml failed for ${url} after ${retries + 1} attempts: ${String(lastErr)}`);
}
