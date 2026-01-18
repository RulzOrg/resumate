import type { Metadata } from 'next'
import { getAllPosts, getAllCategories, getAllTags, getFeaturedPosts } from '@/lib/blog'
import { BlogHeader, BlogGrid, BlogLayout, NewsletterSection } from '@/components/blog'
import { SiteHeader } from '@/components/site-header'

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
    <>
      <SiteHeader />
      <main className="min-h-screen blog-warm-bg overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24 overflow-hidden">
        <BlogHeader
          title="Blog"
          description="Expert tips, guides, and insights to help you craft the perfect resume and land your dream job."
        />

        <BlogLayout
          categories={categories}
          tags={tags}
          featuredPosts={featuredPosts}
        >
          <BlogGrid posts={posts} />

          {/* Newsletter Section - shown below posts on main content area */}
          <NewsletterSection className="mt-20" source="blog_listing" />
        </BlogLayout>
        </div>
      </main>
    </>
  )
}
