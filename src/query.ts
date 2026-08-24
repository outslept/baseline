import type { BaselineStatus, FeatureQuery, QueryBuilder, QueryInput } from "./types";

function isString(x: unknown): x is string {
  return typeof x === "string";
}

function isQueryBuilder(x: unknown): x is QueryBuilder {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as QueryBuilder).toString === "function" &&
    typeof (x as QueryBuilder).clone === "function"
  );
}

export function q(initial?: QueryInput): QueryBuilder {
  const terms: string[] = [];

  const push = (t?: string) => {
    if (!t) return;
    const tt = t.trim();
    if (tt) terms.push(tt);
  };

  const quote = (v: string) => {
    if (!/["\s:()]/.test(v)) return v;
    return `"${v.replace(/"/g, '\\"')}"`;
  };

  const api: QueryBuilder = {
    baseline(status: BaselineStatus) {
      push(`baseline_status:${status}`);
      return api;
    },
    range(start: string, end: string) {
      push(`baseline_date:${start}..${end}`);
      return api;
    },
    id(id: string) {
      push(`id:${quote(id)}`);
      return api;
    },
    group(group: string) {
      push(`group:${quote(group)}`);
      return api;
    },
    snapshot(s: string) {
      push(`snapshot:${quote(s)}`);
      return api;
    },
    custom(qStr: string) {
      push(qStr);
      return api;
    },
    andRaw(term: string) {
      push(term);
      return api;
    },
    toString() {
      return terms.join(" AND ");
    },
    clone() {
      const copy = q();
      terms.forEach((t) => copy.andRaw(t));
      return copy;
    },
  };

  if (initial) {
    if (isString(initial)) {
      api.custom(initial);
    } else if (isQueryBuilder(initial)) {
      api.custom(initial.toString());
    } else {
      const i = initial as FeatureQuery;
      if (i.baselineStatus) api.baseline(i.baselineStatus);
      if (i.baselineDateRange) api.range(i.baselineDateRange.start, i.baselineDateRange.end);
      if (i.featureId) api.id(i.featureId);
      if (i.group) api.group(i.group);
      if (i.snapshot) api.snapshot(i.snapshot);
      if (i.customQuery?.trim()) api.custom(i.customQuery);
    }
  }

  return api;
}

export function normalizeQuery(input?: QueryInput): string {
  if (!input) return "";
  if (isString(input)) return input.trim();
  if (isQueryBuilder(input)) return input.toString();
  return q(input as FeatureQuery).toString();
}
