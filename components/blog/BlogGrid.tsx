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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-muted-foreground">No posts found.</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-6 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {posts.map((post) => (
        <BlogCard key={post.slug} post={post} />
      ))}
    </div>
  )
}
