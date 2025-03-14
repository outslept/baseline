import type { BaselineStatus } from "./constants";

export interface SpecLink {
  url: string;
  title?: string;
}

export interface SpecData {
  links: SpecLink[];
}

export interface BaselineInfo {
  status: BaselineStatus;
  low_date?: string;
  high_date?: string;
}

export interface WebStatusFeature {
  id: string;
  name: string;
  baseline?: BaselineInfo;
  spec?: SpecData;
  [key: string]: unknown;
}

export interface WebStatusMetadata {
  next_page_token?: string;
  total?: number;
}

export interface WebStatusAPIResponse {
  data: WebStatusFeature[];
  metadata: WebStatusMetadata;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface WebStatusQueryParams {
  q?: string;
  baseline_status?: BaselineStatus | BaselineStatus[];
  baseline_date?: string;
  id?: string | string[];
  group?: string | string[];
  snapshot?: string | string[];
  page_token?: string;
  [key: string]: string | string[] | undefined;
}

export interface WebStatusClientOptions {
  baseUrl?: string;
  fetchOptions?: Record<string, any>;
}

export interface FeatureSearchCriteria {
  status?: BaselineStatus;
  dateRange?: DateRange | string;
  group?: string;
  snapshot?: string;
  search?: string;
}

export interface BaselineSummary {
  newly: number;
  widely: number;
  total: number;
  byGroup?: Record<string, { newly: number; widely: number }>;
}
