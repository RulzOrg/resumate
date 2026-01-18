'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewsletterFormProps {
  className?: string
  variant?: 'default' | 'inline' | 'card'
  source?: string
}

export function NewsletterForm({
  className,
  variant = 'default',
  source = 'blog',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const response = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          source,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage(data.message || 'Thanks for subscribing!')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-4',
          className
        )}
      >
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-500" />
        <p className="text-sm text-emerald-500">{message}</p>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <form onSubmit={handleSubmit} className={cn('relative flex gap-2', className)}>
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={status === 'loading'}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-emerald-500 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Subscribe'
          )}
        </button>
        {status === 'error' && (
          <p className="absolute -bottom-6 left-0 text-xs text-red-500">{message}</p>
        )}
      </form>
    )
  }

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'rounded-xl border bg-gradient-to-br from-emerald-500/10 to-transparent p-6',
          className
        )}
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
          <Mail className="h-5 w-5 text-emerald-500" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          Get Career Tips Weekly
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Join thousands of job seekers receiving our best resume tips, job search strategies, and career advice.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="h-10 w-full rounded-lg border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-emerald-500 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
          >
            {status === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Subscribe Free'
            )}
          </button>
          {status === 'error' && (
            <p className="text-xs text-red-500">{message}</p>
          )}
          <p className="text-center text-xs text-muted-foreground">
            No spam, unsubscribe anytime.
          </p>
        </form>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn('space-y-4', className)}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="h-11 w-full rounded-lg border bg-background pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={status === 'loading'}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-500 px-6 font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Subscribe'
          )}
        </button>
      </form>
      {status === 'error' && (
        <p className="text-sm text-red-500">{message}</p>
      )}
    </div>
  )
}
