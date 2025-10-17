const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
})

type Numeric = number | null | undefined

type SalaryRangeObject = {
  min?: Numeric
  max?: Numeric
  currency?: string | null
  period?: string | null
  verbatim?: string | null
}

export type SalaryRangeInput = SalaryRangeObject | string | null | undefined

function formatAmount(value: Numeric) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }
  return numberFormatter.format(Math.round(value))
}

export function normalizeSalaryRange(value: SalaryRangeInput): string | null {
  if (value == null) {
    return null
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }

  const range = value as SalaryRangeObject
  const verbatim = range.verbatim?.trim()
  if (verbatim) {
    return verbatim
  }

  const currency = range.currency?.trim() || ""
  const min = formatAmount(range.min)
  const max = formatAmount(range.max)
  const period = range.period?.trim()

  const currencyPart = currency ? `${currency} ` : ""
  if (min && max) {
    return `${currencyPart}${min} - ${max}${period ? ` ${period}` : ""}`.trim()
  }
  if (min) {
    return `${currencyPart}${min}+${period ? ` ${period}` : ""}`.trim()
  }
  if (max) {
    return `${currencyPart}up to ${max}${period ? ` ${period}` : ""}`.trim()
  }

  return null
}

/**
 * Normalizes job title and company name for consistent duplicate detection
 * - Trims whitespace
 * - Collapses consecutive whitespace to single space
 * - Converts to lowercase
 * - Treats empty strings as null
 */
export function normalizeJobField(value: string | null | undefined): string | null {
  if (!value) return null
  
  const normalized = value
    .trim()
    .replace(/\s+/g, ' ') // Collapse consecutive whitespace
    .toLowerCase()
  
  return normalized === '' ? null : normalized
}
