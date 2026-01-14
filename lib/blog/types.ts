export interface BlogPostFrontmatter {
  title: string
  slug: string
  date: string
  status: 'draft' | 'published'
  category?: string
  tags?: string[]
  featured_image?: string
  excerpt?: string
  author?: string
  updated?: string
  featured?: boolean
  seo?: {
    title?: string
    description?: string
  }
}

export interface BlogPost extends BlogPostFrontmatter {
  content: string
  html?: string
  readingTime: string
  wordCount: number
}

export interface BlogPostSummary {
  title: string
  slug: string
  date: string
  category?: string
  tags?: string[]
  featured_image?: string
  excerpt?: string
  author?: string
  readingTime: string
  featured?: boolean
}

export interface BlogCategory {
  slug: string
  name: string
  description?: string
  color?: string
}

export interface BlogAuthor {
  slug: string
  name: string
  bio?: string
  avatar?: string
}

export interface TocItem {
  id: string
  text: string
  level: number
}
