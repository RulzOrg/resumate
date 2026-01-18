# Markdown CMS Blog Feature - Technical Planning Document

## Overview

This document outlines the technical plan for adding a file-based markdown CMS blog to Resumate, following the principles from the [Markdown CMS Guide](https://github.com/bentossell/markdown-cms-guide/). The blog uses markdown files stored in version control for a simple, portable, and developer-friendly content management approach.

---

## Table of Contents

1. [Goals & Objectives](#goals--objectives)
2. [Architecture Overview](#architecture-overview)
3. [Content Structure](#content-structure)
4. [Directory Layout](#directory-layout)
5. [Markdown Processing](#markdown-processing)
6. [Next.js Integration](#nextjs-integration)
7. [API Design](#api-design)
8. [Frontend Routes & Components](#frontend-routes--components)
9. [SEO Optimization](#seo-optimization)
10. [Dependencies](#dependencies)
11. [Implementation Phases](#implementation-phases)
12. [Content Authoring Workflow](#content-authoring-workflow)
13. [Future Enhancements](#future-enhancements)

---

## Goals & Objectives

### Primary Goals

1. **Content Marketing** - Establish Resumate as an authority in resume writing and career advice
2. **SEO Traffic** - Drive organic search traffic through valuable, keyword-optimized content
3. **Simplicity** - File-based content that's portable and version-controlled
4. **Developer-Friendly** - Content is plain text markdown, easy to write and review

### Key Principles (from Markdown CMS Guide)

- **Content is portable** - Plain text files in version control
- **Build is deterministic** - Identical inputs produce identical outputs
- **Templates are dumb** - No complex logic, just variable substitution
- **Small-to-medium content volume** - Ideal for blogs with hundreds of posts

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    File-Based Blog System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    /content                               │   │
│  │   posts/         categories/      authors/               │   │
│  │   └── *.md       └── *.json       └── *.json             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              /lib/blog (Processing Layer)                 │   │
│  │   - Parse frontmatter (gray-matter)                       │   │
│  │   - Convert markdown to HTML (unified/remark)             │   │
│  │   - Generate slugs, reading time, TOC                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js App Router (SSG/ISR)                 │   │
│  │   /blog                  - Blog listing (static)          │   │
│  │   /blog/[slug]          - Post page (static)              │   │
│  │   /blog/category/[slug] - Category filter (static)        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Why File-Based?

| Aspect | File-Based | Database-Driven |
|--------|------------|-----------------|
| Portability | Git-versioned, works anywhere | Requires DB setup |
| Backup | Automatic with git | Separate backup needed |
| Editing | Any text editor, PR workflow | Requires admin UI |
| Deployment | Static generation | Dynamic rendering |
| Complexity | Simple | More infrastructure |
| Best For | Developer blogs, small teams | Large teams, non-technical editors |

---

## Content Structure

### Markdown File Format

Each blog post is a markdown file with YAML frontmatter:

```markdown
---
title: "How to Write an ATS-Friendly Resume in 2024"
slug: "ats-friendly-resume-guide"
date: "2024-01-15"
status: "published"
category: "resume-tips"
tags:
  - ats
  - resume-writing
  - job-search
featured_image: "/images/blog/ats-guide-cover.jpg"
excerpt: "Learn how to optimize your resume for Applicant Tracking Systems and increase your interview callback rate."
author: "resumate-team"
seo:
  title: "ATS-Friendly Resume Guide | Resumate"
  description: "Complete guide to writing resumes that pass ATS screening. Tips, examples, and best practices for 2024."
---

Your resume is often the first impression you make on a potential employer. But before a human ever sees it, your resume must pass through an Applicant Tracking System (ATS)...

## What is an ATS?

An Applicant Tracking System is software used by employers to...

## Key ATS Optimization Tips

### 1. Use Standard Section Headers

...
```

### Frontmatter Schema

```typescript
interface BlogPostFrontmatter {
  // Required fields
  title: string;
  slug: string;
  date: string;          // YYYY-MM-DD format
  status: 'draft' | 'published';

  // Optional fields
  category?: string;     // Reference to category slug
  tags?: string[];
  featured_image?: string;
  excerpt?: string;      // Auto-generated from content if not provided
  author?: string;       // Reference to author slug
  updated?: string;      // Last modified date

  // SEO overrides
  seo?: {
    title?: string;
    description?: string;
  };

  // Special flags
  featured?: boolean;    // Show in featured section
}
```

### Filename Convention

Following the guide's recommendation:

```
# Chronological content (blog posts)
content/posts/2024-01-15-ats-friendly-resume-guide.md
content/posts/2024-01-10-cover-letter-tips.md

# Non-chronological content (pages)
content/pages/about.md
content/pages/contact.md
```

---

## Directory Layout

```
/content                           # All markdown content
├── posts/                         # Blog posts
│   ├── 2024-01-15-ats-friendly-resume-guide.md
│   ├── 2024-01-10-cover-letter-tips.md
│   └── ...
├── categories/                    # Category metadata (JSON)
│   └── categories.json
└── authors/                       # Author metadata (JSON)
    └── authors.json

/public/images/blog/               # Blog images
├── ats-guide-cover.jpg
├── cover-letter-hero.jpg
└── ...

/lib/blog/                         # Blog processing utilities
├── index.ts                       # Main exports
├── posts.ts                       # Post loading & querying
├── markdown.ts                    # Markdown processing
├── types.ts                       # TypeScript interfaces
└── utils.ts                       # Helpers (slugify, readingTime)

/app/blog/                         # Blog routes
├── page.tsx                       # Blog listing
├── [slug]/page.tsx               # Individual post
├── category/[slug]/page.tsx      # Category filter
└── tag/[slug]/page.tsx           # Tag filter

/components/blog/                  # Blog UI components
├── BlogCard.tsx
├── BlogGrid.tsx
├── BlogPost.tsx
├── CategoryList.tsx
├── TagCloud.tsx
└── ...
```

### Category & Author Data Files

**content/categories/categories.json:**
```json
[
  {
    "slug": "resume-tips",
    "name": "Resume Tips",
    "description": "Expert advice on crafting effective resumes",
    "color": "#3B82F6"
  },
  {
    "slug": "job-search",
    "name": "Job Search",
    "description": "Strategies for finding and landing your dream job",
    "color": "#10B981"
  },
  {
    "slug": "career-advice",
    "name": "Career Advice",
    "description": "Professional development and career growth tips",
    "color": "#8B5CF6"
  },
  {
    "slug": "interviews",
    "name": "Interviews",
    "description": "Interview preparation and techniques",
    "color": "#F59E0B"
  }
]
```

**content/authors/authors.json:**
```json
[
  {
    "slug": "resumate-team",
    "name": "Resumate Team",
    "bio": "The team behind Resumate, helping job seekers land their dream roles.",
    "avatar": "/images/authors/resumate-team.png"
  }
]
```

---

## Markdown Processing

### Processing Pipeline

Using the **unified** ecosystem for markdown processing:

```typescript
// lib/blog/markdown.ts

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import matter from 'gray-matter';
import readingTime from 'reading-time';

export async function processMarkdown(content: string) {
  const result = await unified()
    .use(remarkParse)           // Parse markdown
    .use(remarkGfm)             // GitHub Flavored Markdown (tables, etc.)
    .use(remarkRehype)          // Convert to HTML AST
    .use(rehypeSlug)            // Add IDs to headings
    .use(rehypeAutolinkHeadings) // Add links to headings
    .use(rehypeHighlight)       // Syntax highlighting for code blocks
    .use(rehypeStringify)       // Convert to HTML string
    .process(content);

  return String(result);
}

export function parsePost(fileContent: string, filename: string) {
  const { data: frontmatter, content } = matter(fileContent);
  const stats = readingTime(content);

  return {
    frontmatter,
    content,
    readingTime: stats.text,
    wordCount: stats.words,
  };
}
```

### Table of Contents Generation

```typescript
// lib/blog/toc.ts

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function extractTableOfContents(html: string): TocItem[] {
  const headingRegex = /<h([2-4]) id="([^"]+)"[^>]*>([^<]+)<\/h\1>/g;
  const toc: TocItem[] = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    toc.push({
      level: parseInt(match[1]),
      id: match[2],
      text: match[3],
    });
  }

  return toc;
}
```

---

## Next.js Integration

### Post Loading Functions

```typescript
// lib/blog/posts.ts

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { processMarkdown, parsePost } from './markdown';
import { BlogPost, BlogPostFrontmatter } from './types';

const POSTS_DIR = path.join(process.cwd(), 'content/posts');

export async function getAllPosts(): Promise<BlogPost[]> {
  const files = fs.readdirSync(POSTS_DIR);

  const posts = await Promise.all(
    files
      .filter(file => file.endsWith('.md'))
      .map(async file => {
        const filePath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { frontmatter, content, readingTime } = parsePost(fileContent, file);

        return {
          ...frontmatter,
          content,
          readingTime,
        } as BlogPost;
      })
  );

  // Filter only published posts and sort by date (newest first)
  return posts
    .filter(post => post.status === 'published')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const files = fs.readdirSync(POSTS_DIR);
  const matchingFile = files.find(file => {
    const filePath = path.join(POSTS_DIR, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);
    return data.slug === slug;
  });

  if (!matchingFile) return null;

  const filePath = path.join(POSTS_DIR, matchingFile);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, content, readingTime } = parsePost(fileContent, matchingFile);
  const html = await processMarkdown(content);

  return {
    ...frontmatter,
    content,
    html,
    readingTime,
  } as BlogPost;
}

export async function getPostsByCategory(categorySlug: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter(post => post.category === categorySlug);
}

export async function getPostsByTag(tag: string): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter(post => post.tags?.includes(tag));
}

export function getAllTags(): string[] {
  const posts = fs.readdirSync(POSTS_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => {
      const filePath = path.join(POSTS_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(fileContent);
      return data.tags || [];
    })
    .flat();

  return [...new Set(posts)];
}
```

### Static Generation Configuration

```typescript
// app/blog/[slug]/page.tsx

import { getAllPosts, getPostBySlug } from '@/lib/blog/posts';
import { notFound } from 'next/navigation';

// Generate static pages at build time
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map(post => ({
    slug: post.slug,
  }));
}

// Metadata for SEO
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};

  return {
    title: post.seo?.title || post.title,
    description: post.seo?.description || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : [],
      type: 'article',
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <article>
      {/* Post content */}
    </article>
  );
}
```

### ISR Configuration

For posts that might need updates without full rebuilds:

```typescript
// app/blog/page.tsx

// Revalidate every hour
export const revalidate = 3600;
```

---

## API Design

Since content is file-based, we only need minimal API routes for dynamic features:

### Optional API Routes

```typescript
// app/api/blog/search/route.ts
// Full-text search across posts (optional enhancement)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return Response.json({ posts: [] });
  }

  const allPosts = await getAllPosts();
  const results = allPosts.filter(post =>
    post.title.toLowerCase().includes(query.toLowerCase()) ||
    post.content.toLowerCase().includes(query.toLowerCase())
  );

  return Response.json({ posts: results });
}
```

```typescript
// app/api/blog/feed/route.ts
// RSS feed generation

export async function GET() {
  const posts = await getAllPosts();
  const rss = generateRSSFeed(posts);

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
```

---

## Frontend Routes & Components

### Routes

```
/blog                          # Blog listing (all posts)
/blog/[slug]                   # Individual blog post
/blog/category/[slug]          # Posts filtered by category
/blog/tag/[slug]               # Posts filtered by tag
```

### Component Structure

```
/components/blog/
├── BlogCard.tsx               # Post preview card for listings
├── BlogGrid.tsx               # Grid layout for post cards
├── BlogPost.tsx               # Full post content display
├── BlogHeader.tsx             # Blog page header
├── BlogSidebar.tsx            # Categories, tags, featured
├── CategoryList.tsx           # Category navigation
├── TagCloud.tsx               # Popular tags display
├── AuthorCard.tsx             # Post author information
├── RelatedPosts.tsx           # Related post suggestions
├── TableOfContents.tsx        # In-page navigation
├── ShareButtons.tsx           # Social sharing (optional)
├── MarkdownContent.tsx        # Render processed HTML
└── SearchBar.tsx              # Blog search (optional)
```

### Key Components

**BlogCard.tsx:**
```tsx
interface BlogCardProps {
  post: BlogPost;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <article className="group">
      {post.featured_image && (
        <img src={post.featured_image} alt={post.title} />
      )}
      <div className="p-4">
        <span className="text-sm text-gray-500">{post.category}</span>
        <h2 className="text-xl font-semibold mt-2">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p className="text-gray-600 mt-2">{post.excerpt}</p>
        <div className="flex items-center mt-4 text-sm text-gray-500">
          <span>{formatDate(post.date)}</span>
          <span className="mx-2">·</span>
          <span>{post.readingTime}</span>
        </div>
      </div>
    </article>
  );
}
```

**MarkdownContent.tsx:**
```tsx
interface MarkdownContentProps {
  html: string;
}

export function MarkdownContent({ html }: MarkdownContentProps) {
  return (
    <div
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

---

## SEO Optimization

### Metadata Generation

Each page generates appropriate metadata from frontmatter:

```typescript
// lib/blog/seo.ts

export function generatePostMetadata(post: BlogPost): Metadata {
  return {
    title: post.seo?.title || `${post.title} | Resumate Blog`,
    description: post.seo?.description || post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
      images: post.featured_image ? [{
        url: post.featured_image,
        width: 1200,
        height: 630,
      }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: post.featured_image ? [post.featured_image] : [],
    },
  };
}
```

### JSON-LD Structured Data

```tsx
// components/blog/BlogPostJsonLd.tsx

export function BlogPostJsonLd({ post }: { post: BlogPost }) {
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
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Resumate',
      logo: {
        '@type': 'ImageObject',
        url: 'https://resumate.com/logo.png',
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
```

### Sitemap Generation

```typescript
// app/sitemap.ts

import { getAllPosts } from '@/lib/blog/posts';

export default async function sitemap() {
  const posts = await getAllPosts();

  const blogUrls = posts.map(post => ({
    url: `https://resumate.com/blog/${post.slug}`,
    lastModified: post.updated || post.date,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [
    {
      url: 'https://resumate.com',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: 'https://resumate.com/blog',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...blogUrls,
  ];
}
```

---

## Dependencies

### New Packages to Install

```bash
# Markdown processing
npm install unified remark-parse remark-gfm remark-rehype
npm install rehype-stringify rehype-highlight rehype-slug rehype-autolink-headings

# Frontmatter parsing
npm install gray-matter

# Utilities
npm install reading-time
```

### Package.json Additions

```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "reading-time": "^1.5.0",
    "rehype-autolink-headings": "^7.1.0",
    "rehype-highlight": "^7.0.0",
    "rehype-slug": "^6.0.0",
    "rehype-stringify": "^10.0.0",
    "remark-gfm": "^4.0.0",
    "remark-parse": "^11.0.0",
    "remark-rehype": "^11.0.0",
    "unified": "^11.0.4"
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation

**Scope:** Core infrastructure and basic blog display

**Tasks:**
1. Create directory structure (`/content/posts/`, `/lib/blog/`)
2. Install dependencies
3. Implement markdown processing pipeline (`/lib/blog/markdown.ts`)
4. Implement post loading functions (`/lib/blog/posts.ts`)
5. Create basic blog routes (`/app/blog/page.tsx`, `/app/blog/[slug]/page.tsx`)
6. Create essential components (BlogCard, BlogGrid, MarkdownContent)
7. Add 2-3 sample blog posts
8. Basic styling with Tailwind

**Deliverables:**
- Working blog listing page
- Individual post pages with markdown rendering
- Syntax highlighting for code blocks

---

### Phase 2: Categories & Navigation

**Scope:** Content organization and navigation

**Tasks:**
1. Create categories.json with initial categories
2. Implement category filter pages (`/app/blog/category/[slug]/page.tsx`)
3. Implement tag filter pages (`/app/blog/tag/[slug]/page.tsx`)
4. Add CategoryList and TagCloud components
5. Add BlogSidebar component
6. Implement related posts functionality

**Deliverables:**
- Category and tag filtering
- Blog sidebar with navigation
- Related posts suggestions

---

### Phase 3: SEO & Polish

**Scope:** SEO optimization and UX improvements

**Tasks:**
1. Implement metadata generation for all blog pages
2. Add JSON-LD structured data
3. Create dynamic sitemap
4. Add RSS feed generation
5. Implement Table of Contents component
6. Add social sharing buttons
7. Mobile responsiveness refinements
8. Add reading time display

**Deliverables:**
- SEO-optimized blog
- RSS feed
- Sitemap
- Table of contents navigation

---

### Phase 4: Enhancements (Optional)

**Scope:** Advanced features

**Tasks:**
1. Search functionality
2. Author pages
3. Featured posts section
4. Newsletter signup integration (Beehiiv)
5. Image optimization with next/image
6. Analytics integration

---

## Content Authoring Workflow

### Creating a New Post

1. Create a new markdown file in `/content/posts/`:
   ```bash
   # Filename format: YYYY-MM-DD-slug.md
   touch content/posts/2024-01-20-interview-preparation-guide.md
   ```

2. Add frontmatter and content:
   ```markdown
   ---
   title: "Complete Interview Preparation Guide"
   slug: "interview-preparation-guide"
   date: "2024-01-20"
   status: "draft"
   category: "interviews"
   tags:
     - interview-tips
     - job-search
   excerpt: "Everything you need to know to ace your next interview."
   author: "resumate-team"
   ---

   Your content here...
   ```

3. Preview locally (dev server shows drafts)

4. Change status to "published" when ready

5. Commit and push to trigger deployment

### Content Review Process

1. Create a branch for new content
2. Add/edit markdown files
3. Open PR for review
4. Merge to main to publish

### Adding Images

1. Add image to `/public/images/blog/`
2. Reference in frontmatter or content:
   ```markdown
   featured_image: "/images/blog/interview-guide-cover.jpg"

   ![Alt text](/images/blog/interview-screenshot.png)
   ```

---

## Future Enhancements

### Potential Additions

1. **Search Index** - Generate JSON search index at build time for client-side search
2. **Content Scheduling** - Implement publish date checking for scheduled posts
3. **Multiple Authors** - Expand author system with individual profile pages
4. **Content Series** - Group related posts into series/collections
5. **Beehiiv Integration** - Newsletter signup CTA within blog posts
6. **View Tracking** - Simple analytics for post popularity
7. **Comments** - Integrate with Disqus or similar (if needed)

### CLI Tooling (Optional)

Following the guide, we could add a simple CLI for content management:

```bash
# Create new post
npm run blog:new "Post Title"

# Build/validate content
npm run blog:validate

# Preview with drafts
npm run blog:preview
```

---

## File Structure Summary

```
resumate/
├── content/
│   ├── posts/
│   │   ├── 2024-01-15-ats-friendly-resume-guide.md
│   │   ├── 2024-01-10-cover-letter-tips.md
│   │   └── ...
│   ├── categories/
│   │   └── categories.json
│   └── authors/
│       └── authors.json
├── public/images/blog/
│   └── ...
├── lib/blog/
│   ├── index.ts
│   ├── posts.ts
│   ├── markdown.ts
│   ├── types.ts
│   └── utils.ts
├── app/blog/
│   ├── page.tsx
│   ├── [slug]/page.tsx
│   ├── category/[slug]/page.tsx
│   └── tag/[slug]/page.tsx
├── components/blog/
│   ├── BlogCard.tsx
│   ├── BlogGrid.tsx
│   ├── BlogPost.tsx
│   ├── MarkdownContent.tsx
│   └── ...
└── docs/
    └── markdown-cms-blog-plan.md
```

---

## Conclusion

This file-based markdown CMS approach provides a simple, maintainable, and developer-friendly blog system for Resumate. By storing content as markdown files in version control, we get:

- **Portability** - Content is not locked into any platform
- **Version Control** - Full history and review workflow via Git
- **Simplicity** - No database migrations or admin UI needed
- **Performance** - Static generation for fast page loads
- **SEO** - Full control over metadata and structured data

The phased implementation approach allows us to start with core functionality and incrementally add features based on actual needs.

---

*Document Version: 1.1*
*Created: January 2026*
*Last Updated: January 2026*
*Based on: [Markdown CMS Guide](https://github.com/bentossell/markdown-cms-guide/)*
