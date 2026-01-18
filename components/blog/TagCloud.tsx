import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TagCloudProps {
  tags: string[]
  activeTag?: string
  className?: string
  limit?: number
}

export function TagCloud({ tags, activeTag, className, limit }: TagCloudProps) {
  const displayTags = limit !== undefined ? tags.slice(0, limit) : tags

  if (displayTags.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {displayTags.map((tag) => (
        <Link
          key={tag}
          href={`/blog/tag/${encodeURIComponent(tag)}`}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
            activeTag === tag
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-muted/60 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500'
          )}
        >
          #{tag}
        </Link>
      ))}
    </div>
  )
}
