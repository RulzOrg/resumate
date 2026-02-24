import type { Meta, StoryObj } from "@storybook/nextjs";
import { HowItWorks } from "./how-it-works";

const meta = {
  title: "ATS Checker/HowItWorks",
  component: HowItWorks,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HowItWorks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
