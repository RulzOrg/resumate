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
    <header className={cn('mb-10', className)}>
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{title}</span>
      </nav>
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description && (
        <p className="mt-3 text-lg text-muted-foreground">{description}</p>
      )}
    </header>
  )
}
