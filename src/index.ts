type BaselineStatus = "limited" | "newly" | "widely";

interface Feature {
  baseline: {
    status: BaselineStatus;
    low_date?: string;
    high_date?: string;
  };
  browser_implementations: {
    chrome: { date?: string; status: string; version?: string };
    edge: { date?: string; status: string; version?: string };
    firefox: { date?: string; status: string; version?: string };
    safari: { date?: string; status: string; version?: string };
  };
  feature_id: string;
  name: string;
  spec: { links: Array<{ link: string }> };
  group?: string;
}

interface FeatureQuery {
  baselineStatus?: BaselineStatus;
  baselineDateRange?: { start: string; end: string };
  featureId?: string;
  group?: string;
  snapshot?: string;
  customQuery?: string;
}

interface ApiResponse {
  data: Feature[];
  metadata?: { next_page_token?: string };
}

export class BaselineAPI {
  private endpoint: string;
  private timeout: number;
  private retry: number;

  constructor(
    options: { endpoint?: string; timeout?: number; retry?: number } = {},
  ) {
    this.endpoint = options.endpoint || "https://api.webstatus.dev/v1/features";
    this.timeout = options.timeout || 30000;
    this.retry = options.retry || 3;
  }

  async features(params: FeatureQuery = {}): Promise<Feature[]> {
    const query = this.buildQuery(params);
    return await this.fetchAllPages(query);
  }

  async baseline(status: BaselineStatus): Promise<Feature[]> {
    return await this.features({ baselineStatus: status });
  }

  async byGroup(group: string, status?: BaselineStatus): Promise<Feature[]> {
    return await this.features({ baselineStatus: status, group });
  }

  async css(status?: BaselineStatus): Promise<Feature[]> {
    return await this.byGroup("css", status);
  }

  async javascript(status?: BaselineStatus): Promise<Feature[]> {
    return await this.byGroup("javascript", status);
  }

  async html(status?: BaselineStatus): Promise<Feature[]> {
    return await this.byGroup("html", status);
  }

  async byId(id: string): Promise<Feature | null> {
    const features = await this.features({ featureId: id });
    return features[0] || null;
  }

  async inDateRange(
    start: string,
    end: string,
    status?: BaselineStatus,
  ): Promise<Feature[]> {
    return await this.features({
      baselineStatus: status,
      baselineDateRange: { start, end },
    });
  }

  private buildQuery(params: FeatureQuery): string {
    const segments: string[] = [];

    if (params.baselineStatus)
      segments.push(`baseline_status:${params.baselineStatus}`);
    if (params.baselineDateRange)
      segments.push(
        `baseline_date:${params.baselineDateRange.start}..${params.baselineDateRange.end}`,
      );
    if (params.featureId) segments.push(`id:${params.featureId}`);
    if (params.group) segments.push(`group:${params.group}`);
    if (params.snapshot) segments.push(`snapshot:${params.snapshot}`);
    if (params.customQuery?.trim()) segments.push(params.customQuery);

    return segments.join(" AND ");
  }

  private async fetchAllPages(query: string): Promise<Feature[]> {
    const results: Feature[] = [];
    let token: string | undefined;
    let apiResponse: ApiResponse;

    do {
      apiResponse = await this.fetchPage(query, token);
      results.push(...apiResponse.data);
      token = apiResponse.metadata?.next_page_token;
    } while (token && apiResponse.data.length > 0);

    return results;
  }

  private async fetchPage(query: string, token?: string): Promise<ApiResponse> {
    const params = new URLSearchParams({ q: query });
    if (token) params.append("page_token", token);

    const url = `${this.endpoint}?${params}`;

    for (let attempt = 0; attempt <= this.retry; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const httpResponse = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!httpResponse.ok) throw new Error(`HTTP ${httpResponse.status}`);

        return (await httpResponse.json()) as ApiResponse;
      } catch (error) {
        if (attempt === this.retry) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1)),
        );
      }
    }

    throw new Error("Max retries exceeded");
  }
}
