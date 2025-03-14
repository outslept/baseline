import { ofetch } from "ofetch";
import type {
  WebStatusClientOptions,
  WebStatusQueryParams,
  WebStatusAPIResponse,
  WebStatusFeature,
  BaselineSummary,
  FeatureSearchCriteria,
  DateRange
} from "./types.js";
import { BaselineStatuses, API_BASE_URL } from "./constants";
import { webStatusAPIResponseSchema, webStatusClientOptionsSchema } from "./schemas";
import { constructQueryUrl, formatDate, formatDateRange } from "./utils";
import type { BaselineStatus } from "./constants";

export class WebStatusClient {
  private readonly apiBaseUrl: string;
  private readonly fetchOptions: Record<string, any>;

  /**
   * Creates a new WebStatusClient instance.
   * @param {WebStatusClientOptions} [options] - Configuration options for the client.
   * @param {string} [options.baseUrl] - Custom API base URL. Defaults to the standard API endpoint.
   * @param {Record<string, any>} [options.fetchOptions] - Additional fetch options to pass to the HTTP client.
   */
  constructor(options?: WebStatusClientOptions) {
    const validatedOptions = options ? webStatusClientOptionsSchema.parse(options) : {};
    this.apiBaseUrl = validatedOptions.baseUrl ?? API_BASE_URL;
    this.fetchOptions = validatedOptions.fetchOptions ?? {};
  }

  /**
   * Constructs a URL with query parameters for API requests.
   * @param {WebStatusQueryParams} params - Query parameters to include in the URL.
   * @returns {URL} Constructed URL object with query parameters.
   * @private
   */
  private constructUrl(params: WebStatusQueryParams): URL {
    return constructQueryUrl(this.apiBaseUrl, params);
  }

  /**
   * Performs a direct query to the Web Status API with the given parameters.
   * @param {WebStatusQueryParams} params - Query parameters for the API request.
   * @returns {Promise<WebStatusAPIResponse>} API response with feature data and metadata.
   */
  public async queryFeatures(
    params: WebStatusQueryParams
  ): Promise<WebStatusAPIResponse> {
    const url = this.constructUrl(params);

    const response = await ofetch<WebStatusAPIResponse>(url.toString(), {
      ...this.fetchOptions,
      method: "GET",
      responseType: "json",
    });

    return webStatusAPIResponseSchema.parse(response);
  }

  /**
   * Fetches all features matching the provided parameters, handling pagination automatically.
   * @param {WebStatusQueryParams} initialParams - Initial query parameters.
   * @returns {Promise<WebStatusFeature[]>} Complete list of features across all pages.
   */
  public async fetchAllFeatures(
    initialParams: WebStatusQueryParams
  ): Promise<WebStatusFeature[]> {
    const allFeatures: WebStatusFeature[] = [];
    let pageToken: string | undefined;

    do {
      const currentParams: WebStatusQueryParams = {
        ...initialParams,
        page_token: pageToken,
      };

      const response = await this.queryFeatures(currentParams);

      if (response.data?.length) {
        allFeatures.push(...response.data);
      }

      pageToken = response.metadata?.next_page_token;
    } while (pageToken);

    return allFeatures;
  }

  /**
   * Retrieves features that have newly reached baseline status.
   * @returns {Promise<WebStatusFeature[]>} List of newly baselined features.
   */
  public async getNewlyBaselineFeatures(): Promise<WebStatusFeature[]> {
    return this.fetchAllFeatures({ baseline_status: BaselineStatuses.NEWLY });
  }

  /**
   * Retrieves features that have widely reached baseline status.
   * @returns {Promise<WebStatusFeature[]>} List of widely baselined features.
   */
  public async getWidelyBaselineFeatures(): Promise<WebStatusFeature[]> {
    return this.fetchAllFeatures({ baseline_status: BaselineStatuses.WIDELY });
  }

