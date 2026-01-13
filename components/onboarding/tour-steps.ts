export type TooltipPosition = "top" | "bottom" | "left" | "right"

export interface TourStep {
  target: string
  title: string
  content: string
  position: TooltipPosition
  spotlightPadding?: number
}

// Tour steps for users WITHOUT resumes (single step)
export const TOUR_STEPS_NO_RESUMES: TourStep[] = [
  {
    target: '[data-tour-target="resume-select"]',
    title: "Start with Your Resume",
    content:
      "Upload your resume to get started. This is the foundation we'll optimize for each job.",
    position: "bottom",
    spotlightPadding: 8,
  },
]

// Tour steps for users WITH resumes (full tour)
export const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour-target="resume-select"]',
    title: "Select Your Resume",
    content:
      "Choose which resume to optimize. You can upload up to 3 master resumes for different roles.",
    position: "bottom",
    spotlightPadding: 8,
  },
  {
    target: '[data-tour-target="job-details"]',
    title: "Enter Job Title",
    content:
      "Enter the job title you're applying for. Adding the company name helps personalize your resume.",
    position: "bottom",
    spotlightPadding: 12,
  },
  {
    target: '[data-tour-target="job-description"]',
    title: "Paste the Job Description",
    content:
      "Copy and paste the full job description here. The more detail you provide, the better we can tailor your resume.",
    position: "top",
    spotlightPadding: 8,
  },
  {
    target: '[data-tour-target="optimize-button"]',
    title: "Generate Your Tailored Resume",
    content:
      "Click here to generate a resume tailored to this specific job. Our AI will highlight your most relevant skills and experiences.",
    position: "top",
    spotlightPadding: 8,
  },
]
