export type TooltipPosition = "top" | "bottom" | "left" | "right"

export interface TourStep {
  target: string
  title: string
  content: string
  position: TooltipPosition
  spotlightPadding?: number
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour-target="resume-select"]',
    title: "Start with Your Resume",
    content:
      "Upload your master resume or select an existing one. This is the foundation we'll optimize for each job.",
    position: "bottom",
    spotlightPadding: 8,
  },
  {
    target: '[data-tour-target="job-details"]',
    title: "Add Job Details",
    content:
      "Enter the job title and paste the full job description. The more detail you provide, the better we can tailor your resume.",
    position: "bottom",
    spotlightPadding: 12,
  },
  {
    target: '[data-tour-target="optimize-button"]',
    title: "Generate Your Tailored Resume",
    content:
      "Click 'Optimize Resume' to generate a version tailored to this specific job. Our AI will highlight relevant skills and experiences.",
    position: "top",
    spotlightPadding: 8,
  },
]
