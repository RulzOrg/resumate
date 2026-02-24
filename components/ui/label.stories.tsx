import type { Meta, StoryObj } from "@storybook/nextjs";
import { Label } from "./label";
import { Input } from "./input";
const meta = {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "Email address" },
};

export const WithInput: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="you@example.com" />
    </div>
  ),
};

export const WithSwitch: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};
