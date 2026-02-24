import type { Meta, StoryObj } from "@storybook/nextjs";
import { BlogHeader } from "./BlogHeader";

const meta = {
  title: "Blog/BlogHeader",
  component: BlogHeader,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
  },
} satisfies Meta<typeof BlogHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Custom: Story = {
  args: {
    title: "Resume Tips",
    description: "Expert advice for crafting the perfect resume.",
  },
};
