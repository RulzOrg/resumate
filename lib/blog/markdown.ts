import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'
import matter from 'gray-matter'
import readingTime from 'reading-time'
import type { BlogPostFrontmatter, TocItem } from './types'

/**
 * Process markdown content to HTML
 */
export async function processMarkdown(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'wrap',
      properties: {
        className: ['anchor-link'],
      },
    })
    .use(rehypeHighlight, { detect: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(content)

  return String(result)
}

/**
 * Parse frontmatter and content from a markdown file
 */
export function parseMarkdownFile(fileContent: string) {
  const { data, content } = matter(fileContent)
  const stats = readingTime(content)

  return {
    frontmatter: data as BlogPostFrontmatter,
    content,
    readingTime: stats.text,
    wordCount: stats.words,
  }
}

/**
 * Extract table of contents from rendered HTML
 */
export function extractTableOfContents(html: string): TocItem[] {
  const headingRegex = /<h([2-4])[^>]*id="([^"]+)"[^>]*>[\s\S]*?<a[^>]*>([^<]*)<\/a>[\s\S]*?<\/h\1>/g
  const toc: TocItem[] = []
  let match

  while ((match = headingRegex.exec(html)) !== null) {
    toc.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3].trim(),
    })
  }

  // Fallback regex for headings without anchor wrapper
  if (toc.length === 0) {
    const simpleHeadingRegex = /<h([2-4])[^>]*id="([^"]+)"[^>]*>([^<]+)<\/h\1>/g
    while ((match = simpleHeadingRegex.exec(html)) !== null) {
      toc.push({
        level: parseInt(match[1]),
        id: match[2],
        text: match[3].trim(),
      })
    }
  }

  return toc
}

/**
 * Generate excerpt from content if not provided
 */
export function generateExcerpt(content: string, maxLength: number = 160): string {
  // Remove markdown syntax
  const plainText = content
    .replace(/#{1,6}\s/g, '') // headers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/`[^`]+`/g, '') // inline code
    .replace(/```[\s\S]*?```/g, '') // code blocks
    .replace(/\n+/g, ' ') // newlines
    .trim()

  if (plainText.length <= maxLength) {
    return plainText
  }

  // Truncate at word boundary
  const truncated = plainText.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + '...'
}
