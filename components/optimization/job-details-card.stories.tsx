import type { Meta, StoryObj } from "@storybook/nextjs";
import { JobDetailsCard } from "./job-details-card";

const meta = {
  title: "Optimization/JobDetailsCard",
  component: JobDetailsCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta<typeof JobDetailsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    jobTitle: "Senior Frontend Engineer",
    companyName: "Acme Corp",
    location: "San Francisco, CA",
    seniority: "Senior",
    category: "Engineering",
    culture: [
      "Remote-first environment",
      "Strong emphasis on work-life balance",
      "Collaborative team culture",
    ],
    benefits: [
      "Health Insurance",
      "401k Match",
      "Equity",
      "Unlimited PTO",
      "Learning Budget",
    ],
  },
};

export const Minimal: Story = {
  args: {
    jobTitle: "Product Designer",
    companyName: "StartupXYZ",
    culture: [],
    benefits: [],
  },
};

export const NoCultureOrBenefits: Story = {
  args: {
    jobTitle: "Data Analyst",
    companyName: "BigData Inc",
    location: "New York, NY",
    seniority: "Mid-level",
    category: "Analytics",
    culture: [],
    benefits: [],
  },
};
