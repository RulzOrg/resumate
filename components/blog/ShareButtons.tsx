'use client'

import { Twitter, Linkedin, Link2, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ShareButtonsProps {
  title: string
  url: string
  className?: string
  variant?: 'horizontal' | 'vertical'
}

export function ShareButtons({
  title,
  url,
  className,
  variant = 'horizontal',
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const encodedTitle = encodeURIComponent(title)
  const encodedUrl = encodeURIComponent(url)

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const buttonClass = cn(
    'flex items-center justify-center rounded-lg border bg-card p-2.5 text-muted-foreground transition-all',
    'hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-500'
  )

  return (
    <div
      className={cn(
        'flex gap-2',
        variant === 'vertical' ? 'flex-col' : 'flex-row',
        className
      )}
    >
      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label="Share on Twitter"
      >
        <Twitter className="h-4 w-4" />
      </a>
      <a
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
        aria-label="Share on LinkedIn"
      >
        <Linkedin className="h-4 w-4" />
      </a>
      <button
        onClick={copyToClipboard}
        className={cn(buttonClass, copied && 'border-emerald-500 bg-emerald-500/10 text-emerald-500')}
        aria-label="Copy link"
      >
        {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      </button>
    </div>
  )
}
