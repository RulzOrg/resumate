type MetricName =
  | "upload_validation_failures"
  | "extraction_provider_failures"
  | "structured_parse_failures"
  | "fallback_rate"

const counters = new Map<MetricName, number>()

export function incrementMetric(metric: MetricName): void {
  counters.set(metric, (counters.get(metric) || 0) + 1)
}

export function getMetricSnapshot(): Record<string, number> {
  return {
    upload_validation_failures: counters.get("upload_validation_failures") || 0,
    extraction_provider_failures: counters.get("extraction_provider_failures") || 0,
    structured_parse_failures: counters.get("structured_parse_failures") || 0,
    fallback_rate: counters.get("fallback_rate") || 0,
  }
}
