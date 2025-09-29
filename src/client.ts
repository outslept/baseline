import {
  q,
  normalizeQuery,
  type BaselineStatus,
  type FeatureQuery,
  type QueryBuilder,
  type QueryInput,
} from './query'

export type BrowserKey =
  | 'chrome'
  | 'chrome_android'
  | 'edge'
  | 'firefox'
  | 'firefox_android'
  | 'safari'
  | 'safari_ios'

export interface BrowserInfo {
  date?: string;
  status: string;
  version?: string;
}

export interface Feature {
  baseline: {
    status: BaselineStatus;
    low_date?: string;
    high_date?: string;
  };
  browser_implementations: Partial<Record<BrowserKey, BrowserInfo>>;
  feature_id: string;
  name: string;
  spec: { links: Array<{ link: string }> };
  group?: string;
  developer_signals?: { link: string; upvotes?: number };
  usage?: Partial<Record<BrowserKey, { daily?: number }>>;
  wpt?: {
    experimental?: Partial<
      Record<BrowserKey, { score?: number; metadata?: Record<string, unknown> }>
    >;
    stable?: Partial<
      Record<BrowserKey, { score?: number; metadata?: Record<string, unknown> }>
    >;
  };
}

export interface ApiResponse {
  data: Feature[];
  metadata?: { next_page_token?: string; total?: number };
}

export interface ClientOptions {
  baseURL?: string; // default: https://api.webstatus.dev/v1/features
  timeout?: number; // per-attempt timeout in ms (default: 30000)
  retry?: number; // retry attempts (default: 3)
  backoff?: {
    base?: number; // base delay ms (default: 300)
    factor?: number; // exponential factor (default: 2)
    max?: number; // max delay ms (default: 5000)
    jitter?: boolean; // add jitter (default: true)
  };
  fetch?: typeof fetch; // inject your own fetch
  headers?: HeadersInit; // default headers
  userAgent?: string; // will be merged into headers
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  timeout?: number;
  retry?: number;
}

export class HTTPError extends Error {
  name = 'HTTPError'
  status: number
  statusText: string
  url: string
  body?: unknown

  constructor (url: string, status: number, statusText: string, body?: unknown) {
    super(`HTTP ${status} ${statusText}`)
    this.status = status
    this.statusText = statusText
    this.url = url
    this.body = body
  }
}

export class TimeoutError extends Error {
  name = 'TimeoutError'
  constructor (public ms: number) {
    super(`Request timed out after ${ms}ms`)
  }
}

