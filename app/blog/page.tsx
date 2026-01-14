import type { Metadata } from 'next'
import { getAllPosts, getAllCategories } from '@/lib/blog'
import { BlogHeader, BlogGrid, CategoryList } from '@/components/blog'

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
  const [posts, categories] = await Promise.all([
    getAllPosts(),
    getAllCategories(),
  ])

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <BlogHeader
          title="Blog"
          description="Tips, guides, and insights to help you land your dream job."
        />

        {categories.length > 0 && (
          <CategoryList categories={categories} className="mb-8" />
        )}

        <BlogGrid posts={posts} />
      </div>
    </main>
  )
}
