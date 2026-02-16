import { z } from "zod"
import type {
  ParsedResume,
  ContactInfo,
  WorkExperienceItem,
  EducationItem,
} from "@/lib/resume-parser"

// ─── Edit Operation Types ───────────────────────────────────────

export type ResumeEditOperation =
  | { type: "update_summary"; value: string }
  | { type: "update_target_title"; value: string }
  | {
      type: "update_contact"
      field: keyof ContactInfo
      value: string
    }
  | {
      type: "update_experience_bullets"
      experienceIndex: number
      bullets: string[]
    }
  | {
      type: "update_experience_field"
      experienceIndex: number
      field: "company" | "title" | "location" | "startDate" | "endDate"
      value: string
    }
  | { type: "add_experience"; experience: WorkExperienceItem }
  | { type: "remove_experience"; experienceIndex: number }
  | {
      type: "update_bullet"
      experienceIndex: number
      bulletIndex: number
      value: string
    }
  | {
      type: "add_bullet"
      experienceIndex: number
      bullet: string
    }
  | {
      type: "remove_bullet"
      experienceIndex: number
      bulletIndex: number
    }
  | { type: "update_skills"; skills: string[] }
  | { type: "add_skills"; skills: string[] }
  | { type: "remove_skills"; skills: string[] }
  | { type: "add_education"; education: EducationItem }
  | { type: "remove_education"; educationIndex: number }

// ─── Diff Representation (for UI) ──────────────────────────────

export interface DiffEntry {
  section: string
  type: "added" | "modified" | "removed"
  before?: string
  after?: string
}

// ─── Chat Edit Result ───────────────────────────────────────────

export interface ChatEditResult {
  operations: ResumeEditOperation[]
  diffs: DiffEntry[]
  explanation: string
  confidence: "high" | "medium" | "low"
}

// ─── Chat Message Types ─────────────────────────────────────────

export type ChatMessageStatus =
  | "pending"
  | "streaming"
  | "complete"
  | "error"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  status: ChatMessageStatus
  editResult?: ChatEditResult
  editStatus?: "pending" | "applied" | "dismissed"
  error?: string
}

// ─── API Contract ───────────────────────────────────────────────

export interface ChatEditRequest {
  resumeId: string
  command: string
  context: {
    resumeData: ParsedResume
    jobTitle?: string
    companyName?: string
  }
}

// ─── Zod Schemas for Anthropic tool_use ─────────────────────────

const workExperienceItemSchema = z.object({
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  employmentType: z.string().optional(),
  bullets: z.array(z.string()),
})

const educationItemSchema = z.object({
  institution: z.string(),
  degree: z.string().optional(),
  field: z.string().optional(),
  graduationDate: z.string().optional(),
  notes: z.string().optional(),
})

export const resumeEditOperationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("update_summary"), value: z.string() }),
  z.object({ type: z.literal("update_target_title"), value: z.string() }),
  z.object({
    type: z.literal("update_contact"),
    field: z.enum(["name", "location", "phone", "email", "linkedin", "website"]),
    value: z.string(),
  }),
  z.object({
    type: z.literal("update_experience_bullets"),
    experienceIndex: z.number().int().min(0),
    bullets: z.array(z.string()),
  }),
  z.object({
    type: z.literal("update_experience_field"),
    experienceIndex: z.number().int().min(0),
    field: z.enum(["company", "title", "location", "startDate", "endDate"]),
    value: z.string(),
  }),
  z.object({
    type: z.literal("add_experience"),
    experience: workExperienceItemSchema,
  }),
  z.object({
    type: z.literal("remove_experience"),
    experienceIndex: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("update_bullet"),
    experienceIndex: z.number().int().min(0),
    bulletIndex: z.number().int().min(0),
    value: z.string(),
  }),
  z.object({
    type: z.literal("add_bullet"),
    experienceIndex: z.number().int().min(0),
    bullet: z.string(),
  }),
  z.object({
    type: z.literal("remove_bullet"),
    experienceIndex: z.number().int().min(0),
    bulletIndex: z.number().int().min(0),
  }),
  z.object({
    type: z.literal("update_skills"),
    skills: z.array(z.string()),
  }),
  z.object({
    type: z.literal("add_skills"),
    skills: z.array(z.string()),
  }),
  z.object({
    type: z.literal("remove_skills"),
    skills: z.array(z.string()),
  }),
  z.object({
    type: z.literal("add_education"),
    education: educationItemSchema,
  }),
  z.object({
    type: z.literal("remove_education"),
    educationIndex: z.number().int().min(0),
  }),
])

export const chatEditToolSchema = z.object({
  operations: z.array(resumeEditOperationSchema),
  explanation: z
    .string()
    .describe("Brief explanation of what changes were made and why"),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("How confident the agent is in interpreting the command"),
})

export type ChatEditToolInput = z.infer<typeof chatEditToolSchema>
