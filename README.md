# `baseline`

A lightweight TypeScript client for the Web Platform Status API, providing easy access to browser compatibility data and Baseline feature status.

## Quick Start

```typescript
import { BaselineAPI } from '№'

const api = new BaselineAPI()

// Get all widely supported features
const widelySupported = await api.baseline('widely')

// Get CSS features
const cssFeatures = await api.css()

// Get a specific feature by ID
const feature = await api.byId('css-grid')

// Get features by group with status filter
const newJSFeatures = await api.byGroup('javascript', 'newly')
```

## API Reference

### Constructor

```typescript
new BaselineAPI(options?)
```

**Options:**

-   `endpoint?: string` - Custom API endpoint (default: `https://api.webstatus.dev/v1/features`)
-   `timeout?: number` - Request timeout in milliseconds (default: 30000)
-   `retry?: number` - Number of retry attempts (default: 3)

### Methods

#### `features(params?): Promise<Feature[]>`

Fetch features with custom query parameters.

#### `baseline(status): Promise<Feature[]>`

Get features by Baseline status: `'limited'`, `'newly'`, or `'widely'`.

#### `byGroup(group, status?): Promise<Feature[]>`

Get features by technology group with optional status filter.

#### `css(status?): Promise<Feature[]>`

Get CSS features with optional status filter.

#### `javascript(status?): Promise<Feature[]>`

Get JavaScript features with optional status filter.

#### `html(status?): Promise<Feature[]>`

Get HTML features with optional status filter.

#### `byId(id): Promise<Feature | null>`

Get a specific feature by its ID.

#### `inDateRange(start, end, status?): Promise<Feature[]>`

Get features within a date range with optional status filter.
