import { createDomLoader } from "./utils"
import type { ExtractionContext } from "./types"

export function createExtractionContext(url: string, html: string): ExtractionContext {
  const parsedUrl = new URL(url)
  let domLoader: () => Promise<import("jsdom").JSDOM>
  const context: ExtractionContext = {
    url: parsedUrl,
    html,
    getDom: async () => domLoader(),
  }

  domLoader = createDomLoader(context)
  return context
}
