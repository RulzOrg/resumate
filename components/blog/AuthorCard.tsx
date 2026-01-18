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
            className="rounded-full ring-2 ring-border/50"
          />
        )}
        <span className="text-sm font-medium text-muted-foreground">{author.name}</span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-start gap-5 rounded-2xl border border-border/60 bg-card/50 p-6', className)}>
      {author.avatar && (
        <Image
          src={author.avatar}
          alt={author.name}
          width={72}
          height={72}
          className="rounded-full ring-2 ring-border/50 shrink-0"
        />
      )}
      <div>
        <h3 className="font-serif text-lg font-semibold text-foreground">{author.name}</h3>
        {author.bio && (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{author.bio}</p>
        )}
      </div>
    </div>
  )
}
