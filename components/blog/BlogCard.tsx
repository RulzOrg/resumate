import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { BlogPostSummary } from '@/lib/blog'

interface BlogCardProps {
  post: BlogPostSummary
  className?: string
}

export function BlogCard({ post, className }: BlogCardProps) {
  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:border-emerald-500/50 hover:shadow-lg',
        className
      )}
    >
      {post.featured_image && (
        <Link href={`/blog/${post.slug}`} className="relative aspect-video overflow-hidden">
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        </Link>
      )}
      <div className="flex flex-1 flex-col p-5">
        {post.category && (
          <Link
            href={`/blog/category/${post.category}`}
            className="mb-2 text-xs font-medium uppercase tracking-wider text-emerald-500 hover:text-emerald-400"
          >
            {post.category.replace(/-/g, ' ')}
          </Link>
        )}
        <h2 className="mb-2 text-lg font-semibold leading-tight text-foreground">
          <Link href={`/blog/${post.slug}`} className="hover:text-emerald-500">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-3">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <time dateTime={post.date}>
            {new Date(post.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
          <span>·</span>
          <span>{post.readingTime}</span>
        </div>
      </div>
    </article>
  )
}
