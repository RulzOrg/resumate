import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";
import { AIButton } from "./ai-button";

const meta = {
  title: "UI/AIButton",
  component: AIButton,
  tags: ["autodocs"],
  args: { onClick: fn() },
  argTypes: {
    isLoading: { control: "boolean" },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    variant: {
      control: "select",
      options: ["default", "outline", "ghost"],
    },
    showIcon: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof AIButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { size: "sm", children: "AI Suggestions" },
};

export const Loading: Story = {
  args: { isLoading: true, size: "sm", children: "Generating..." },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const NoIcon: Story = {
  args: { showIcon: false, size: "sm", children: "Generate" },
};
