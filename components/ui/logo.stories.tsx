import type { Meta, StoryObj } from "@storybook/nextjs";
import { Logo, LogoIcon } from "./logo";

const meta = {
  title: "UI/Logo",
  component: Logo,
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { size: "md" },
};

export const Small: Story = {
  args: { size: "sm" },
};

export const Large: Story = {
  args: { size: "lg" },
};

export const IconOnly: Story = {
  render: () => <LogoIcon className="size-8" />,
};

export const AllSizes: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Logo size="sm" />
      <Logo size="md" />
      <Logo size="lg" />
    </div>
  ),
};
