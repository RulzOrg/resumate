import { Readability } from "@mozilla/readability"
import type { JSDOM } from "jsdom"
import type { ExtractionContext } from "./types"

export function createDomLoader(context: ExtractionContext): () => Promise<JSDOM> {
  let domPromise: Promise<JSDOM> | null = null
  return () => {
    if (!domPromise) {
      domPromise = import("jsdom").then(({ JSDOM }) => new JSDOM(context.html, { url: context.url.toString() }))
    }
    return domPromise
  }
}

export async function extractReadabilityContent(context: ExtractionContext): Promise<{ title: string | null; content: string | null }> {
  const dom = await context.getDom()
  const reader = new Readability(dom.window.document)
  const article = reader.parse()
  return {
    title: article?.title ?? null,
    content: article?.textContent ?? null,
  }
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}
