type SalaryRangeObject = {
  min?: number | null
  max?: number | null
  currency?: string | null
  verbatim?: string | null
}

export type SalaryRangeInput = SalaryRangeObject | string | null | undefined

const numberFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })

function formatAmount(value?: number | null) {
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
    return trimmed.length > 0 ? trimmed : null
  }

  if (typeof value === "object") {
    const range = value as SalaryRangeObject
    const verbatim = typeof range.verbatim === "string" ? range.verbatim.trim() : ""
    if (verbatim) {
      return verbatim
    }

    const currency = typeof range.currency === "string" ? range.currency.trim() : ""
    const min = formatAmount(range.min)
    const max = formatAmount(range.max)

    if (min && max) {
      return `${currency ? `${currency} ` : ""}${min} - ${max}`
    }

    if (min) {
      return `${currency ? `${currency} ` : ""}${min}+`
    }

    if (max) {
      return `${currency ? `${currency} ` : ""}up to ${max}`
    }
  }

  return null
}
