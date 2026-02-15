import type { ParsedResume } from "@/lib/resume-parser"
import type { ResumeEditOperation, DiffEntry } from "@/lib/chat-edit-types"

/**
 * Apply edit operations to a ParsedResume immutably.
 * Returns a new ParsedResume with edits applied.
 * Invalid operations (e.g. out-of-bounds indices) are skipped.
 */
export function applyEdits(
  resume: ParsedResume,
  operations: ResumeEditOperation[]
): ParsedResume {
  let result = structuredClone(resume)

  for (const op of operations) {
    switch (op.type) {
      case "update_summary":
        result.summary = op.value
        break

      case "update_target_title":
        result.targetTitle = op.value
        break

      case "update_contact":
        result.contact = { ...result.contact, [op.field]: op.value }
        break

      case "update_experience_bullets": {
        if (op.experienceIndex >= result.workExperience.length) break
        result.workExperience = result.workExperience.map((exp, i) =>
          i === op.experienceIndex ? { ...exp, bullets: op.bullets } : exp
        )
        break
      }

      case "update_experience_field": {
        if (op.experienceIndex >= result.workExperience.length) break
        result.workExperience = result.workExperience.map((exp, i) =>
          i === op.experienceIndex
            ? { ...exp, [op.field]: op.value }
            : exp
        )
        break
      }

      case "add_experience":
        result.workExperience = [...result.workExperience, op.experience]
        break

      case "remove_experience": {
        if (op.experienceIndex >= result.workExperience.length) break
        result.workExperience = result.workExperience.filter(
          (_, i) => i !== op.experienceIndex
        )
        break
      }

      case "update_bullet": {
        const exp = result.workExperience[op.experienceIndex]
        if (!exp || op.bulletIndex >= exp.bullets.length) break
        result.workExperience = result.workExperience.map((e, i) =>
          i === op.experienceIndex
            ? {
                ...e,
                bullets: e.bullets.map((b, j) =>
                  j === op.bulletIndex ? op.value : b
                ),
              }
            : e
        )
        break
      }

      case "add_bullet": {
        if (op.experienceIndex >= result.workExperience.length) break
        result.workExperience = result.workExperience.map((e, i) =>
          i === op.experienceIndex
            ? { ...e, bullets: [...e.bullets, op.bullet] }
            : e
        )
        break
      }

      case "remove_bullet": {
        const exp2 = result.workExperience[op.experienceIndex]
        if (!exp2 || op.bulletIndex >= exp2.bullets.length) break
        result.workExperience = result.workExperience.map((e, i) =>
          i === op.experienceIndex
            ? {
                ...e,
                bullets: e.bullets.filter((_, j) => j !== op.bulletIndex),
              }
            : e
        )
        break
      }

      case "update_skills":
        result.skills = op.skills
        break

      case "add_skills":
        result.skills = [
          ...result.skills,
          ...op.skills.filter((s) => !result.skills.includes(s)),
        ]
        break

      case "remove_skills":
        result.skills = result.skills.filter((s) => !op.skills.includes(s))
        break

      case "add_education":
        result.education = [...result.education, op.education]
        break

      case "remove_education": {
        if (op.educationIndex >= result.education.length) break
        result.education = result.education.filter(
          (_, i) => i !== op.educationIndex
        )
        break
      }
    }
  }

  return result
}

/**
 * Compute human-readable diff entries from edit operations.
 * Each entry describes what changed for the UI diff preview.
 */
