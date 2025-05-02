import type { z } from 'zod'
import type { ApiResponseSchema, FeatureSchema } from './schemas'

export type BaselineStatus = 'limited' | 'newly' | 'widely'
export type Feature = z.infer<typeof FeatureSchema>
export type ApiResponse = z.infer<typeof ApiResponseSchema>

export interface DateRange {
  start: string
  end: string
}

export interface FeatureQuery {
  baselineStatus?: BaselineStatus
  baselineDateRange?: DateRange
  featureId?: string
  group?: string
  snapshot?: string
  customQuery?: string
}

export interface FetchConfig {
  retry: number
  timeout: number
  verbose?: boolean
}

export type PartialFetchConfig = Partial<FetchConfig>
export interface ApiConfig extends PartialFetchConfig {}

export interface ApiOptions {
  endpoint?: string
  config?: ApiConfig
}
