import type { Meta, StoryObj } from "@storybook/nextjs";
import { AuthorCard } from "./AuthorCard";

const meta = {
  title: "Blog/AuthorCard",
  component: AuthorCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    variant: {
      control: "select",
      options: ["compact", "full"],
    },
  },
} satisfies Meta<typeof AuthorCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleAuthor = {
  slug: "jane-doe",
  name: "Jane Doe",
  bio: "Career coach and resume expert with 10+ years of experience helping professionals land their dream jobs.",
  avatar: "https://github.com/shadcn.png",
};

export const Full: Story = {
  args: {
    author: sampleAuthor,
    variant: "full",
  },
};

export const Compact: Story = {
  args: {
    author: sampleAuthor,
    variant: "compact",
  },
};

export const NoAvatar: Story = {
  args: {
    author: {
      slug: "john-smith",
      name: "John Smith",
      bio: "Technical writer and developer advocate.",
    },
    variant: "full",
  },
};
