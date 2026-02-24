import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlogGrid } from "./BlogGrid";

const meta = {
  title: "Blog/BlogGrid",
  component: BlogGrid,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof BlogGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const makePosts = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    title: `Blog Post Title ${i + 1}`,
    slug: `post-${i + 1}`,
    date: `2026-02-${String(15 - i).padStart(2, "0")}`,
    category: i % 2 === 0 ? "resume-tips" : "career-advice",
    readingTime: `${3 + i} min read`,
    excerpt:
      "This is a short excerpt describing the blog post content and what readers will learn.",
    featured_image: `https://placehold.co/800x400/10b981/fff?text=Post+${i + 1}`,
  }));

export const Default: Story = {
  args: {
    posts: makePosts(4),
  },
  decorators: [
    (Story) => (
      <div className="max-w-5xl mx-auto p-8">
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = {
  args: { posts: [] },
};
