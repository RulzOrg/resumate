'use client'

import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  html: string
  className?: string
}

export function MarkdownContent({ html, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        // Base editorial prose styling
        'prose-editorial',
        'max-w-none overflow-hidden',
        // Dark mode adjustments
        'dark:prose-invert',
        // Headings - using serif font
        'prose-headings:font-serif prose-headings:text-foreground',
        // Links
        'prose-a:text-emerald-500 prose-a:no-underline hover:prose-a:text-emerald-400',
        // Code - inline
        'prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal',
        'prose-code:before:content-none prose-code:after:content-none',
        // Code blocks
        'prose-pre:rounded-xl prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-border/50',
        // Lists
        'prose-li:marker:text-emerald-500',
        // Blockquotes
        'prose-blockquote:border-l-emerald-500 prose-blockquote:text-muted-foreground prose-blockquote:not-italic',
        // Images
        'prose-img:rounded-xl',
        // Strong/Bold
        'prose-strong:text-foreground prose-strong:font-semibold',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
