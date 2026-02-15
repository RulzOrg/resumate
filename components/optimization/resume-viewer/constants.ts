import {
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  Heart,
  Award,
  FolderOpen,
  Users,
  BookOpen,
  Target,
  FileEdit,
} from "lucide-react"
import type { SectionConfig } from "./types"

export const SECTIONS: readonly SectionConfig[] = [
  { id: "contact", label: "Contact Information", icon: User, hasEdit: true },
  { id: "target", label: "Target Title", icon: Target, hasAdd: true },
  { id: "summary", label: "Professional Summary", icon: FileEdit, hasAdd: true },
  { id: "experience", label: "Work Experience", icon: Briefcase, hasAdd: true, hasMore: true },
  { id: "education", label: "Education", icon: GraduationCap, hasAdd: true, hasMore: true },
  { id: "skills", label: "Skills", icon: Wrench, hasAdd: true, hasMore: true },
  { id: "interests", label: "Interests", icon: Heart, hasAdd: true, hasMore: true },
  { id: "certifications", label: "Certifications", icon: Award, hasAdd: true, hasMore: true },
  { id: "awards", label: "Awards & Scholarships", icon: Award, hasAdd: true, hasMore: true },
  { id: "projects", label: "Projects", icon: FolderOpen, hasAdd: true, hasMore: true },
  { id: "volunteering", label: "Volunteering & Leadership", icon: Users, hasAdd: true, hasMore: true },
  { id: "publications", label: "Publications", icon: BookOpen, hasAdd: true, hasMore: true },
] as const

export const DEFAULT_EXPANDED_SECTIONS = ["contact", "experience", "education", "skills"]
