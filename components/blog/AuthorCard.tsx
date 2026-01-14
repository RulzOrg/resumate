import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { BlogAuthor } from '@/lib/blog'

interface AuthorCardProps {
  author: BlogAuthor
  className?: string
  variant?: 'compact' | 'full'
}

export function AuthorCard({ author, className, variant = 'full' }: AuthorCardProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {author.avatar && (
          <Image
            src={author.avatar}
            alt={author.name}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <span className="text-sm text-muted-foreground">{author.name}</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-start gap-4 rounded-xl border bg-card p-5', className)}>
      {author.avatar && (
        <Image
          src={author.avatar}
          alt={author.name}
          width={64}
          height={64}
          className="rounded-full"
        />
      )}
      <div>
        <h3 className="font-semibold text-foreground">{author.name}</h3>
        {author.bio && (
          <p className="mt-1 text-sm text-muted-foreground">{author.bio}</p>
        )}
      </div>
    </div>
  )
}
