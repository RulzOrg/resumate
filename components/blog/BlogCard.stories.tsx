import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlogCard } from "./BlogCard";

const meta = {
  title: "Blog/BlogCard",
  component: BlogCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "featured"],
    },
  },
} satisfies Meta<typeof BlogCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const samplePost = {
  title: "How to Optimize Your Resume for ATS Systems in 2026",
  slug: "optimize-resume-ats-2026",
  date: "2026-02-10",
  category: "resume-tips",
  tags: ["ATS", "resume", "job-search"],
  featured_image: "https://placehold.co/800x400/10b981/fff?text=Blog+Post",
  excerpt:
    "Learn the latest strategies to ensure your resume passes through Applicant Tracking Systems and lands in front of hiring managers.",
  readingTime: "5 min read",
};

export const Default: Story = {
  args: {
    post: samplePost,
  },
};

export const Featured: Story = {
  args: {
    post: samplePost,
    variant: "featured",
  },
};

export const NoImage: Story = {
  args: {
    post: {
      ...samplePost,
      featured_image: undefined,
    },
  },
};
