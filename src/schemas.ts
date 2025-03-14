import { z } from 'zod'
import { BaselineStatuses } from './constants'

export const specLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
})

export const specDataSchema = z.object({
  links: z.array(specLinkSchema),
})

export const baselineStatusSchema = z.enum([
  BaselineStatuses.LIMITED,
  BaselineStatuses.NEWLY,
  BaselineStatuses.WIDELY,
])

export const baselineInfoSchema = z.object({
  status: baselineStatusSchema,
  low_date: z.string().optional(),
  high_date: z.string().optional(),
})

export const webStatusFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseline: baselineInfoSchema.optional(),
  spec: specDataSchema.optional(),
}).passthrough() // Allow additional properties

export const webStatusMetadataSchema = z.object({
  next_page_token: z.string().optional(),
  total: z.number().optional(),
})

export const webStatusAPIResponseSchema = z.object({
  data: z.array(webStatusFeatureSchema),
  metadata: webStatusMetadataSchema,
})

export const dateRangeSchema = z.object({
  start: z.string(),
  end: z.string(),
})

export const featureSearchCriteriaSchema = z.object({
  status: baselineStatusSchema.optional(),
  dateRange: z.union([dateRangeSchema, z.string()]).optional(),
  group: z.string().optional(),
  snapshot: z.string().optional(),
  search: z.string().optional(),
})

export const webStatusClientOptionsSchema = z.object({
  baseUrl: z.string().url().optional(),
  fetchOptions: z.record(z.any()).optional(),
})
