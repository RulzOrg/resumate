import type { Meta, StoryObj } from "@storybook/nextjs";
import { SocialProof } from "./social-proof";

const meta = {
  title: "ATS Checker/SocialProof",
  component: SocialProof,
  tags: ["autodocs"],
} satisfies Meta<typeof SocialProof>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