  /**
   * Retrieves all features that have reached either newly or widely baseline status.
   * @returns {Promise<WebStatusFeature[]>} List of all baselined features.
   */
  public async getAllBaselineFeatures(): Promise<WebStatusFeature[]> {
    return this.fetchAllFeatures({
      q: `-baseline_status:${BaselineStatuses.LIMITED}`,
    });
  }

  /**
   * Retrieves features that reached the specified baseline status within the given date range.
   * @param {DateRange | string} dateRange - Date range to filter by, either as DateRange object or string.
   * @param {BaselineStatus} [status=BaselineStatuses.WIDELY] - Baseline status to filter by.
   * @returns {Promise<WebStatusFeature[]>} List of features matching the criteria.
   */
  public async getBaselineFeaturesByDateRange(
    dateRange: DateRange | string,
    status: BaselineStatus = BaselineStatuses.WIDELY
  ): Promise<WebStatusFeature[]> {
    const formattedRange = formatDateRange(dateRange);

    return this.fetchAllFeatures({
      baseline_status: status,
      baseline_date: formattedRange,
    });
  }

  /**
   * Retrieves CSS features with optional date range and status filters.
   * @param {DateRange | string} [dateRange] - Optional date range to filter by.
   * @param {BaselineStatus} [status] - Optional baseline status to filter by.
   * @returns {Promise<WebStatusFeature[]>} List of CSS features matching the criteria.
   */
  public async getCSSFeatures(
    dateRange?: DateRange | string,
    status?: BaselineStatus
  ): Promise<WebStatusFeature[]> {
    const params: WebStatusQueryParams = { group: "css" };

    if (status) {
      params.baseline_status = status;
    }

    if (dateRange) {
      params.baseline_date = formatDateRange(dateRange);
    }

    return this.fetchAllFeatures(params);
  }

  /**
   * Retrieves JavaScript features with optional date range and status filters.
   * @param {DateRange | string} [dateRange] - Optional date range to filter by.
   * @param {BaselineStatus} [status] - Optional baseline status to filter by.
   * @returns {Promise<WebStatusFeature[]>} List of JavaScript features matching the criteria.
   */
  public async getJavaScriptFeatures(
    dateRange?: DateRange | string,
    status?: BaselineStatus
  ): Promise<WebStatusFeature[]> {
    const params: WebStatusQueryParams = { group: "javascript" };

    if (status) {
      params.baseline_status = status;
    }

    if (dateRange) {
      params.baseline_date = formatDateRange(dateRange);
    }

    return this.fetchAllFeatures(params);
  }

  /**
   * Retrieves a specific feature by its ID.
   * @param {string} featureId - ID of the feature to retrieve.
   * @returns {Promise<WebStatusFeature[]>} Feature matching the ID (as an array).
   */
  public async getFeatureById(featureId: string): Promise<WebStatusFeature[]> {
    return this.fetchAllFeatures({ id: featureId });
  }

  /**
   * Retrieves features belonging to a specific group.
   * @param {string} group - Group name to filter by.
   * @param {BaselineStatus} [status] - Optional baseline status to filter by.
   * @returns {Promise<WebStatusFeature[]>} List of features in the specified group.
   */
  public async getFeaturesByGroup(
    group: string,
    status?: BaselineStatus
  ): Promise<WebStatusFeature[]> {
    const params: WebStatusQueryParams = { group };

    if (status) {
      params.baseline_status = status;
    }

    return this.fetchAllFeatures(params);
  }

