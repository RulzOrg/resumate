import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"

const SCRIPTISH_TAGS = /<\/?(?:script|style|iframe|object|embed|link|meta)[^>]*>/gi
const EVENT_HANDLERS = /\son[a-z]+\s*=\s*(['"]).*?\1/gi
const JS_PROTOCOL = /(href|src)\s*=\s*(['"])\s*(?:javascript:|data:text\/html)/gi

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function renderSafeHtmlFromMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(markdown)

  return sanitizeRenderedHtml(String(file))
}

export function sanitizeRenderedHtml(html: string): string {
  return html
    .replace(SCRIPTISH_TAGS, "")
    .replace(EVENT_HANDLERS, "")
    .replace(JS_PROTOCOL, '$1=$2#')
}

export function wrapHtmlDocument(contentHtml: string, title: string, styles: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
${contentHtml}
</body>
</html>`
}
