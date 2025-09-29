# baseline

A tiny, readable TypeScript client for the Web Platform Status API. Fetch Baseline status and browser compatibility data with a clean, chainable API.

# Quick Start

```ts
import { createWebStatusClient, q } from "#";

const api = createWebStatusClient();

// Get all widely supported features
const widelySupported = await api.baseline("widely");

// Get CSS features
const cssFeatures = await api.css();

// Get a specific feature by ID
const feature = await api.feature("css-grid");

// Get features by group with status filter
const newJSFeatures = await api.byGroup("javascript", "newly");

// Use the query builder for flexible searches
const recentNewCSS = await api.features(
  q().group("css").baseline("newly").range("2023-01-01", "2024-12-31"),
);
```

# API

```ts
import { createWebStatusClient, q } from "#";
const api = createWebStatusClient(options?);
```

- options:
  - baseURL?: string (default: https://api.webstatus.dev/v1/features)
  - timeout?: number (ms, per attempt, default: 30000)
  - retry?: number (attempts, default: 3)
  - backoff?: { base?: number; factor?: number; max?: number; jitter?: boolean }
  - headers?: HeadersInit
  - userAgent?: string
  - fetch?: typeof fetch (to inject your own)

Client methods:
- features(query?, opts?): Promise<Feature[]>
- feature(id, opts?): Promise<Feature | null>
- baseline(status, opts?): Promise<Feature[]>
- byGroup(group, status?, opts?): Promise<Feature[]>
- css(status?, opts?): Promise<Feature[]>
- javascript(status?, opts?): Promise<Feature[]>
- html(status?, opts?): Promise<Feature[]>
- inDateRange(start, end, status?, opts?): Promise<Feature[]>
- pages(query?, opts?): AsyncGenerator<ApiResponse>
- stream(query?, opts?): AsyncGenerator<Feature>

Request options (opts):
- signal?: AbortSignal
- headers?: HeadersInit
- timeout?: number
- retry?: number

# Query builder

```ts
import { q } from "#";

const query = q()
  .baseline("widely")
  .group("css")
  .range("2023-01-01", "2024-12-31");

const str = query.toString(); // "baseline_status:widely AND group:css AND baseline_date:2023-01-01..2024-12-31"
const out = await api.features(query);
```

Shortcuts:
- q().id("css.subgrid")
- q().snapshot("ecmascript-2023")
- q().custom('-baseline_status:limited') // negation
- q().custom('baseline_status:newly OR baseline_status:widely') // OR

# Streaming and pagination

```ts
// Stream features one by one
for await (const f of api.stream(q().baseline("newly"))) {
  console.log(f.feature_id, f.name);
}

// Or page-by-page
for await (const page of api.pages(q().group("javascript"))) {
  console.log("count:", page.data.length, "total:", page.metadata?.total);
}
```

The API paginates responses. Use pages() or stream() to iterate until metadata.next_page_token is absent. metadata.total may be present for total matches.

# Data shape

The HTTP API returns:
- ApiResponse
  - data: Feature[]
  - metadata?: { next_page_token?: string; total?: number }

Feature highlights:
- feature_id: string
- name: string
- baseline: { status: "limited" | "newly" | "widely"; low_date?: string; high_date?: string }
- spec: { links: { link: string }[] }
- browser_implementations: partial record of:
  - chrome, chrome_android, edge, firefox, firefox_android, safari, safari_ios
  - each: { date?: string; status: string; version?: string }
- Optional extras that may appear:
  - developer_signals?: { link: string; upvotes?: number }
  - usage?: per-browser usage, e.g. { chrome?: { daily?: number } }
  - wpt?: { experimental?: { [browser]: { score?: number; metadata?: any } }, stable?: ... }

# License

MIT