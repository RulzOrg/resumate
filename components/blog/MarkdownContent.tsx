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
        'prose prose-invert max-w-none',
        // Headings
        'prose-headings:font-semibold prose-headings:text-foreground',
        'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg',
        'prose-h2:mt-10 prose-h2:border-b prose-h2:border-border prose-h2:pb-2',
        // Links
        'prose-a:text-emerald-500 prose-a:no-underline hover:prose-a:text-emerald-400 hover:prose-a:underline',
        // Code
        'prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-normal',
        'prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:rounded-lg prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-border',
        // Lists
        'prose-li:marker:text-emerald-500',
        // Blockquotes
        'prose-blockquote:border-l-emerald-500 prose-blockquote:text-muted-foreground',
        // Images
        'prose-img:rounded-lg',
        // Strong/Bold
        'prose-strong:text-foreground',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
