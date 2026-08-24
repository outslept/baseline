export type BaselineStatus = "limited" | "newly" | "widely";

export interface FeatureQuery {
  baselineStatus?: BaselineStatus;
  baselineDateRange?: { start: string; end: string };
  featureId?: string;
  group?: string;
  snapshot?: string;
  customQuery?: string;
}

export interface QueryBuilder {
  baseline(status: BaselineStatus): QueryBuilder;
  range(start: string, end: string): QueryBuilder;
  id(id: string): QueryBuilder;
  group(group: string): QueryBuilder;
  snapshot(s: string): QueryBuilder;
  custom(q: string): QueryBuilder;
  andRaw(term: string): QueryBuilder;
  toString(): string;
  clone(): QueryBuilder;
}

export type QueryInput = string | FeatureQuery | QueryBuilder;

export type BrowserKey =
  | "chrome"
  | "chrome_android"
  | "edge"
  | "firefox"
  | "firefox_android"
  | "safari"
  | "safari_ios";

export interface BrowserInfo {
  date?: string;
  status: string;
  version?: string;
}

type JsonScalar = string | number | boolean | null;
export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue };

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
      Record<BrowserKey, { score?: number; metadata?: Record<string, JsonValue> }>
    >;
    stable?: Partial<Record<BrowserKey, { score?: number; metadata?: Record<string, JsonValue> }>>;
  };
}

export interface ApiResponse {
  data: Feature[];
  metadata?: { next_page_token?: string; total?: number };
}

export interface FetchLike {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>;
}

export interface ClientOptions {
  baseURL?: string;
  timeout?: number;
  retry?: number;
  backoff?: {
    base?: number;
    factor?: number;
    max?: number;
    jitter?: boolean;
  };
  fetch?: FetchLike;
  headers?: HeadersInit;
  userAgent?: string;
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
  timeout?: number;
  retry?: number;
}

export interface WebStatusClient {
  features(query?: QueryInput, opts?: RequestOptions): Promise<Feature[]>;
  pages(query?: QueryInput, opts?: RequestOptions): AsyncGenerator<ApiResponse, void, unknown>;
  stream(query?: QueryInput, opts?: RequestOptions): AsyncGenerator<Feature, void, unknown>;
  feature(id: string, opts?: RequestOptions): Promise<Feature | null>;
  baseline(status: BaselineStatus, opts?: RequestOptions): Promise<Feature[]>;
  byGroup(group: string, status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]>;
  css(status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]>;
  javascript(status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]>;
  html(status?: BaselineStatus, opts?: RequestOptions): Promise<Feature[]>;
  inDateRange(
    start: string,
    end: string,
    status?: BaselineStatus,
    opts?: RequestOptions,
  ): Promise<Feature[]>;
}
