const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const PHONE_REGEX = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/g

export function redactPII(text: string): string {
  return text
    .replace(EMAIL_REGEX, "[redacted-email]")
    .replace(PHONE_REGEX, "[redacted-phone]")
}

function isLikelyContentField(key: string): boolean {
  return ["content", "text", "summary", "description", "preview"].some((label) =>
    key.toLowerCase().includes(label)
  )
}

export function redactForLog(value: unknown, depth = 0): unknown {
  if (value == null) return value

  if (typeof value === "string") {
    if (value.length > 80) {
      return `[redacted-long-text:${value.length}]`
    }
    return redactPII(value)
  }

  if (typeof value !== "object") return value
  if (depth > 3) return "[redacted-depth-limit]"

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactForLog(item, depth + 1))
  }

  const output: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (typeof val === "string" && isLikelyContentField(key)) {
      output[key] = `[redacted-content:${val.length}]`
      continue
    }
    output[key] = redactForLog(val, depth + 1)
  }
  return output
}
