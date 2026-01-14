import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { BlogCategory } from '@/lib/blog'

interface CategoryListProps {
  categories: BlogCategory[]
  activeCategory?: string
  className?: string
}

export function CategoryList({ categories, activeCategory, className }: CategoryListProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Link
        href="/blog"
        className={cn(
          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
          !activeCategory
            ? 'bg-emerald-500 text-white'
            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        )}
      >
        All
      </Link>
      {categories.map((category) => (
        <Link
          key={category.slug}
          href={`/blog/category/${category.slug}`}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
            activeCategory === category.slug
              ? 'bg-emerald-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
          style={
            activeCategory === category.slug && category.color
              ? { backgroundColor: category.color }
              : undefined
          }
        >
          {category.name}
        </Link>
      ))}
    </div>
  )
}
