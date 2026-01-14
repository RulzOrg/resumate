import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NewsletterForm } from './NewsletterForm'

interface NewsletterSectionProps {
  className?: string
  source?: string
}

export function NewsletterSection({ className, source = 'blog_section' }: NewsletterSectionProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/10 px-6 py-12 sm:px-12',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative mx-auto max-w-2xl text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
          <Mail className="h-7 w-7 text-emerald-500" />
        </div>

        <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Get Career Tips in Your Inbox
        </h2>

        <p className="mb-8 text-muted-foreground">
          Join thousands of job seekers receiving weekly resume tips, job search strategies, and career advice. No spam, unsubscribe anytime.
        </p>

        <div className="mx-auto max-w-md">
          <NewsletterForm source={source} />
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </section>
  )
}
