import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TagCloud } from './TagCloud'
import type { BlogCategory, BlogPostSummary } from '@/lib/blog'

interface BlogSidebarProps {
  categories?: BlogCategory[]
  tags?: string[]
  featuredPosts?: BlogPostSummary[]
  activeCategory?: string
  activeTag?: string
  className?: string
}

export function BlogSidebar({
  categories,
  tags,
  featuredPosts,
  activeCategory,
  activeTag,
  className,
}: BlogSidebarProps) {
  return (
    <aside className={cn('space-y-8', className)}>
      {/* Categories Section */}
      {categories && categories.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Categories
          </h3>
          <nav className="space-y-2">
            <Link
              href="/blog"
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                !activeCategory
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              All Posts
            </Link>
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/blog/category/${category.slug}`}
                className={cn(
                  'block rounded-lg px-3 py-2 text-sm transition-colors',
                  activeCategory === category.slug
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span
                  className="mr-2 inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: category.color || '#10b981' }}
                />
                {category.name}
              </Link>
            ))}
          </nav>
        </div>
      )}

      {/* Tags Section */}
      {tags && tags.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Popular Tags
          </h3>
          <TagCloud tags={tags} activeTag={activeTag} limit={10} />
        </div>
      )}

      {/* Featured Posts Section */}
      {featuredPosts && featuredPosts.length > 0 && (
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Featured Posts
          </h3>
          <div className="space-y-4">
            {featuredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block"
              >
                <h4 className="text-sm font-medium text-foreground group-hover:text-emerald-500">
                  {post.title}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  {post.readingTime}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Newsletter CTA */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-2 font-semibold text-foreground">
          Get Career Tips
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Subscribe to our newsletter for the latest resume tips and job search strategies.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
        >
          Get Started Free
        </Link>
      </div>
    </aside>
  )
}
