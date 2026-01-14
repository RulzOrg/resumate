import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, Rss } from 'lucide-react'
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
    getRelatedPosts(slug, post.category, post.tags, 3),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ReadingProgress />
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          {/* Back link and RSS */}
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>
            <Link
              href="/blog/feed"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-emerald-500"
              title="RSS Feed"
            >
              <Rss className="h-4 w-4" />
              <span className="hidden sm:inline">RSS</span>
            </Link>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_250px]">
            {/* Main content */}
            <article className="min-w-0">
              {/* Post header */}
              <header className="mb-8">
                {category && (
                  <Link
                    href={`/blog/category/${category.slug}`}
                    className="mb-4 inline-block text-sm font-medium uppercase tracking-wider text-emerald-500 hover:text-emerald-400"
                  >
                    {category.name}
                  </Link>
                )}
                <h1 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {post.title}
                </h1>
                {post.excerpt && (
                  <p className="mb-6 text-lg text-muted-foreground lg:text-xl">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
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
                  {author && (
                    <div className="flex items-center gap-2">
                      {author.avatar && (
                        <Image
                          src={author.avatar}
                          alt={author.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      <span>{author.name}</span>
                    </div>
                  )}
                </div>

                {/* Share buttons - mobile */}
                <div className="mt-6 lg:hidden">
                  <ShareButtons title={post.title} url={postUrl} />
                </div>
              </header>

              {/* Featured image */}
              {post.featured_image && (
                <div className="relative mb-10 aspect-video overflow-hidden rounded-xl">
                  <Image
                    src={post.featured_image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              {/* Post content */}
              {post.html && <MarkdownContent html={post.html} className="mb-12" />}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mb-8 border-t border-border pt-8">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Tags
                  </h3>
                  <TagCloud tags={post.tags} />
                </div>
              )}

              {/* Share section */}
              <div className="mb-8 rounded-xl border bg-card p-6">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <p className="text-sm text-muted-foreground">
                    Found this helpful? Share it with others!
                  </p>
                  <ShareButtons title={post.title} url={postUrl} />
                </div>
              </div>

              {/* Author */}
              {author && (
                <div className="mb-8">
                  <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Written by
                  </h3>
                  <AuthorCard author={author} />
                </div>
              )}

              {/* Newsletter CTA - inline for mobile, hidden on desktop (shown in sidebar) */}
              <div className="mb-12 lg:hidden">
                <NewsletterForm variant="card" source="blog_post_inline" />
              </div>

              {/* Related posts */}
              {relatedPosts.length > 0 && (
                <section className="border-t border-border pt-12">
                  <h2 className="mb-6 text-2xl font-bold text-foreground">
                    Related Posts
                  </h2>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {relatedPosts.map((relatedPost) => (
                      <BlogCard key={relatedPost.slug} post={relatedPost} />
                    ))}
                  </div>
                </section>
              )}
            </article>

            {/* Sidebar - Table of Contents */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-8">
                {toc.length > 0 && (
                  <TableOfContents items={toc} />
                )}

                {/* Share buttons - desktop */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
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
