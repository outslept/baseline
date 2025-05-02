import type { ApiOptions, BaselineStatus, Feature, FeatureQuery } from './types'
import { logger } from './logger'
import { createQuery, fetchFeatures, mergeConfig } from './utils'

const DEFAULT_ENDPOINT = 'https://api.webstatus.dev/v1/features'
const DEFAULT_CONFIG = {
  retry: 3,
  timeout: 30000,
}

export class BaselineAPI {
  private readonly endpoint: string
  private readonly config: {
    retry: number
    timeout: number
    verbose?: boolean
  }

  constructor(options: ApiOptions = {}) {
    this.endpoint = options.endpoint || DEFAULT_ENDPOINT
    this.config = mergeConfig(options.config, DEFAULT_CONFIG)
  }

  /**
   * Fetch features with custom query parameters
   */
  async features(params: FeatureQuery = {}): Promise<Feature[]> {
    const query = createQuery(params)
    return await fetchFeatures(this.endpoint, query, this.config)
  }

  /**
   * Fetch features by baseline status
   */
  async baseline(status: BaselineStatus): Promise<Feature[]> {
    return await this.features({ baselineStatus: status })
  }

  /**
   * Fetch features by group and optional status
   */
  async byGroup(group: string, status?: BaselineStatus): Promise<Feature[]> {
    return await this.features({
      baselineStatus: status,
      group,
    })
  }

  /**
   * Fetch CSS features with optional status
   */
  async css(status?: BaselineStatus): Promise<Feature[]> {
    return await this.byGroup('css', status)
  }

  /**
   * Fetch JavaScript features with optional status
   */
  async javascript(status?: BaselineStatus): Promise<Feature[]> {
    return await this.byGroup('javascript', status)
  }

  /**
   * Fetch HTML features with optional status
   */
  async html(status?: BaselineStatus): Promise<Feature[]> {
    return await this.byGroup('html', status)
  }

  /**
   * Fetch features by ID
   */
  async byId(id: string): Promise<Feature | null> {
    try {
      const features = await this.features({ featureId: id })
      return features.length > 0 ? features[0] : null
    }
    catch (error) {
      logger.error(`Failed to get feature by ID ${id}: ${error}`)
      return null
    }
  }

  /**
   * Fetch features in a date range with optional status
   */
  async inDateRange(
    start: string,
    end: string,
    status?: BaselineStatus,
  ): Promise<Feature[]> {
    return await this.features({
      baselineStatus: status,
      baselineDateRange: {
        start,
        end,
      },
    })
  }

  /**
   * Fetch features using a raw query string
   */
  async query(customQuery: string): Promise<Feature[]> {
    if (!customQuery || customQuery.trim() === '') {
      return []
    }

    return await this.features({
      customQuery,
    })
  }
}
