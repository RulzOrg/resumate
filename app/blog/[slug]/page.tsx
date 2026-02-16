import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Calendar, Clock } from 'lucide-react'
import { SiteHeader } from '@/components/site-header'
import {
  getAllPostSlugs,
  getPostBySlug,
  getRelatedPosts,
  getCategoryBySlug,
  getAuthorBySlug,
  extractTableOfContents,
} from '@/lib/blog'
import {
  MarkdownContent,
  BlogCard,
  AuthorCard,
  TagCloud,
  ReadingProgress,
  ShareButtons,
  TableOfContents,
  NewsletterForm,
} from '@/components/blog'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

// Safe JSON serialization that escapes HTML-breaking sequences
function safeJsonLd(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}

// Generate static pages at build time
export async function generateStaticParams() {
  const slugs = getAllPostSlugs()
  return slugs.map((slug) => ({ slug }))
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found | Resumate Blog',
    }
  }

  return {
    title: post.seo?.title || `${post.title} | Resumate Blog`,
    description: post.seo?.description || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updated,
      images: post.featured_image ? [post.featured_image] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : [],
    },
    alternates: {
      types: {
        'application/rss+xml': '/blog/feed',
      },
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const [relatedPosts, category, author] = await Promise.all([
    getRelatedPosts(slug, post.category, post.tags, 2),
    post.category ? getCategoryBySlug(post.category) : null,
    post.author ? getAuthorBySlug(post.author) : null,
  ])

  // Extract table of contents from rendered HTML
  const toc = post.html ? extractTableOfContents(post.html) : []

  // Full URL for sharing
  const postUrl = `https://www.useresumate.com/blog/${slug}`

  // JSON-LD structured data for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featured_image,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: {
      '@type': 'Person',
      name: author?.name || 'Resumate Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Resumate',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.useresumate.com/images/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <SiteHeader />
      <ReadingProgress />
      <main className="min-h-screen blog-warm-bg overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20 overflow-hidden">
          <div className="grid gap-16 lg:grid-cols-[1fr_280px]">
            {/* Main content */}
            <article className="min-w-0">
              {/* Post header */}
              <header className="mb-12 lg:mb-16">
                {category && (
                  <Link
                    href={`/blog/category/${category.slug}`}
                    className="mb-6 inline-block text-sm font-semibold uppercase tracking-widest text-primary hover:text-primary/90 transition-colors"
                  >
                    {category.name}
                  </Link>
                )}
                <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1] mb-6">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  {author && (
                    <div className="flex items-center gap-3">
                      {author.avatar && (
                        <Image
                          src={author.avatar}
                          alt={author.name}
                          width={40}
                          height={40}
                          className="rounded-full ring-2 ring-border/50"
                        />
                      )}
                      <span className="font-medium text-foreground">{author.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{post.readingTime}</span>
                  </div>
                </div>

                {/* Share buttons - mobile */}
                <div className="mt-8 lg:hidden">
                  <ShareButtons title={post.title} url={postUrl} />
                </div>
              </header>

              {/* Featured image */}
              {post.featured_image && (
                <div className="relative mb-16 aspect-[2.4/1] overflow-hidden rounded-2xl">
                  <Image
                    src={post.featured_image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              {/* Post content - constrained width for readability */}
              <div className="max-w-[680px]">
                {post.html && <MarkdownContent html={post.html} className="mb-16" />}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mb-12 border-t border-border/60 pt-12">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Topics
                    </h3>
                    <TagCloud tags={post.tags} />
                  </div>
                )}

                {/* Share section */}
                <div className="mb-12 rounded-2xl border border-border/60 bg-card/50 p-8">
                  <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
                    <div>
                      <p className="font-serif text-lg font-medium text-foreground mb-1">
                        Enjoyed this article?
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Share it with others who might find it helpful.
                      </p>
                    </div>
                    <ShareButtons title={post.title} url={postUrl} />
                  </div>
                </div>

                {/* Author */}
                {author && (
                  <div className="mb-12">
                    <h3 className="mb-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Written by
                    </h3>
                    <AuthorCard author={author} />
                  </div>
                )}

                {/* Newsletter CTA - inline for mobile, hidden on desktop (shown in sidebar) */}
                <div className="mb-16 lg:hidden">
                  <NewsletterForm variant="card" source="blog_post_inline" />
                </div>
              </div>

              {/* Related posts - full width */}
              {relatedPosts.length > 0 && (
                <section className="border-t border-border/60 pt-16">
                  <h2 className="font-serif text-3xl font-semibold text-foreground mb-10">
                    Continue Reading
                  </h2>
                  <div className="grid gap-8 sm:grid-cols-2">
                    {relatedPosts.map((relatedPost) => (
                      <BlogCard key={relatedPost.slug} post={relatedPost} />
                    ))}
                  </div>
                </section>
              )}
            </article>

            {/* Sidebar - Table of Contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-10">
                {toc.length > 0 && (
                  <TableOfContents items={toc} />
                )}

                {/* Share buttons - desktop */}
                <div>
                  <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Share
                  </h3>
                  <ShareButtons title={post.title} url={postUrl} variant="vertical" />
                </div>

                {/* Newsletter */}
                <NewsletterForm variant="card" source="blog_post_sidebar" />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  )
}