const DEFAULTS = {
  baseURL: 'https://api.webstatus.dev/v1/features',
  timeout: 30_000,
  retry: 3,
  backoff: {
    base: 300,
    factor: 2,
    max: 5000,
    jitter: true,
  },
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function isRetryableStatus (code: number) {
  return code === 429 || (code >= 500 && code <= 599)
}

function computeDelay (
  attempt: number,
  base: number,
  factor: number,
  max: number,
  jitter: boolean
) {
  const exp = Math.min(max, Math.round(base * Math.pow(factor, attempt)))
  if (!jitter) return exp
  const sway = Math.round(exp * 0.2 * Math.random()) // +/- 20%
  return Math.max(0, exp - sway)
}

function mergeHeaders (
  a?: HeadersInit,
  b?: HeadersInit
): HeadersInit | undefined {
  if (!a && !b) return undefined
  const h = new Headers()
  if (a) new Headers(a).forEach((v, k) => h.set(k, v))
  if (b) new Headers(b).forEach((v, k) => h.set(k, v))
  return h
}

export interface WebStatusClient {
  features(query?: QueryInput, opts?: RequestOptions): Promise<Feature[]>;
  pages(
    query?: QueryInput,
    opts?: RequestOptions,
  ): AsyncGenerator<ApiResponse, void, unknown>;
  stream(
    query?: QueryInput,
    opts?: RequestOptions,
  ): AsyncGenerator<Feature, void, unknown>;

  feature(id: string, opts?: RequestOptions): Promise<Feature | null>;
  baseline(status: BaselineStatus, opts?: RequestOptions): Promise<Feature[]>;
  byGroup(
    group: string,
    status?: BaselineStatus,
    opts?: RequestOptions,
  ): Promise<Feature[]>;
  css(status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]>;
  javascript(
    status?: BaselineStatus,
    opts?: RequestOptions,
  ): Promise<Feature[]>;
  html(status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]>;
  inDateRange(
    start: string,
    end: string,
    status?: BaselineStatus,
    opts?: RequestOptions,
  ): Promise<Feature[]>;
}

export function createWebStatusClient (
  options: ClientOptions = {}
): WebStatusClient {
  const baseURL = options.baseURL ?? DEFAULTS.baseURL
  const defaultTimeout = options.timeout ?? DEFAULTS.timeout
  const defaultRetry = options.retry ?? DEFAULTS.retry
  const backoff = {
    base: options.backoff?.base ?? DEFAULTS.backoff.base,
    factor: options.backoff?.factor ?? DEFAULTS.backoff.factor,
    max: options.backoff?.max ?? DEFAULTS.backoff.max,
    jitter: options.backoff?.jitter ?? DEFAULTS.backoff.jitter,
  }
  const defaultHeaders = mergeHeaders(
    options.headers,
    options.userAgent ? { 'user-agent': options.userAgent } : undefined
  )

  const $fetch = options.fetch ?? (globalThis as any).fetch
  if (!$fetch) {
    throw new Error(
      'No fetch implementation found. Provide options.fetch or use an environment with global fetch.'
    )
  }

  async function requestPage (
    query: string,
    pageToken?: string,
    opts: RequestOptions = {}
  ): Promise<ApiResponse> {
    const url = new URL(baseURL)
    url.searchParams.set('q', query ?? '')
    if (pageToken) url.searchParams.set('page_token', pageToken)

    const headers = mergeHeaders(defaultHeaders, opts.headers)
    const retry = opts.retry ?? defaultRetry
    const timeout = opts.timeout ?? defaultTimeout

    let lastError: unknown

    for (let attempt = 0; attempt <= retry; attempt++) {
      const controller = new AbortController()
      const userSignal = opts.signal

      let timeoutId: any
      let onAbort: (() => void) | undefined
      let timedOut = false

      try {
        if (userSignal) {
          if (userSignal.aborted) {
            const err = new Error('Aborted');
            (err as any).name = 'AbortError'
            throw err
          }
          onAbort = () => controller.abort()
          userSignal.addEventListener('abort', onAbort)
        }

        timeoutId = setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeout)

        const res = await $fetch(url.toString(), {
          signal: controller.signal,
          headers,
        })

        clearTimeout(timeoutId)
        if (onAbort && userSignal) userSignal.removeEventListener('abort', onAbort)

        if (!res.ok) {
          let body: unknown
          try {
            body = await res.clone().json()
          } catch {
            try {
              body = await res.clone().text()
            } catch {
              body = undefined
            }
          }
          const err = new HTTPError(
            url.toString(),
            res.status,
            res.statusText,
            body
          )
          if (attempt < retry && isRetryableStatus(res.status)) {
            const delay = computeDelay(
              attempt,
              backoff.base,
              backoff.factor,
              backoff.max,
              backoff.jitter
            )
            await sleep(delay)
            continue
          }
          throw err
        }

        const data = (await res.json()) as ApiResponse
        return data
      } catch (err: any) {
        clearTimeout(timeoutId)
        if (onAbort && userSignal) userSignal.removeEventListener('abort', onAbort)

        if (timedOut) {
          if (attempt < retry) {
            const delay = computeDelay(
              attempt,
              backoff.base,
              backoff.factor,
              backoff.max,
              backoff.jitter
            )
            await sleep(delay)
            continue
          }
          throw new TimeoutError(timeout)
        }

        if (err?.name === 'AbortError') {
          throw err
        }

        lastError = err
        if (attempt < retry) {
          const delay = computeDelay(
            attempt,
            backoff.base,
            backoff.factor,
            backoff.max,
            backoff.jitter
          )
          await sleep(delay)
          continue
        }
        throw lastError
      }
    }
    // this should be unreacheable, I wonder how to build api differently to avoid this
    throw lastError ?? new Error('Unknown request failure')
  }

  async function * pages (
    query?: QueryInput,
    opts?: RequestOptions
  ): AsyncGenerator<ApiResponse> {
    const qstr = normalizeQuery(query)
    let token: string | undefined

    do {
      const res = await requestPage(qstr, token, opts)
      yield res
      token = res.metadata?.next_page_token
      if (!token || (res.data && res.data.length === 0)) break
    } while (true)
  }

  async function * stream (
    query?: QueryInput,
    opts?: RequestOptions
  ): AsyncGenerator<Feature> {
    for await (const page of pages(query, opts)) {
      for (const item of page.data) yield item
    }
  }

  async function features (
    query?: QueryInput,
    opts?: RequestOptions
  ): Promise<Feature[]> {
    const out: Feature[] = []
    for await (const item of stream(query, opts)) out.push(item)
    return out
  }

  async function feature (
    id: string,
    opts?: RequestOptions
  ): Promise<Feature | null> {
    const list = await features(q().id(id), opts)
    return list[0] || null
  }

  async function baseline (
    status: BaselineStatus,
    opts?: RequestOptions
  ): Promise<Feature[]> {
    return features(q().baseline(status), opts)
  }

  async function byGroup (
    group: string,
    status?: BaselineStatus,
    opts?: RequestOptions
  ): Promise<Feature[]> {
    const qb = q().group(group)
    if (status) qb.baseline(status)
    return features(qb, opts)
  }

  async function css (
    status?: BaselineStatus,
    opts?: RequestOptions
  ): Promise<Feature[]> {
    return byGroup('css', status, opts)
  }

  async function javascript (
    status?: BaselineStatus,
    opts?: RequestOptions
  ): Promise<Feature[]> {
    return byGroup('javascript', status, opts)
  }

  async function html (
    status?: BaselineStatus,
    opts?: RequestOptions
  ): Promise<Feature[]> {
    return byGroup('html', status, opts)
  }

  async function inDateRange (
    start: string,
    end: string,
    status?: BaselineStatus,
    opts?: RequestOptions
  ): Promise<Feature[]> {
    const qb = q().range(start, end)
    if (status) qb.baseline(status)
    return features(qb, opts)
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
  }
}

export { q, normalizeQuery }
export type { BaselineStatus, FeatureQuery, QueryBuilder, QueryInput }
