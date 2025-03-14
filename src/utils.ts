import type { DateRange } from "./types";
import { dateRangeSchema } from "./schemas";

export function createDateRange(start: string, end: string): DateRange {
  const dateRange = { start, end };
  return dateRangeSchema.parse(dateRange);
}

export function formatDate(date: Date): string {
  const isoString = date.toISOString();
  const parts = isoString.split("T");
  return parts[0] ?? isoString;
}

export function constructQueryUrl(baseUrl: string, params: Record<string, string | string[] | undefined>): URL {
  const url = new URL(baseUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;

    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, String(v)));
    } else {
      url.searchParams.append(key, String(value));
    }
  });

  return url;
}

export function formatDateRange(dateRange: DateRange | string): string {
  if (typeof dateRange === "string") {
    return dateRange;
  }
  return `${dateRange.start}..${dateRange.end}`;
}
