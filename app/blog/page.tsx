import type { Metadata } from 'next'
import { getAllPosts, getAllCategories, getAllTags, getFeaturedPosts } from '@/lib/blog'
import { BlogHeader, BlogGrid, BlogLayout } from '@/components/blog'

export const metadata: Metadata = {
  title: 'Blog | Resumate - Resume Tips & Career Advice',
  description:
    'Expert tips, guides, and insights on resume writing, job searching, and career development. Learn how to optimize your resume and land your dream job.',
  openGraph: {
    title: 'Blog | Resumate - Resume Tips & Career Advice',
    description:
      'Expert tips, guides, and insights on resume writing, job searching, and career development.',
    type: 'website',
  },
}

// Revalidate every hour
export const revalidate = 3600

export default async function BlogPage() {
  const [posts, categories, tags, featuredPosts] = await Promise.all([
    getAllPosts(),
    getAllCategories(),
    getAllTags(),
    getFeaturedPosts(3),
  ])

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <BlogHeader
          title="Blog"
          description="Tips, guides, and insights to help you land your dream job."
        />

        <BlogLayout
          categories={categories}
          tags={tags}
          featuredPosts={featuredPosts}
        >
          <BlogGrid posts={posts} />
        </BlogLayout>
      </div>
    </main>
  )
}
