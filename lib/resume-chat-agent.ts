import Anthropic from "@anthropic-ai/sdk"
import { zodToJsonSchema } from "zod-to-json-schema"
import type { ParsedResume } from "@/lib/resume-parser"
import { chatEditToolSchema } from "@/lib/chat-edit-types"

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5"

const EDIT_TOOL: Anthropic.Tool = {
  name: "apply_resume_edits",
  description:
    "Apply structured edits to the resume based on the user's command. Call this tool with the specific operations to perform.",
  input_schema: zodToJsonSchema(chatEditToolSchema) as Anthropic.Tool.InputSchema,
}

/**
 * Process a natural-language edit command against a resume.
 * Returns a streaming message that emits text (explanation) and tool_use (structured edits).
 */
export function processEditCommand(
  command: string,
  resumeData: ParsedResume,
  context: { jobTitle?: string; companyName?: string }
) {
  const client = new Anthropic()
  const systemPrompt = buildSystemPrompt(resumeData, context)

  const stream = client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    tools: [EDIT_TOOL],
    tool_choice: { type: "auto" },
    messages: [{ role: "user", content: command }],
  })

  return stream
}

function buildSystemPrompt(
  resumeData: ParsedResume,
  context: { jobTitle?: string; companyName?: string }
): string {
  const resumeContext = serializeResumeForContext(resumeData)

  const jobContext = [
    context.jobTitle && `TARGET JOB: ${context.jobTitle}`,
    context.companyName && `TARGET COMPANY: ${context.companyName}`,
  ]
    .filter(Boolean)
    .join("\n")

  return `You are a professional resume editor assistant. The user will give you natural-language commands to edit their resume. You must interpret the command and call the apply_resume_edits tool with the specific operations to perform.

CURRENT RESUME:
${resumeContext}

${jobContext}

RULES:
1. Always call the apply_resume_edits tool to make changes. Never describe changes without calling the tool.
2. Each operation targets a specific part of the resume. Use the correct operation type and indices.
3. If the command is ambiguous, still call the tool with your best interpretation but set confidence to "low" and explain your assumptions in the explanation field.
4. If the command is impossible (e.g. "remove my Google experience" but there is no Google), explain why in a text response and do NOT call the tool.
5. Preserve the user's voice and facts — improve wording but never fabricate achievements or metrics.
6. For bullet improvements, use strong action verbs and quantified results where the original supports it.
7. Keep the explanation field brief (1-2 sentences).
8. When updating bullets, preserve the total count unless the user explicitly asks to add or remove bullets.
9. If the user asks a question or makes a non-edit request (e.g. "what should I change?"), respond with helpful suggestions but do NOT call the tool.
10. When the user references a company by name, match it case-insensitively against the EXPERIENCE INDEX REFERENCE to find the correct index.
11. For vague requests like "make it better" or "improve everything", focus on the professional summary and the most recent work experience. Set confidence to "medium".

EXPERIENCE INDEX REFERENCE:
${resumeData.workExperience.map((exp, i) => `  [${i}] ${exp.company} — ${exp.title} (${exp.bullets.length} bullets)`).join("\n") || "  (no work experience entries)"}

EDUCATION INDEX REFERENCE:
${resumeData.education.map((edu, i) => `  [${i}] ${edu.institution}${edu.degree ? ` — ${edu.degree}` : ""}`).join("\n") || "  (no education entries)"}

SKILLS: ${resumeData.skills.join(", ") || "(none)"}

AVAILABLE OPERATIONS:
- update_summary: Replace the professional summary
- update_target_title: Change the target job title
- update_contact: Update a contact field (name, location, phone, email, linkedin, website)
- update_experience_bullets: Replace all bullets for an experience entry
- update_experience_field: Update company, title, location, startDate, or endDate
- add_experience: Add a new work experience entry
- remove_experience: Remove an experience entry by index
- update_bullet: Update a single bullet by experienceIndex + bulletIndex
- add_bullet: Add a new bullet to an experience entry
- remove_bullet: Remove a specific bullet
- update_skills: Replace the entire skills list
- add_skills: Add new skills (deduplicates automatically)
- remove_skills: Remove specific skills
- add_education: Add a new education entry
- remove_education: Remove an education entry by index`
}

/**
 * Compact resume serialization for the LLM context.
 * Uses structured text with indices so the model can reference specific items.
 */
function serializeResumeForContext(data: ParsedResume): string {
  const parts: string[] = []

  if (data.contact.name) parts.push(`Name: ${data.contact.name}`)
  if (data.contact.email) parts.push(`Email: ${data.contact.email}`)
  if (data.contact.location) parts.push(`Location: ${data.contact.location}`)
  if (data.targetTitle) parts.push(`Target Title: ${data.targetTitle}`)

  if (data.summary) {
    parts.push(`\nSUMMARY:\n${data.summary}`)
  }

  if (data.workExperience.length > 0) {
    parts.push("\nWORK EXPERIENCE:")
    for (let i = 0; i < data.workExperience.length; i++) {
      const exp = data.workExperience[i]
      const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(" — ")
      parts.push(`  [${i}] ${exp.company} | ${exp.title}${dateRange ? ` | ${dateRange}` : ""}`)
      for (let j = 0; j < exp.bullets.length; j++) {
        parts.push(`    [${i}.${j}] ${exp.bullets[j]}`)
      }
    }
  }

  if (data.education.length > 0) {
    parts.push("\nEDUCATION:")
    for (let i = 0; i < data.education.length; i++) {
      const edu = data.education[i]
      parts.push(
        `  [${i}] ${edu.institution}${edu.degree ? ` — ${edu.degree}` : ""}${edu.field ? ` in ${edu.field}` : ""}`
      )
    }
  }

  if (data.skills.length > 0) {
    parts.push(`\nSKILLS: ${data.skills.join(", ")}`)
  }

  if (data.certifications.length > 0) {
    parts.push(
      `\nCERTIFICATIONS: ${data.certifications.map((c) => c.name).join(", ")}`
    )
  }

  if (data.projects.length > 0) {
    parts.push("\nPROJECTS:")
    for (const proj of data.projects) {
      parts.push(`  - ${proj.name}${proj.description ? `: ${proj.description}` : ""}`)
    }
  }

  return parts.join("\n")
}
