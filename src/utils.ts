import type { FetchContext } from 'ofetch'
import type { ApiResponse, Feature, FeatureQuery, FetchConfig, PartialFetchConfig } from './types'
import { defu } from 'defu'
import { ofetch } from 'ofetch'
import { logger } from './logger'
import { isApiResponse } from './schemas'

export function createQuery(params: FeatureQuery): string {
  const segments: string[] = []

  if (params.baselineStatus) {
    segments.push(`baseline_status:${params.baselineStatus}`)
  }

  if (params.baselineDateRange) {
    segments.push(
      `baseline_date:${params.baselineDateRange.start}..${params.baselineDateRange.end}`,
    )
  }

  if (params.featureId) {
    segments.push(`id:${params.featureId}`)
  }

  if (params.group) {
    segments.push(`group:${params.group}`)
  }

  if (params.snapshot) {
    segments.push(`snapshot:${params.snapshot}`)
  }

  if (params.customQuery && params.customQuery.trim() !== '') {
    segments.push(params.customQuery)
  }

  return segments.join(' AND ')
}

export function mergeConfig(
  source: PartialFetchConfig | undefined,
  defaults: FetchConfig,
): FetchConfig {
  return defu(source || {}, defaults) as FetchConfig
}

export async function fetchFeatures(
  endpoint: string,
  query: string,
  config: FetchConfig,
): Promise<Feature[]> {
  let results: Feature[] = []
  let token: string | undefined

  if (config.verbose) {
    logger.debug(`Starting feature fetch with query: "${query}"`)
  }

  try {
    do {
      const response = await fetchPage(endpoint, query, token, config)
      results = [...results, ...response.data]

      if (config.verbose) {
        logger.debug(`Received ${response.data.length} features (total: ${results.length})`)
      }

      token = response.metadata?.next_page_token

      if (!token || response.data.length === 0) {
        if (config.verbose) {
          logger.debug('No more pages to fetch')
        }
        break
      }

      if (config.verbose) {
        logger.debug(`Next page token: ${token}`)
      }
    } while (token)

    logger.info(`Fetched ${results.length} features in total`)
    return results
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error(`Failed to fetch features: ${errorMessage}`)
    throw error
  }
}

async function fetchPage(
  endpoint: string,
  query: string,
  token: string | undefined,
  config: FetchConfig,
): Promise<ApiResponse> {
  const params = new URLSearchParams({ q: query })
  if (token) {
    params.append('page_token', token)
  }

  const url = `${endpoint}?${params.toString()}`
  if (config.verbose) {
    logger.debug(`Fetching from: ${url}`)
  }

  const rawResponse = await ofetch<unknown>(url, {
    timeout: config.timeout,
    retry: config.retry,
    onRequestError: (context: FetchContext & { error: Error }) => {
      logger.warn(`Request error: ${context.error.message || 'Unknown error'}`)
    },
    onResponseError: (context: FetchContext & { response: { statusText: string } }) => {
      const errorMsg = context.response.statusText || 'Unknown error'
      logger.warn(`Response error: ${errorMsg}`)
    },
  })

  if (!isApiResponse(rawResponse)) {
    throw new TypeError('Invalid API response format')
  }

  return rawResponse as ApiResponse
}
