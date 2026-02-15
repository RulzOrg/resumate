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
        'relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-br from-primary/5 via-transparent to-primary/10 px-8 py-16 sm:px-16',
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative mx-auto max-w-2xl text-center">
        <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
          <Mail className="h-8 w-8 text-primary" />
        </div>

        <h2 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl mb-4">
          Get Career Tips in Your Inbox
        </h2>

        <p className="mb-10 text-lg text-muted-foreground leading-relaxed">
          Join thousands of job seekers receiving weekly resume tips, job search strategies, and career advice.
        </p>

        <div className="mx-auto max-w-md">
          <NewsletterForm source={source} />
        </div>

        <p className="mt-6 text-sm text-muted-foreground/70">
          No spam, unsubscribe anytime.
        </p>
      </div>
    </section>
  )
}