export function computeDiffs(
  resume: ParsedResume,
  operations: ResumeEditOperation[]
): DiffEntry[] {
  const diffs: DiffEntry[] = []

  for (const op of operations) {
    switch (op.type) {
      case "update_summary":
        diffs.push({
          section: "Professional Summary",
          type: "modified",
          before: resume.summary || "(empty)",
          after: op.value,
        })
        break

      case "update_target_title":
        diffs.push({
          section: "Target Title",
          type: "modified",
          before: resume.targetTitle || "(empty)",
          after: op.value,
        })
        break

      case "update_contact":
        diffs.push({
          section: `Contact > ${op.field}`,
          type: "modified",
          before: resume.contact[op.field] || "(empty)",
          after: op.value,
        })
        break

      case "update_experience_bullets": {
        const exp = resume.workExperience[op.experienceIndex]
        if (!exp) break
        diffs.push({
          section: `${exp.company} > All Bullets`,
          type: "modified",
          before: exp.bullets.join("\n"),
          after: op.bullets.join("\n"),
        })
        break
      }

      case "update_experience_field": {
        const exp = resume.workExperience[op.experienceIndex]
        if (!exp) break
        diffs.push({
          section: `${exp.company} > ${op.field}`,
          type: "modified",
          before: exp[op.field] || "(empty)",
          after: op.value,
        })
        break
      }

      case "add_experience":
        diffs.push({
          section: `Work Experience > ${op.experience.company}`,
          type: "added",
          after: `${op.experience.title} at ${op.experience.company}`,
        })
        break

      case "remove_experience": {
        const exp = resume.workExperience[op.experienceIndex]
        if (!exp) break
        diffs.push({
          section: `Work Experience > ${exp.company}`,
          type: "removed",
          before: `${exp.title} at ${exp.company}`,
        })
        break
      }

      case "update_bullet": {
        const exp = resume.workExperience[op.experienceIndex]
        if (!exp || op.bulletIndex >= exp.bullets.length) break
        diffs.push({
          section: `${exp.company} > Bullet ${op.bulletIndex + 1}`,
          type: "modified",
          before: exp.bullets[op.bulletIndex],
          after: op.value,
        })
        break
      }

      case "add_bullet": {
        const exp = resume.workExperience[op.experienceIndex]
        if (!exp) break
        diffs.push({
          section: `${exp.company} > New Bullet`,
          type: "added",
          after: op.bullet,
        })
        break
      }

      case "remove_bullet": {
        const exp = resume.workExperience[op.experienceIndex]
        if (!exp || op.bulletIndex >= exp.bullets.length) break
        diffs.push({
          section: `${exp.company} > Bullet ${op.bulletIndex + 1}`,
          type: "removed",
          before: exp.bullets[op.bulletIndex],
        })
        break
      }

      case "update_skills":
        diffs.push({
          section: "Skills",
          type: "modified",
          before: resume.skills.join(", "),
          after: op.skills.join(", "),
        })
        break

      case "add_skills":
        diffs.push({
          section: "Skills",
          type: "added",
          after: op.skills.join(", "),
        })
        break

      case "remove_skills":
        diffs.push({
          section: "Skills",
          type: "removed",
          before: op.skills.join(", "),
        })
        break

      case "add_education":
        diffs.push({
          section: `Education > ${op.education.institution}`,
          type: "added",
          after: [op.education.degree, op.education.field, op.education.institution]
            .filter(Boolean)
            .join(", "),
        })
        break

      case "remove_education": {
        const edu = resume.education[op.educationIndex]
        if (!edu) break
        diffs.push({
          section: `Education > ${edu.institution}`,
          type: "removed",
          before: [edu.degree, edu.field, edu.institution]
            .filter(Boolean)
            .join(", "),
        })
        break
      }
    }
  }

  return diffs
}

/**
 * Validate that all operations reference valid indices in the resume.
 * Returns errors for any invalid operations.
 */
export function validateOperations(
  resume: ParsedResume,
  operations: ResumeEditOperation[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]
    const prefix = `Operation ${i + 1} (${op.type})`

    switch (op.type) {
      case "update_experience_bullets":
      case "update_experience_field":
      case "add_bullet":
        if (op.experienceIndex >= resume.workExperience.length) {
          errors.push(
            `${prefix}: experienceIndex ${op.experienceIndex} out of bounds (max ${resume.workExperience.length - 1})`
          )
        }
        break

      case "remove_experience":
        if (op.experienceIndex >= resume.workExperience.length) {
          errors.push(
            `${prefix}: experienceIndex ${op.experienceIndex} out of bounds (max ${resume.workExperience.length - 1})`
          )
        }
        break

      case "update_bullet":
      case "remove_bullet": {
        if (op.experienceIndex >= resume.workExperience.length) {
          errors.push(
            `${prefix}: experienceIndex ${op.experienceIndex} out of bounds (max ${resume.workExperience.length - 1})`
          )
        } else {
          const exp = resume.workExperience[op.experienceIndex]
          if (op.bulletIndex >= exp.bullets.length) {
            errors.push(
              `${prefix}: bulletIndex ${op.bulletIndex} out of bounds (max ${exp.bullets.length - 1})`
            )
          }
        }
        break
      }

      case "remove_education":
        if (op.educationIndex >= resume.education.length) {
          errors.push(
            `${prefix}: educationIndex ${op.educationIndex} out of bounds (max ${resume.education.length - 1})`
          )
        }
        break
    }
  }

  return { valid: errors.length === 0, errors }
}
