import type { Meta, StoryObj } from "@storybook/nextjs";
import { ResumeStatusBadge } from "./resume-status-badge";

const meta = {
  title: "Dashboard/ResumeStatusBadge",
  component: ResumeStatusBadge,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["pending", "processing", "completed", "failed"],
    },
    message: { control: "text" },
  },
} satisfies Meta<typeof ResumeStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  args: { status: "pending" },
};

export const Processing: Story = {
  args: { status: "processing" },
};

export const Completed: Story = {
  args: { status: "completed" },
};

export const Failed: Story = {
  args: { status: "failed" },
};

export const CustomMessage: Story = {
  args: { status: "processing", message: "Optimizing resume..." },
};

export const AllStatuses: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <ResumeStatusBadge status="pending" />
      <ResumeStatusBadge status="processing" />
      <ResumeStatusBadge status="completed" />
      <ResumeStatusBadge status="failed" />
    </div>
  ),
};
