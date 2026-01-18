import { cn } from '@/lib/utils'
import { BlogSidebar } from './BlogSidebar'
import type { BlogCategory, BlogPostSummary } from '@/lib/blog'

interface BlogLayoutProps {
  children: React.ReactNode
  categories?: BlogCategory[]
  tags?: string[]
  featuredPosts?: BlogPostSummary[]
  activeCategory?: string
  activeTag?: string
  showSidebar?: boolean
  className?: string
}

export function BlogLayout({
  children,
  categories,
  tags,
  featuredPosts,
  activeCategory,
  activeTag,
  showSidebar = true,
  className,
}: BlogLayoutProps) {
  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className={cn('grid gap-12 lg:grid-cols-[1fr_300px] lg:gap-16', className)}>
      <div>{children}</div>
      <BlogSidebar
        categories={categories}
        tags={tags}
        featuredPosts={featuredPosts}
        activeCategory={activeCategory}
        activeTag={activeTag}
        className="hidden lg:block"
      />
    </div>
  )
}
