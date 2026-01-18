import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BlogHeaderProps {
  title?: string
  description?: string
  className?: string
}

export function BlogHeader({
  title = 'Blog',
  description = 'Tips, guides, and insights to help you land your dream job.',
  className,
}: BlogHeaderProps) {
  return (
    <header className={cn('mb-16', className)}>
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="mx-3 text-border">/</span>
        <span className="text-foreground font-medium">{title}</span>
      </nav>
      <h1 className="font-serif text-5xl font-semibold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.05]">
        {title}
      </h1>
      {description && (
        <p className="mt-6 text-xl text-muted-foreground leading-relaxed max-w-2xl">
          {description}
        </p>
      )}
    </header>
  )
}
