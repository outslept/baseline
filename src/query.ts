export type BaselineStatus = "limited" | "newly" | "widely";

export interface FeatureQuery {
  baselineStatus?: BaselineStatus;
  baselineDateRange?: { start: string; end: string };
  featureId?: string;
  group?: string;
  snapshot?: string;
  customQuery?: string;
}

export interface QueryBuilder {
  baseline(status: BaselineStatus): QueryBuilder;
  range(start: string, end: string): QueryBuilder;
  id(id: string): QueryBuilder;
  group(group: string): QueryBuilder;
  snapshot(s: string): QueryBuilder;
  custom(q: string): QueryBuilder;
  andRaw(term: string): QueryBuilder;
  toString(): string;
  clone(): QueryBuilder;
}

export type QueryInput = string | FeatureQuery | QueryBuilder;

function isQueryBuilder(x: any): x is QueryBuilder {
  return !!x && typeof x.toString === "function" && typeof x.clone === "function";
}

export function q(initial?: QueryInput): QueryBuilder {
  const terms: string[] = [];

  const push = (t?: string) => {
    if (!t) return;
    const tt = t.trim();
    if (tt) terms.push(tt);
  };

  const quote = (v: string) => {
    // quote if contains whitespace or quotes/colons/parentheses
    if (!/[\"\s:()]/.test(v)) return v;
    return `"${v.replace(/"/g, '\\"')}"`;
  };

  const api: QueryBuilder = {
    baseline(status) {
      push(`baseline_status:${status}`);
      return api;
    },
    range(start, end) {
      push(`baseline_date:${start}..${end}`);
      return api;
    },
    id(id) {
      push(`id:${quote(id)}`);
      return api;
    },
    group(group) {
      push(`group:${quote(group)}`);
      return api;
    },
    snapshot(s) {
      push(`snapshot:${quote(s)}`);
      return api;
    },
    custom(qStr) {
      push(qStr);
      return api;
    },
    andRaw(term) {
      push(term);
      return api;
    },
    toString() {
      return terms.join(" AND ");
    },
    clone() {
      const copy = q();
      terms.forEach((t) => (copy as any).andRaw(t));
      return copy;
    },
  };

  if (typeof initial === "string") {
    api.custom(initial);
  } else if (isQueryBuilder(initial)) {
    api.custom(initial.toString());
  } else if (initial && typeof initial === "object") {
    const i = initial as FeatureQuery;
    if (i.baselineStatus) api.baseline(i.baselineStatus);
    if (i.baselineDateRange) api.range(i.baselineDateRange.start, i.baselineDateRange.end);
    if (i.featureId) api.id(i.featureId);
    if (i.group) api.group(i.group);
    if (i.snapshot) api.snapshot(i.snapshot);
    if (i.customQuery?.trim()) api.custom(i.customQuery);
  }

  return api;
}

export function normalizeQuery(input?: QueryInput): string {
  if (!input) return "";
  if (typeof input === "string") return input.trim();
  if (isQueryBuilder(input)) return input.toString();
  return q(input as FeatureQuery).toString();
}