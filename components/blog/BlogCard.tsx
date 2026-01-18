import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { BlogPostSummary } from '@/lib/blog'

interface BlogCardProps {
  post: BlogPostSummary
  className?: string
  variant?: 'default' | 'featured'
}

export function BlogCard({ post, className, variant = 'default' }: BlogCardProps) {
  const isFeatured = variant === 'featured'

  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card blog-card-hover',
        'dark:border-border/40 dark:bg-card/50',
        className
      )}
    >
      {post.featured_image && (
        <Link
          href={`/blog/${post.slug}`}
          className={cn(
            'relative overflow-hidden',
            isFeatured ? 'aspect-[2.4/1]' : 'aspect-[1.65/1]'
          )}
        >
          <Image
            src={post.featured_image}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
          {/* Subtle gradient overlay for better text contrast */}
          <div className="absolute inset-0 bg-linear-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>
      )}
      <div className={cn(
        'flex flex-1 flex-col',
        isFeatured ? 'p-8' : 'p-6'
      )}>
        {post.category && (
          <Link
            href={`/blog/category/${post.category}`}
            className="mb-3 inline-block text-xs font-semibold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            {post.category.replace(/-/g, ' ')}
          </Link>
        )}
        <h2 className={cn(
          'font-serif font-semibold text-foreground leading-tight tracking-tight',
          isFeatured ? 'text-2xl mb-4' : 'text-xl mb-3'
        )}>
          <Link
            href={`/blog/${post.slug}`}
            className="hover:text-emerald-500 transition-colors duration-200"
          >
            {post.title}
          </Link>
        </h2>
        {post.excerpt && (
          <p className={cn(
            'flex-1 text-muted-foreground leading-relaxed',
            isFeatured ? 'text-base line-clamp-3 mb-6' : 'text-sm line-clamp-2 mb-4'
          )}>
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground/80">
          <time dateTime={post.date} className="font-medium">
            {new Date(post.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </time>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
          <span>{post.readingTime}</span>
        </div>
      </div>
    </article>
  )
}
