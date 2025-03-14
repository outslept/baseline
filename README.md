# Web Baseline API Client

> [!NOTE]
> See the [Web Status API documentation](https://web.dev/articles/web-platform-dashboard-baseline) for more information.

A TypeScript client for interacting with the Web Status API, providing comprehensive tools to query, filter, and analyze web platform features and their browser support baseline status.

## Features

- Query web platform features by various criteria (status, date, category)
- Get detailed information about specific features
- Generate summaries and statistics about feature support
- Track newly added or widely supported features
- Analyze baseline trends over different time periods
- Compare support status across multiple features

## Quick Start

```typescript
import { createWebStatusClient } from 'browser-compatibility/lib/web-baseline';

async function main() {
  // Create a client instance
  const client = await createWebStatusClient();

  // Get all newly baselined features
  const newFeatures = await client.getNewlyBaselineFeatures();
  console.log(`Found ${newFeatures.length} newly baselined features`);

  // Get a summary of baseline status across all features
  const summary = await client.getBaselineSummary();
  console.log(`Total baseline features: ${summary.total}`);
  console.log(`- Newly supported: ${summary.newly}`);
  console.log(`- Widely supported: ${summary.widely}`);

  // Get recent CSS features
  const recentCSSFeatures = await client.getCSSFeatures(
    { start: '2023-01-01', end: '2023-12-31' }
  );

  // Search for specific features
  const asyncFeatures = await client.searchFeatures('async');
}

main().catch(console.error);
```

## API Reference

### Client Initialization

```typescript
// Default configuration
const client = await createWebStatusClient();

// Custom configuration
const client = await createWebStatusClient({
  baseUrl: 'https://custom-api.example.com/v1/features',
  fetchOptions: {
    headers: { 'Authorization': 'Bearer token' }
  }
});
```

### Core Methods

- `queryFeatures(params)`: Direct API query with pagination in response
- `fetchAllFeatures(params)`: Fetch all features matching criteria (handles pagination)
- `getFeatureById(id)`: Get a specific feature by ID
- `searchFeatures(term)`: Search features by text

### Feature Filtering

- `getNewlyBaselineFeatures()`: Get features with &quot;newly&quot; baseline status
- `getWidelyBaselineFeatures()`: Get features with &quot;widely&quot; baseline status
- `getAllBaselineFeatures()`: Get all baselined features
- `getBaselineFeaturesByDateRange(dateRange, status)`: Filter by date range and status
- `getCSSFeatures(dateRange?, status?)`: Get CSS features
- `getJavaScriptFeatures(dateRange?, status?)`: Get JavaScript features
- `getFeaturesByGroup(group, status?)`: Get features by group
- `getFeaturesBySnapshot(snapshot, status?)`: Get features by snapshot
- `getFeaturesByCriteria(criteria)`: Filter by multiple criteria

### Analytics and Reporting

- `getBaselineSummary()`: Get overall baseline statistics
- `getBaselineSummaryByGroup(groups)`: Get baseline statistics by group
- `getRecentFeatures(daysBack, status)`: Get recently added features
- `getBaselineTrends(timeframes)`: Analyze trends over multiple time periods
- `getTopFeatureGroups(limit)`: Get most common feature groups
- `compareFeatureSupport(featureIds)`: Compare support status of multiple features

## Date Formats

Date ranges can be specified in two ways:

```typescript
// As an object
const dateRange = { start: '2023-01-01', end: '2023-12-31' };

// As a string
const dateRange = '2023-01-01..2023-12-31';
```
