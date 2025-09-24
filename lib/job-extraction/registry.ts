import type { JobExtractionAdapter } from "./types"
import { GenericStructuredDataAdapter } from "./adapters/generic-structured-data"

const ADAPTERS: JobExtractionAdapter[] = [GenericStructuredDataAdapter]

export function getAdapters(): JobExtractionAdapter[] {
  return ADAPTERS.slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}

export function registerAdapter(adapter: JobExtractionAdapter) {
  ADAPTERS.push(adapter)
}
