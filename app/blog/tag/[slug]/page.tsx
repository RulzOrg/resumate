import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPostsByTag, getAllTags, getAllCategories, getFeaturedPosts } from '@/lib/blog'
import { BlogHeader, BlogGrid, BlogLayout } from '@/components/blog'

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
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
  )
}
