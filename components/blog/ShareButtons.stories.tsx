import type { Meta, StoryObj } from "@storybook/nextjs";
import { ShareButtons } from "./ShareButtons";

const meta = {
  title: "Blog/ShareButtons",
  component: ShareButtons,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
} satisfies Meta<typeof ShareButtons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {
    title: "How to Optimize Your Resume for ATS",
    url: "https://useresumate.com/blog/optimize-resume",
    variant: "horizontal",
  },
};

export const Vertical: Story = {
  args: {
    title: "How to Optimize Your Resume for ATS",
    url: "https://useresumate.com/blog/optimize-resume",
    variant: "vertical",
  },
};
