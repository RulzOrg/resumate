import type { Meta, StoryObj } from "@storybook/nextjs";
import { TagCloud } from "./TagCloud";

const meta = {
  title: "Blog/TagCloud",
  component: TagCloud,
  tags: ["autodocs"],
  argTypes: {
    activeTag: { control: "text" },
    limit: { control: "number" },
  },
} satisfies Meta<typeof TagCloud>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTags = [
  "resume",
  "ATS",
  "career",
  "interview",
  "job-search",
  "cover-letter",
  "networking",
  "salary",
];

export const Default: Story = {
  args: { tags: sampleTags },
};

export const WithActiveTag: Story = {
  args: { tags: sampleTags, activeTag: "ATS" },
};

export const Limited: Story = {
  args: { tags: sampleTags, limit: 4 },
};

export const Empty: Story = {
  args: { tags: [] },
};
