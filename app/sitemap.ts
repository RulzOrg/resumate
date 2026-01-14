import type { MetadataRoute } from 'next'
import { getAllPosts, getAllCategories, getAllTags } from '@/lib/blog'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.useresumate.com'

  // Get all blog content
  const [posts, categories, tags] = await Promise.all([
    getAllPosts(),
    getAllCategories(),
    getAllTags(),
  ])

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  // Blog posts
  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${baseUrl}/blog/category/${category.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Tag pages
  const tagPages: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${baseUrl}/blog/tag/${encodeURIComponent(tag)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  return [...staticPages, ...postPages, ...categoryPages, ...tagPages]
}
