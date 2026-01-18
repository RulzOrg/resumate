import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getPostsByCategory,
  getAllCategories,
  getCategoryBySlug,
  getAllTags,
  getFeaturedPosts,
} from '@/lib/blog'
import { BlogHeader, BlogGrid, BlogLayout } from '@/components/blog'
import { SiteHeader } from '@/components/site-header'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

// Generate static pages at build time
export async function generateStaticParams() {
  const categories = getAllCategories()
  return categories.map((cat) => ({ slug: cat.slug }))
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params
  const category = getCategoryBySlug(slug)

  if (!category) {
    return {
      title: 'Category Not Found | Resumate Blog',
    }
  }

  return {
    title: `${category.name} | Resumate Blog`,
    description:
      category.description ||
      `Browse all articles about ${category.name.toLowerCase()}.`,
    openGraph: {
      title: `${category.name} | Resumate Blog`,
      description:
        category.description ||
        `Browse all articles about ${category.name.toLowerCase()}.`,
      type: 'website',
    },
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const category = getCategoryBySlug(slug)

  if (!category) {
    notFound()
  }

  const [posts, categories, tags, featuredPosts] = await Promise.all([
    getPostsByCategory(slug),
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
            title={category.name}
            description={category.description || `All posts about ${category.name.toLowerCase()}.`}
          />

          <BlogLayout
            categories={categories}
            tags={tags}
            featuredPosts={featuredPosts}
            activeCategory={slug}
          >
            <BlogGrid posts={posts} />
          </BlogLayout>
        </div>
      </main>
    </>
  )
}
