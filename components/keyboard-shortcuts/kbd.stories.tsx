import type { Meta, StoryObj } from "@storybook/nextjs";
import { Kbd } from "./kbd";

const meta = {
  title: "Components/Kbd",
  component: Kbd,
  tags: ["autodocs"],
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: "K" },
};

export const Modifier: Story = {
  render: () => (
    <div className="flex items-center gap-1">
      <Kbd>⌘</Kbd>
      <Kbd>K</Kbd>
    </div>
  ),
};

export const ShortcutExample: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span className="flex items-center gap-1">
        Search <Kbd>⌘</Kbd><Kbd>K</Kbd>
      </span>
      <span className="flex items-center gap-1">
        Save <Kbd>⌘</Kbd><Kbd>S</Kbd>
      </span>
      <span className="flex items-center gap-1">
        Undo <Kbd>⌘</Kbd><Kbd>Z</Kbd>
      </span>
    </div>
  ),
};
