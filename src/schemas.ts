import { z } from 'zod'

export const BaselineInfoSchema = z.object({
  status: z.enum(['limited', 'newly', 'widely']),
  low_date: z.string().optional(),
  high_date: z.string().optional(),
})

export const BrowserDetailsSchema = z.object({
  date: z.string().optional(),
  status: z.string(),
  version: z.string().optional(),
})

export const FeatureSchema = z.object({
  baseline: BaselineInfoSchema,
  browser_implementations: z.object({
    chrome: BrowserDetailsSchema,
    edge: BrowserDetailsSchema,
    firefox: BrowserDetailsSchema,
    safari: BrowserDetailsSchema,
  }),
  feature_id: z.string(),
  name: z.string(),
  spec: z.object({
    links: z.array(z.object({ link: z.string() })),
  }),
  usage: z.record(z.unknown()).optional(),
  wpt: z.unknown().optional(),
  group: z.string().optional(),
  snapshot: z.string().optional(),
})

export const ApiResponseSchema = z.object({
  data: z.array(FeatureSchema),
  metadata: z.object({
    next_page_token: z.string().optional(),
    total: z.number().optional(),
  }).optional(),
})

export function isApiResponse(input: unknown): boolean {
  return ApiResponseSchema.safeParse(input).success
}
