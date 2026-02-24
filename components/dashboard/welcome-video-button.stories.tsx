import type { Meta, StoryObj } from "@storybook/nextjs";
import { fn } from "storybook/test";
import { WelcomeVideoButton } from "./welcome-video-button";

const meta = {
  title: "Dashboard/WelcomeVideoButton",
  component: WelcomeVideoButton,
  tags: ["autodocs"],
  args: { onClick: fn() },
} satisfies Meta<typeof WelcomeVideoButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
