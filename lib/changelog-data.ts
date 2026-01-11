export interface ChangelogFeature {
  title: string
  description: string
}

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  description: string
  features: ChangelogFeature[]
  screenshot?: string
  type: "major" | "minor" | "patch"
}

/**
 * Changelog entries for ResuMate AI
 *
 * To add a new entry:
 * 1. Add a new object at the TOP of the array (newest first)
 * 2. Include version (semver), date, title, description, and features
 * 3. Optionally add a screenshot path (place image in /public/images/changelog/)
 *
 * Version types:
 * - major: Breaking changes or major new features
 * - minor: New features, improvements
 * - patch: Bug fixes, small improvements
 */
export const changelogEntries: ChangelogEntry[] = [
  {
    version: "1.2.0",
    date: "2026-01-11",
    title: "Enhanced Resume Parsing & Dashboard Improvements",
    description: "Major improvements to our resume parsing engine and a cleaner, more intuitive dashboard experience.",
    features: [
      {
        title: "Improved Resume Parser",
        description: "Our AI now extracts skills, experience, and education with 40% better accuracy, supporting more resume formats."
      },
      {
        title: "Streamlined Dashboard",
        description: "Cleaner header design and improved resume viewer for faster navigation and better organization."
      },
      {
        title: "Better Error Tracking",
        description: "Enhanced monitoring to catch and fix issues faster, ensuring a smoother experience."
      }
    ],
    screenshot: "/images/changelog/v1-2-0-dashboard.png",
    type: "minor"
  },
  {
    version: "1.1.0",
    date: "2026-01-08",
    title: "Sentry Integration & Performance Monitoring",
    description: "Added comprehensive error tracking and performance monitoring to ensure reliability.",
    features: [
      {
        title: "Error Tracking",
        description: "Integrated Sentry for real-time error monitoring and faster bug resolution."
      },
      {
        title: "Performance Insights",
        description: "Track application performance to identify and fix bottlenecks proactively."
      },
      {
        title: "Middleware Optimization",
        description: "Updated middleware configuration for better routing and authentication handling."
      }
    ],
    type: "minor"
  },
  {
    version: "1.0.2",
    date: "2026-01-05",
    title: "Beta Launch Refinements",
    description: "Final polish and codebase cleanup for our beta launch.",
    features: [
      {
        title: "Codebase Cleanup",
        description: "Removed unused code and optimized bundle size for faster loading times."
      },
      {
        title: "Webhook Fixes",
        description: "Fixed 307 redirect issues with webhooks for more reliable third-party integrations."
      },
      {
        title: "Authentication Improvements",
        description: "Resolved Clerk login issues for smoother user authentication."
      }
    ],
    type: "patch"
  },
  {
    version: "1.0.1",
    date: "2026-01-02",
    title: "Authentication & Onboarding Fixes",
    description: "Critical fixes for user authentication and improved onboarding experience.",
    features: [
      {
        title: "Clerk Login Fix",
        description: "Resolved authentication issues that prevented some users from signing in."
      },
      {
        title: "Smoother Onboarding",
        description: "Improved the new user experience with clearer steps and better guidance."
      }
    ],
    type: "patch"
  },
  {
    version: "1.0.0",
    date: "2025-12-20",
    title: "Official Launch",
    description: "ResuMate AI is officially live! Create ATS-friendly resume versions tailored to every job application.",
    features: [
      {
        title: "AI Resume Optimization",
        description: "Upload your resume and get AI-powered suggestions tailored to specific job descriptions."
      },
      {
        title: "ATS Compatibility Scoring",
        description: "See how well your resume matches job requirements with our intelligent scoring system."
      },
      {
        title: "Multiple Resume Versions",
        description: "Create and manage different versions of your resume for various job applications."
      },
      {
        title: "Job Description Analysis",
        description: "Paste any job URL and our AI extracts key requirements and keywords automatically."
      },
      {
        title: "Export Options",
        description: "Download optimized resumes in PDF, DOCX, or TXT formats."
      },
      {
        title: "Dashboard Management",
        description: "Organize all your resumes and job applications in one intuitive dashboard."
      }
    ],
    screenshot: "/images/changelog/v1-0-0-launch.png",
    type: "major"
  }
]

/**
 * Get the latest version number
 */
export function getLatestVersion(): string {
  return changelogEntries[0]?.version ?? "1.0.0"
}

/**
 * Get a specific changelog entry by version
 */
export function getChangelogEntry(version: string): ChangelogEntry | undefined {
  return changelogEntries.find(entry => entry.version === version)
}

/**
 * Get all changelog entries for a specific type
 */
export function getChangelogByType(type: "major" | "minor" | "patch"): ChangelogEntry[] {
  return changelogEntries.filter(entry => entry.type === type)
}
