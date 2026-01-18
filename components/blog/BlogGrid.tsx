import { cn } from '@/lib/utils'
import { BlogCard } from './BlogCard'
import type { BlogPostSummary } from '@/lib/blog'

interface BlogGridProps {
  posts: BlogPostSummary[]
  className?: string
}

export function BlogGrid({ posts, className }: BlogGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="font-serif text-xl text-muted-foreground">No posts found.</p>
        <p className="mt-2 text-sm text-muted-foreground/70">
          Check back soon for new content.
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-8 sm:grid-cols-2 lg:gap-10',
        className
      )}
    >
      {posts.map((post) => (
        <BlogCard key={post.slug} post={post} />
      ))}
    </div>
  )
}