  /**
   * Retrieves features from a specific snapshot.
   * @param {string} snapshot - Snapshot identifier to filter by.
   * @param {BaselineStatus} [status] - Optional baseline status to filter by.
   * @returns {Promise<WebStatusFeature[]>} List of features from the specified snapshot.
   */
  public async getFeaturesBySnapshot(
    snapshot: string,
    status?: BaselineStatus
  ): Promise<WebStatusFeature[]> {
    const params: WebStatusQueryParams = { snapshot };

  if (status) {
    params.baseline_status = status;
  }

  return this.fetchAllFeatures(params);
}

/**
 * Performs a direct query using a custom query string.
 * @param {string} queryString - Raw query string to use for the search.
 * @returns {Promise<WebStatusFeature[]>} List of features matching the query.
 */
public async query(queryString: string): Promise<WebStatusFeature[]> {
  return this.fetchAllFeatures({ q: queryString });
}

/**
 * Retrieves features matching a set of search criteria.
 * @param {FeatureSearchCriteria} criteria - Search criteria to filter features by.
 * @param {BaselineStatus} [criteria.status] - Baseline status to filter by.
 * @param {DateRange | string} [criteria.dateRange] - Date range to filter by.
 * @param {string} [criteria.group] - Group to filter by.
 * @param {string} [criteria.snapshot] - Snapshot to filter by.
 * @param {string} [criteria.search] - Search query to filter by.
 * @returns {Promise<WebStatusFeature[]>} List of features matching all criteria.
 */
public async getFeaturesByCriteria(
  criteria: FeatureSearchCriteria
): Promise<WebStatusFeature[]> {
  const params: WebStatusQueryParams = {};

  if (criteria.status) {
    params.baseline_status = criteria.status;
  }

  if (criteria.dateRange) {
    params.baseline_date = formatDateRange(criteria.dateRange);
  }

  if (criteria.group) {
    params.group = criteria.group;
  }

  if (criteria.snapshot) {
    params.snapshot = criteria.snapshot;
  }

  if (criteria.search) {
    params.q = criteria.search;
  }

  return this.fetchAllFeatures(params);
}

/**
 * Generates a summary of baseline feature counts.
 * @returns {Promise<BaselineSummary>} Summary containing counts of newly and widely baselined features.
 */
public async getBaselineSummary(): Promise<BaselineSummary> {
  const [newly, widely] = await Promise.all([
    this.getNewlyBaselineFeatures(),
    this.getWidelyBaselineFeatures(),
  ]);

  const summary: BaselineSummary = {
    newly: newly.length,
    widely: widely.length,
    total: newly.length + widely.length,
  };

  return summary;
}

/**
 * Generates a summary of baseline feature counts grouped by specified categories.
 * @param {string[]} groups - Array of group names to generate summaries for.
 * @returns {Promise<BaselineSummary>} Summary containing counts of features by group and baseline status.
 */
public async getBaselineSummaryByGroup(
  groups: string[]
): Promise<BaselineSummary> {
  const summary: BaselineSummary = {
    newly: 0,
    widely: 0,
    total: 0,
    byGroup: {},
  };

  await Promise.all(
    groups.map(async (group) => {
      const [newly, widely] = await Promise.all([
        this.getFeaturesByGroup(group, BaselineStatuses.NEWLY),
        this.getFeaturesByGroup(group, BaselineStatuses.WIDELY),
      ]);

      if (!summary.byGroup) {
        summary.byGroup = {};
      }

      summary.byGroup[group] = {
        newly: newly.length,
        widely: widely.length,
      };

      summary.newly += newly.length;
      summary.widely += widely.length;
      summary.total += newly.length + widely.length;
    })
  );

  return summary;
}

/**
 * Searches for features using a free-text search term.
 * @param {string} searchTerm - Text to search for within feature data.
 * @returns {Promise<WebStatusFeature[]>} List of features matching the search term.
 */
public async searchFeatures(searchTerm: string): Promise<WebStatusFeature[]> {
  return this.query(searchTerm);
}

/**
 * Retrieves features that were added to the baseline between two specific dates.
 * @param {string} startDate - Start date in ISO format (YYYY-MM-DD).
 * @param {string} endDate - End date in ISO format (YYYY-MM-DD).
 * @param {BaselineStatus} [status=BaselineStatuses.NEWLY] - Baseline status to filter by.
 * @returns {Promise<WebStatusFeature[]>} List of features added between the specified dates.
 */
public async getFeaturesAddedBetweenDates(
  startDate: string,
  endDate: string,
  status: BaselineStatus = BaselineStatuses.NEWLY
): Promise<WebStatusFeature[]> {
  const dateRange = `${startDate}..${endDate}`;
  return this.fetchAllFeatures({
    baseline_status: status,
    baseline_date: dateRange,
  });
}

/**
 * Retrieves features that were recently added to the baseline within a specified time period.
 * @param {number} [daysBack=90] - Number of days to look back from the current date.
 * @param {BaselineStatus} [status=BaselineStatuses.NEWLY] - Baseline status to filter by.
 * @returns {Promise<WebStatusFeature[]>} List of recently added features.
 */
public async getRecentFeatures(
  daysBack: number = 90,
  status: BaselineStatus = BaselineStatuses.NEWLY
): Promise<WebStatusFeature[]> {
  const endDate = formatDate(new Date());
  const startDate = formatDate(
    new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  );

  return this.getFeaturesAddedBetweenDates(startDate, endDate, status);
}

/**
 * Analyzes baseline feature trends over multiple time periods.
 * @param {Array<{label: string, days: number}>} timeframes - Array of timeframes to analyze,
 *        each with a label and number of days to look back.
 * @returns {Promise<Record<string, {newly: number, widely: number, total: number}>>}
 *          Trend data for each timeframe with counts by baseline status.
 */
public async getBaselineTrends(
  timeframes: { label: string; days: number }[]
): Promise<Record<string, { newly: number; widely: number; total: number }>> {
  const trends: Record<string, { newly: number; widely: number; total: number }> = {};

  await Promise.all(
    timeframes.map(async ({ label, days }) => {
      const endDate = formatDate(new Date());
      const startDate = formatDate(
        new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      );

      const [newly, widely] = await Promise.all([
        this.getFeaturesAddedBetweenDates(startDate, endDate, BaselineStatuses.NEWLY),
        this.getFeaturesAddedBetweenDates(startDate, endDate, BaselineStatuses.WIDELY)
      ]);

      trends[label] = {
        newly: newly.length,
        widely: widely.length,
        total: newly.length + widely.length
      };
    })
  );

  return trends;
}

/**
 * Identifies the most common feature groups by feature count.
 * @param {number} [limit=5] - Maximum number of top groups to return.
 * @returns {Promise<Array<{group: string, count: number}>>} List of top feature groups with their counts.
 */
public async getTopFeatureGroups(limit: number = 5): Promise<Array<{ group: string; count: number }>> {
  const allFeatures = await this.getAllBaselineFeatures();

    const groupCounts: Record<string, number> = {};

    allFeatures.forEach(feature => {
      const group = feature.group as string;
      if (group) {
        groupCounts[group] = (groupCounts[group] ?? 0) + 1;
      }
    });

    return Object.entries(groupCounts)
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Compares the support status of multiple features by their IDs.
   * @param {string[]} featureIds - Array of feature IDs to compare.
   * @returns {Promise<Record<string, {name: string, status: BaselineStatus, date?: string}>>}
   *          Comparison data for each feature, indexed by ID.
   */
  public async compareFeatureSupport(
    featureIds: string[]
  ): Promise<Record<string, { name: string; status: BaselineStatus; date?: string }>> {
    const result: Record<string, { name: string; status: BaselineStatus; date?: string }> = {};

    await Promise.all(
      featureIds.map(async (id) => {
        const features = await this.getFeatureById(id);

        if (features && features.length > 0) {
          const feature = features[0];
          if (feature) {
            result[id] = {
              name: feature.name,
              status: feature.baseline?.status ?? BaselineStatuses.LIMITED,
              date: feature.baseline?.high_date
            };
          }
        }
      })
    );

    return result;
  }
}

/**
 * Factory function to create a new WebStatusClient instance.
 * @param {WebStatusClientOptions} [options] - Configuration options for the client.
 * @returns {Promise<WebStatusClient>} A configured WebStatusClient instance.
 */
export async function createWebStatusClient(
  options?: WebStatusClientOptions
): Promise<WebStatusClient> {
  return new WebStatusClient(options);
}
