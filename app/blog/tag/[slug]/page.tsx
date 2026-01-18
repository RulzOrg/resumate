import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostsByTag, getAllTags, getAllCategories, getFeaturedPosts } from '@/lib/blog'
import { BlogHeader, BlogGrid, BlogLayout } from '@/components/blog'
import { SiteHeader } from '@/components/site-header'

interface TagPageProps {
  params: Promise<{ slug: string }>
}

// Generate static pages at build time
export async function generateStaticParams() {
  const tags = getAllTags()
  return tags.map((tag) => ({ slug: tag }))
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { slug } = await params
  const decodedTag = decodeURIComponent(slug)

  return {
    title: `Posts tagged "${decodedTag}" | Resumate Blog`,
    description: `Browse all articles tagged with "${decodedTag}" on the Resumate blog.`,
    openGraph: {
      title: `Posts tagged "${decodedTag}" | Resumate Blog`,
      description: `Browse all articles tagged with "${decodedTag}".`,
      type: 'website',
    },
  }
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params
  const decodedTag = decodeURIComponent(slug)

  const [posts, categories, tags, featuredPosts] = await Promise.all([
    getPostsByTag(decodedTag),
    getAllCategories(),
    getAllTags(),
    getFeaturedPosts(3),
  ])

  // If no posts found for this tag, show 404
  if (posts.length === 0) {
    notFound()
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen blog-warm-bg overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24 overflow-hidden">
          <BlogHeader
            title={`#${decodedTag}`}
            description={`All posts tagged with "${decodedTag}".`}
          />

          <BlogLayout
            categories={categories}
            tags={tags}
            featuredPosts={featuredPosts}
            activeTag={decodedTag}
          >
            <BlogGrid posts={posts} />
          </BlogLayout>
        </div>
      </main>
    </>
  )
}
