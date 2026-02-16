import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { BlogCategory } from '@/lib/blog'

interface CategoryListProps {
  categories: BlogCategory[]
  activeCategory?: string
  className?: string
}

/**
 * Calculate relative luminance of a hex color and return contrasting text color
 */
function getContrastingTextColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255

  // Calculate relative luminance using sRGB formula
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function CategoryList({ categories, activeCategory, className }: CategoryListProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Link
        href="/blog"
        className={cn(
          'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
          !activeCategory
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
        )}
      >
        All
      </Link>
      {categories.map((category) => {
        const isActive = activeCategory === category.slug
        const hasCustomColor = isActive && category.color

        return (
          <Link
            key={category.slug}
            href={`/blog/category/${category.slug}`}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? hasCustomColor
                  ? 'bg-primary' // backgroundColor overridden by inline style
                  : 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
            style={
              hasCustomColor
                ? {
                    backgroundColor: category.color,
                    color: getContrastingTextColor(category.color!),
                  }
                : undefined
            }
          >
            {category.name}
          </Link>
        )
      })}
    </div>
  )
}
