import { test } from "node:test"
import assert from "node:assert/strict"
import {
  fromStructuredDocument,
  normalizeStructuredOutput,
  toDerivedMarkdown,
  toStructuredDocument,
} from "@/lib/optimized-resume-document"
import { sanitizeRenderedHtml } from "@/lib/export/safe-html"
import { redactPII } from "@/lib/security/redaction"
import type { ParsedResume } from "@/lib/resume-parser"

const sampleParsed: ParsedResume = {
  contact: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+1 555-123-4567",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/jane",
  },
  targetTitle: "Senior Product Designer",
  summary: "Design leader focused on measurable product outcomes.",
  workExperience: [
    {
      company: "Acme",
      title: "Product Designer",
      startDate: "Jan 2021",
      endDate: "Present",
      bullets: ["Increased activation by 22%"],
    },
  ],
  education: [
    {
      institution: "UT Austin",
      degree: "BFA",
    },
  ],
  skills: ["Figma", "Design Systems"],
  interests: ["Mentoring"],
  certifications: [{ name: "NN/g UX" }],
  awards: ["Design Award"],
  projects: [{ name: "Project One", bullets: ["Shipped MVP"] }],
  volunteering: [{ organization: "Design Nonprofit" }],
  publications: [{ title: "Design at Scale" }],
}

test("structured -> markdown preserves key fields", () => {
  const structured = toStructuredDocument(sampleParsed)
  const markdown = toDerivedMarkdown(structured)

  assert.match(markdown, /Jane Doe/)
  assert.match(markdown, /Senior Product Designer/)
  assert.match(markdown, /Increased activation by 22%/)
  assert.match(markdown, /## Skills/)
})

test("legacy structured_output with resume_json normalizes into canonical document", () => {
  const legacy = {
    resume_json: {
      name: "Jane Doe",
      contact: { location: "Austin", email: "jane@example.com", phone: "123", linkedin: "ln" },
      headline: "Senior Product Designer",
      summary: "Summary",
      skills: {
        Domain: ["Product Strategy"],
        ResearchAndValidation: [],
        ProductAndSystems: [],
        Tools: ["Figma"],
      },
      experience: [
        {
          company: "Acme",
          location: "Austin",
          title: "Designer",
          start_date: "2021",
          end_date: "Present",
          bullets: ["Bullet"],
        },
      ],
      education: [{ degree: "BFA", institution: "UT", notes: "" }],
      certifications: [],
      extras: [],
    },
  }

  const normalized = normalizeStructuredOutput(legacy)
  assert.ok(normalized)

  const parsed = fromStructuredDocument(normalized)
  assert.ok(parsed)
  assert.equal(parsed?.contact.name, "Jane Doe")
  assert.equal(parsed?.workExperience.length, 1)
})

test("sanitizer strips script tags and javascript URLs", () => {
  const dirty = '<p>Hello</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>'
  const clean = sanitizeRenderedHtml(dirty)

  assert.equal(clean.includes("<script>"), false)
  assert.equal(clean.includes("javascript:"), false)
})

test("redaction masks pii", () => {
  const source = "Email jane@example.com and call +1 555-123-4567"
  const redacted = redactPII(source)

  assert.equal(redacted.includes("jane@example.com"), false)
  assert.equal(redacted.includes("555-123-4567"), false)
})
