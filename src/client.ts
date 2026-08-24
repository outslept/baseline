import { q, normalizeQuery } from "./query";
import type {
  ApiResponse,
  BaselineStatus,
  ClientOptions,
  Feature,
  QueryInput,
  RequestOptions,
  WebStatusClient,
} from "./types";

const DEFAULTS = {
  baseURL: "https://api.webstatus.dev/v1/features",
  timeout: 30_000,
  retry: 3,
  backoff: {
    base: 300,
    factor: 2,
    max: 5000,
    jitter: true,
  },
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("The operation was aborted."));

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("The operation was aborted."));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isRetryableStatus(code: number) {
  return code === 429 || (code >= 500 && code <= 599);
}

function computeDelay(attempt: number, base: number, factor: number, max: number, jitter: boolean) {
  const exp = Math.min(max, Math.round(base * Math.pow(factor, attempt)));
  if (!jitter) return exp;
  const sway = Math.round(exp * 0.2 * Math.random());
  return Math.max(0, exp - sway);
}

function mergeHeaders(a?: HeadersInit, b?: HeadersInit): HeadersInit | undefined {
  if (!a && !b) return undefined;
  const h = new Headers();
  if (a) new Headers(a).forEach((v, k) => h.set(k, v));
  if (b) new Headers(b).forEach((v, k) => h.set(k, v));
  return h;
}

interface LinkedSignals {
  signal: AbortSignal;
  cleanup: () => void;
  isTimedOut: () => boolean;
}

function linkSignals(
  userSignal: AbortSignal | undefined,
  timeoutMs: number | undefined,
): LinkedSignals {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = timeoutMs
    ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
    : undefined;

  const onAbort = () => controller.abort();
  userSignal?.addEventListener("abort", onAbort, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId) clearTimeout(timeoutId);
      userSignal?.removeEventListener("abort", onAbort);
    },
    isTimedOut: () => timedOut,
  };
}

export function createWebStatusClient(options: ClientOptions = {}): WebStatusClient {
  const baseURL = options.baseURL ?? DEFAULTS.baseURL;
  const defaultTimeout = options.timeout ?? DEFAULTS.timeout;
  const defaultRetry = options.retry ?? DEFAULTS.retry;
  const backoff = {
    base: options.backoff?.base ?? DEFAULTS.backoff.base,
    factor: options.backoff?.factor ?? DEFAULTS.backoff.factor,
    max: options.backoff?.max ?? DEFAULTS.backoff.max,
    jitter: options.backoff?.jitter ?? DEFAULTS.backoff.jitter,
  };
  const defaultHeaders = mergeHeaders(
    options.headers,
    options.userAgent ? { "user-agent": options.userAgent } : undefined,
  );

  const $fetch = options.fetch ?? globalThis.fetch;

  async function requestPage(
    query: string,
    pageToken: string | undefined,
    opts: RequestOptions = {},
  ): Promise<ApiResponse> {
    const url = new URL(baseURL);
    url.searchParams.set("q", query ?? "");
    if (pageToken) url.searchParams.set("page_token", pageToken);

    const headers = mergeHeaders(defaultHeaders, opts.headers);
    const retry = opts.retry ?? defaultRetry;
    const timeout = opts.timeout ?? defaultTimeout;

    let lastError: unknown;

    for (let attempt = 0; attempt <= retry; attempt++) {
      const { signal, cleanup, isTimedOut } = linkSignals(opts.signal, timeout);

      try {
        const res = await $fetch(url.toString(), { signal, headers });

        if (!res.ok) {
          let body: unknown;
          const text = await res.text().catch((e) => `{ "parseError": "${String(e)}" }`);
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }

          const err = Object.assign(new Error(`HTTP ${res.status} ${res.statusText}`), {
            status: res.status,
            statusText: res.statusText,
            url: url.toString(),
            body,
          });

          if (attempt < retry && isRetryableStatus(res.status)) {
            const delay = computeDelay(
              attempt,
              backoff.base,
              backoff.factor,
              backoff.max,
              backoff.jitter,
            );
            await sleep(delay, opts.signal);
            continue;
          }
          throw err;
        }

        return (await res.json()) as ApiResponse;
      } catch (err) {
        // If aborted by user explicitly, rethrow immediately without retry
        if (opts.signal?.aborted) throw err;

        lastError = err;

        if (isTimedOut()) {
          if (attempt < retry) {
            const delay = computeDelay(
              attempt,
              backoff.base,
              backoff.factor,
              backoff.max,
              backoff.jitter,
            );
            await sleep(delay, opts.signal);
            continue;
          }
          throw new Error(`Request timed out after ${timeout}ms`);
        }

        if (attempt < retry) {
          const delay = computeDelay(
            attempt,
            backoff.base,
            backoff.factor,
            backoff.max,
            backoff.jitter,
          );
          await sleep(delay, opts.signal);
          continue;
        }
        throw lastError;
      } finally {
        cleanup();
      }
    }

    throw lastError ?? new Error("Unknown request failure");
  }

  async function* pages(query?: QueryInput, opts?: RequestOptions): AsyncGenerator<ApiResponse> {
    const qstr = normalizeQuery(query);
    let token: string | undefined;

    do {
      const res = await requestPage(qstr, token, opts);
      yield res;
      token = res.metadata?.next_page_token;
      if (!token || (res.data && res.data.length === 0)) break;
    } while (true);
  }

  async function* stream(query?: QueryInput, opts?: RequestOptions): AsyncGenerator<Feature> {
    for await (const page of pages(query, opts)) {
      for (const item of page.data) yield item;
    }
  }

  async function features(query?: QueryInput, opts?: RequestOptions): Promise<Feature[]> {
    const out: Feature[] = [];
    for await (const item of stream(query, opts)) out.push(item);
    return out;
  }

  async function feature(id: string, opts?: RequestOptions): Promise<Feature | null> {
    const list = await features(q().id(id), opts);
    return list[0] || null;
  }

  async function baseline(status: BaselineStatus, opts?: RequestOptions): Promise<Feature[]> {
    return features(q().baseline(status), opts);
  }

  async function byGroup(
    group: string,
    status?: BaselineStatus,
    opts?: RequestOptions,
  ): Promise<Feature[]> {
    const qb = q().group(group);
    if (status) qb.baseline(status);
    return features(qb, opts);
  }

  async function css(status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]> {
    return byGroup("css", status, opts);
  }

  async function javascript(status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]> {
    return byGroup("javascript", status, opts);
  }

  async function html(status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]> {
    return byGroup("html", status, opts);
  }

  async function inDateRange(
    start: string,
    end: string,
    status?: BaselineStatus,
    opts?: RequestOptions,
  ): Promise<Feature[]> {
    const qb = q().range(start, end);
    if (status) qb.baseline(status);
    return features(qb, opts);
  }

  return {
    features,
    pages,
    stream,
    feature,
    baseline,
    byGroup,
    css,
    javascript,
    html,
    inDateRange,
  };
}
