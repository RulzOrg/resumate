import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Free ATS Resume Checker | Check Your Resume Score",
  description:
    "Check if your resume is ATS-compatible with our free resume scanner. Get an instant ATS score and personalized recommendations to improve your chances of landing interviews.",
  keywords: [
    "ATS resume checker",
    "resume scanner",
    "ATS compatibility",
    "resume score",
    "applicant tracking system",
    "resume optimization",
    "free resume checker",
  ],
  openGraph: {
    title: "Free ATS Resume Checker | Check Your Resume Score",
    description:
      "Check if your resume is ATS-compatible. Get an instant score and personalized recommendations.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free ATS Resume Checker",
    description:
      "Check if your resume is ATS-compatible. Get an instant score and personalized recommendations.",
  },
}

export default function ResumeCheckerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
