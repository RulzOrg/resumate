import type { Meta, StoryObj } from "@storybook/nextjs";
import { FeaturesGrid } from "./features-grid";

const meta = {
  title: "ATS Checker/FeaturesGrid",
  component: FeaturesGrid,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FeaturesGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
