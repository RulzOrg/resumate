import type { Meta, StoryObj } from "@storybook/nextjs";
import { Skeleton } from "./skeleton";

const meta = {
  title: "UI/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { className: "h-4 w-[250px]" },
};

export const Circle: Story = {
  args: { className: "size-12 rounded-full" },
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
    </div>
  ),
};

export const FormSkeleton: Story = {
  render: () => (
    <div className="w-[350px] space-y-4">
      <Skeleton className="h-4 w-[80px]" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-4 w-[60px]" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-[120px]" />
    </div>
  ),
};
