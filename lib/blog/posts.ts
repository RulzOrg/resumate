import fs from 'fs'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import { processMarkdown, parseMarkdownFile, generateExcerpt } from './markdown'
import type { BlogPost, BlogPostSummary, BlogCategory, BlogAuthor } from './types'

const CONTENT_DIR = path.join(process.cwd(), 'content')
const POSTS_DIR = path.join(CONTENT_DIR, 'posts')
const CATEGORIES_FILE = path.join(CONTENT_DIR, 'categories', 'categories.json')
const AUTHORS_FILE = path.join(CONTENT_DIR, 'authors', 'authors.json')

// Cached slug-to-filename index for O(1) lookups
let slugIndex: Map<string, string> | null = null

/**
 * Build an index mapping slugs to filenames for efficient lookups
 */
function buildSlugIndex(): Map<string, string> {
  const index = new Map<string, string>()

  if (!fs.existsSync(POSTS_DIR)) {
    return index
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))

  for (const file of files) {
    try {
      const filePath = path.join(POSTS_DIR, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { data } = matter(fileContent)
      if (data.slug) {
        index.set(data.slug, file)
      }
    } catch (error) {
      console.error(`Failed to index post file (${file}):`, error)
    }
  }

  return index
}

/**
 * Get the slug index, building it if necessary
 */
function getSlugIndex(): Map<string, string> {
  if (!slugIndex) {
    slugIndex = buildSlugIndex()
  }
  return slugIndex
}

/**
 * Get all published blog posts
 */
export async function getAllPosts(): Promise<BlogPostSummary[]> {
  if (!fs.existsSync(POSTS_DIR)) {
    return []
  }

  const files = fs.readdirSync(POSTS_DIR)

  const posts = files
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const filePath = path.join(POSTS_DIR, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { frontmatter, content, readingTime } = parseMarkdownFile(fileContent)

      const excerpt = frontmatter.excerpt || generateExcerpt(content)

      return {
        title: frontmatter.title,
        slug: frontmatter.slug,
        date: frontmatter.date,
        status: frontmatter.status,
        category: frontmatter.category,
        tags: frontmatter.tags,
        featured_image: frontmatter.featured_image,
        excerpt,
        author: frontmatter.author,
        readingTime,
        featured: frontmatter.featured,
      }
    })

  // Filter only published posts and sort by date (newest first)
  return posts
    .filter((post) => post.status === 'published')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Get a single post by slug
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const index = getSlugIndex()
    const filename = index.get(slug)

    if (!filename) {
      return null
    }

    const filePath = path.join(POSTS_DIR, filename)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { frontmatter, content, readingTime, wordCount } = parseMarkdownFile(fileContent)

    // Only return published posts (or allow draft preview in development)
    if (frontmatter.status !== 'published' && process.env.NODE_ENV !== 'development') {
      return null
    }

    const html = await processMarkdown(content)
    const excerpt = frontmatter.excerpt || generateExcerpt(content)

    return {
      ...frontmatter,
      excerpt,
      content,
      html,
      readingTime,
      wordCount,
    }
  } catch (error) {
    console.error(`Error reading post ${slug}:`, error)
    return null
  }
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(categorySlug: string): Promise<BlogPostSummary[]> {
  const posts = await getAllPosts()
  return posts.filter((post) => post.category === categorySlug)
}

/**
 * Get posts by tag
 */
export async function getPostsByTag(tag: string): Promise<BlogPostSummary[]> {
  const posts = await getAllPosts()
  return posts.filter((post) => post.tags?.includes(tag))
}

/**
 * Get all unique tags from posts
 */
export async function getAllTags(): Promise<string[]> {
  try {
    if (!fs.existsSync(POSTS_DIR)) {
      return []
    }

    const files = await readdir(POSTS_DIR)
    const mdFiles = files.filter((file) => file.endsWith('.md'))

    const tagArrays = await Promise.all(
      mdFiles.map(async (file) => {
        const filePath = path.join(POSTS_DIR, file)
        const fileContent = await readFile(filePath, 'utf-8')
        const { data } = matter(fileContent)
        // Only include tags from published posts
        if (data.status !== 'published') return []
        return data.tags || []
      })
    )

    const tags = tagArrays.flat()
    return [...new Set(tags)]
  } catch (error) {
    console.error(`Failed to get tags from posts directory (${POSTS_DIR}):`, error)
    return []
  }
}

/**
 * Get all post slugs for static generation
 */
export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(POSTS_DIR)) {
    return []
  }

  const files = fs.readdirSync(POSTS_DIR)

  return files
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const filePath = path.join(POSTS_DIR, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { data } = matter(fileContent)
      // Only include slugs from published posts
      return data.status === 'published' ? data.slug : null
    })
    .filter(Boolean)
}

/**
 * Get all categories
 */
export function getAllCategories(): BlogCategory[] {
  if (!fs.existsSync(CATEGORIES_FILE)) {
    return []
  }

  try {
    const content = fs.readFileSync(CATEGORIES_FILE, 'utf-8')
    return JSON.parse(content) as BlogCategory[]
  } catch (error) {
    console.error(`Failed to parse categories file (${CATEGORIES_FILE}):`, error)
    return []
  }
}

/**
 * Get a category by slug
 */
export function getCategoryBySlug(slug: string): BlogCategory | null {
  const categories = getAllCategories()
  return categories.find((cat) => cat.slug === slug) || null
}

/**
 * Get all authors
 */
export function getAllAuthors(): BlogAuthor[] {
  if (!fs.existsSync(AUTHORS_FILE)) {
    return []
  }

  try {
    const content = fs.readFileSync(AUTHORS_FILE, 'utf-8')
    return JSON.parse(content) as BlogAuthor[]
  } catch (error) {
    console.error(`Failed to parse authors file (${AUTHORS_FILE}):`, error)
    return []
  }
}

/**
 * Get an author by slug
 */
export function getAuthorBySlug(slug: string): BlogAuthor | null {
  const authors = getAllAuthors()
  return authors.find((author) => author.slug === slug) || null
}

/**
 * Get featured posts
 */
export async function getFeaturedPosts(limit: number = 3): Promise<BlogPostSummary[]> {
  const posts = await getAllPosts()
  return posts.filter((post) => post.featured).slice(0, limit)
}

/**
 * Get related posts based on category and tags
 */
export async function getRelatedPosts(
  currentSlug: string,
  category?: string,
  tags?: string[],
  limit: number = 3
): Promise<BlogPostSummary[]> {
  const posts = await getAllPosts()

  // Filter out current post
  const otherPosts = posts.filter((post) => post.slug !== currentSlug)

  // Score posts by relevance
  const scoredPosts = otherPosts.map((post) => {
    let score = 0

    // Same category = high relevance
    if (category && post.category === category) {
      score += 10
    }

    // Matching tags
    if (tags && post.tags) {
      const matchingTags = tags.filter((tag) => post.tags?.includes(tag))
      score += matchingTags.length * 3
    }

    return { post, score }
  })

  // Sort by score and return top posts
  return scoredPosts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post)
}
