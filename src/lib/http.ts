// fetch() on React Native never gives up by itself (OkHttp's timeouts are 0 = forever), so one stalled
// request on flaky mobile data would hang a refresh, or a cached in-flight promise, for the rest of the run.

/**
 * GETs a JSON document, giving up after `timeoutMs` (headers and body together). Throws on network
 * errors, timeouts, non-JSON bodies (a captive portal's HTML) and statuses that aren't OK or in `allow`.
 */
export async function getJson<T>(
  url: string,
  what: string,
  opts: { timeoutMs?: number; headers?: Record<string, string>; allow?: number[] } = {},
): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 12_000);
  try {
    const res = await fetch(url, { headers: opts.headers, signal: ctl.signal });
    if (!res.ok && !opts.allow?.includes(res.status)) throw new Error(`${what} failed (${res.status})`);
    return (await res.json()) as T;
  } catch (e) {
    if (ctl.signal.aborted) throw new Error(`${what} timed out`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
