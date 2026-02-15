import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { computeMatchScore } from "@/lib/match-score"
import {
  extractJobKeywords,
  fuzzyMatch,
  normalizeText,
} from "@/lib/match-score-keywords"
import type { ParsedResume } from "@/lib/resume-parser"

// ─── Test fixtures ───────────────────────────────────────────────

const sampleResume: ParsedResume = {
  contact: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+1 555-123-4567",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/jane",
  },
  targetTitle: "Senior Frontend Engineer",
  summary:
    "Experienced frontend engineer with 6 years building scalable React applications. Expert in TypeScript, Next.js, and design systems. Led cross-functional teams to deliver high-impact features.",
  workExperience: [
    {
      company: "TechCorp",
      title: "Senior Frontend Engineer",
      startDate: "Jan 2021",
      endDate: "Present",
      bullets: [
        "Built a component library using React and TypeScript serving 12 product teams",
        "Improved page load performance by 40% through code splitting and lazy loading",
        "Mentored 5 junior developers on modern frontend practices and code review",
        "Implemented CI/CD pipeline using GitHub Actions reducing deploy time by 60%",
      ],
    },
    {
      company: "StartupInc",
      title: "Frontend Developer",
      startDate: "Jun 2018",
      endDate: "Dec 2020",
      bullets: [
        "Developed customer-facing dashboard using React, Redux, and Tailwind CSS",
        "Integrated REST APIs and GraphQL endpoints for real-time data",
        "Achieved 95% test coverage with Jest and React Testing Library",
      ],
    },
  ],
  education: [
    {
      institution: "UT Austin",
      degree: "BS Computer Science",
      graduationDate: "2018",
    },
  ],
  skills: [
    "React",
    "TypeScript",
    "Next.js",
    "JavaScript",
    "Node.js",
    "GraphQL",
    "Tailwind CSS",
    "Jest",
    "Git",
    "CI/CD",
  ],
  interests: ["Open Source", "Mentoring"],
  certifications: [{ name: "AWS Cloud Practitioner" }],
  awards: [],
  projects: [
    {
      name: "Design System Library",
      description: "Open source React component library",
      bullets: ["200+ stars on GitHub", "Used by 5 companies"],
    },
  ],
  volunteering: [],
  publications: [],
}

const matchingJobDescription = `
Senior Frontend Engineer

We are looking for a Senior Frontend Engineer to join our team.

Requirements:
- 5+ years experience with React and TypeScript
- Experience with Next.js and server-side rendering
- Strong understanding of component architecture and design systems
- Experience with CI/CD pipelines (GitHub Actions preferred)
- Proficiency in modern CSS (Tailwind CSS or similar)
- Experience with testing frameworks (Jest, React Testing Library)
- GraphQL experience is a plus

Nice to have:
- Experience with Node.js backend development
- Familiarity with cloud services (AWS, GCP)
- Open source contributions
- Mentoring experience
`

const unmatchingJobDescription = `
Senior Data Scientist

We are seeking a Senior Data Scientist for our ML team.

Requirements:
- PhD or MS in Statistics, Mathematics, or Computer Science
- 5+ years experience with Python, R, and machine learning frameworks
- Deep expertise in TensorFlow, PyTorch, and scikit-learn
- Experience with NLP and natural language processing
- Strong foundation in statistical modeling and hypothesis testing
- Experience with Spark, Hadoop, and big data technologies
- Knowledge of deep learning architectures (CNN, RNN, Transformers)

Nice to have:
- Experience with computer vision
- Published research papers
- Experience with cloud ML services (SageMaker, Vertex AI)
`

// ─── Tests ───────────────────────────────────────────────────────

describe("normalizeText", () => {
  test("lowercases and strips punctuation", () => {
    assert.equal(normalizeText("Hello, World!"), "hello world")
  })

  test("collapses whitespace", () => {
    assert.equal(normalizeText("  too   many    spaces  "), "too many spaces")
  })
})

describe("fuzzyMatch", () => {
  test("exact match", () => {
    assert.equal(fuzzyMatch("react", "I use React for my projects"), true)
  })

  test("substring match", () => {
    assert.equal(fuzzyMatch("typescript", "Strong TypeScript skills"), true)
  })

  test("multi-word match", () => {
    assert.equal(
      fuzzyMatch("design systems", "Built a design system for the company"),
      true
    )
  })

  test("stem-like match", () => {
    assert.equal(
      fuzzyMatch("testing", "We test our applications thoroughly"),
      true
    )
  })

  test("no match for unrelated terms", () => {
    assert.equal(fuzzyMatch("kubernetes", "I built React components"), false)
  })
})

describe("extractJobKeywords", () => {
  test("extracts keywords from requirements section", () => {
    const result = extractJobKeywords(matchingJobDescription)

    assert.ok(result.required.length > 0, "Should have required keywords")
    assert.ok(result.all.length > 0, "Should have all keywords")
    assert.ok(result.skills.length > 0, "Should have skill terms")
  })

  test("detects skill terms", () => {
    const result = extractJobKeywords(matchingJobDescription)
    const skillNames = result.skills.map((s) => s.toLowerCase())

    assert.ok(skillNames.includes("react"), "Should detect React")
    assert.ok(skillNames.includes("typescript"), "Should detect TypeScript")
    assert.ok(skillNames.includes("next.js") || skillNames.includes("nextjs"), "Should detect Next.js")
  })

  test("extracts phrases", () => {
    const result = extractJobKeywords(matchingJobDescription)
    assert.ok(result.phrases.length > 0, "Should extract multi-word phrases")
  })
})

describe("computeMatchScore", () => {
  test("high score for matching resume and job", () => {
    const result = computeMatchScore(
      sampleResume,
      matchingJobDescription,
      "Senior Frontend Engineer"
    )

    assert.ok(result.score >= 60, `Score ${result.score} should be >= 60 for matching resume`)
    assert.ok(result.score <= 100, `Score ${result.score} should be <= 100`)
    assert.ok(result.matchedKeywords.length > 0, "Should have matched keywords")
    assert.ok(result.matchedSkills.length > 0, "Should have matched skills")
  })

  test("low score for non-matching resume and job", () => {
    const result = computeMatchScore(
      sampleResume,
      unmatchingJobDescription,
      "Senior Data Scientist"
    )

    assert.ok(result.score < 65, `Score ${result.score} should be < 65 for non-matching resume`)
    assert.ok(result.missingSkills.length > 0, "Should have missing skills")

    // Compare: non-matching score should be meaningfully lower than matching
    const matchingResult = computeMatchScore(
      sampleResume,
      matchingJobDescription,
      "Senior Frontend Engineer"
    )
    assert.ok(
      matchingResult.score > result.score + 10,
      `Matching score ${matchingResult.score} should be > non-matching ${result.score} + 10`
    )
  })

  test("score improves when keywords are added", () => {
    const before = computeMatchScore(
      sampleResume,
      matchingJobDescription,
      "Senior Frontend Engineer"
    )

    // Add missing keywords to the resume
    const enhancedResume: ParsedResume = {
      ...sampleResume,
      summary:
        sampleResume.summary +
        " Extensive experience with server-side rendering, component architecture, and design systems.",
      skills: [
        ...sampleResume.skills,
        "Server-side Rendering",
        "Component Architecture",
      ],
    }

    const after = computeMatchScore(
      enhancedResume,
      matchingJobDescription,
      "Senior Frontend Engineer"
    )

    assert.ok(
      after.score >= before.score,
      `Enhanced score ${after.score} should be >= original ${before.score}`
    )
  })

  test("returns valid breakdown", () => {
    const result = computeMatchScore(
      sampleResume,
      matchingJobDescription,
      "Senior Frontend Engineer"
    )

    assert.ok(result.breakdown.keywordCoverage >= 0 && result.breakdown.keywordCoverage <= 100)
    assert.ok(result.breakdown.skillsAlignment >= 0 && result.breakdown.skillsAlignment <= 100)
    assert.ok(result.breakdown.experienceRelevance >= 0 && result.breakdown.experienceRelevance <= 100)
    assert.ok(result.breakdown.sectionCompleteness >= 0 && result.breakdown.sectionCompleteness <= 100)
  })

  test("section completeness is 100% for complete resume", () => {
    const result = computeMatchScore(
      sampleResume,
      matchingJobDescription,
      "Senior Frontend Engineer"
    )

    assert.equal(
      result.breakdown.sectionCompleteness,
      100,
      "Complete resume should have 100% section completeness"
    )
  })

  test("section completeness is lower for incomplete resume", () => {
    const incompleteResume: ParsedResume = {
      ...sampleResume,
      contact: { name: "" },
      summary: undefined,
      education: [],
    }

    const result = computeMatchScore(
      incompleteResume,
      matchingJobDescription,
      "Senior Frontend Engineer"
    )

    assert.ok(
      result.breakdown.sectionCompleteness < 100,
      `Incomplete resume should have < 100% section completeness, got ${result.breakdown.sectionCompleteness}`
    )
  })

  test("handles empty job description gracefully", () => {
    const result = computeMatchScore(sampleResume, "", "Engineer")

    assert.ok(result.score >= 0 && result.score <= 100, "Score should be in valid range")
  })

  test("handles empty resume gracefully", () => {
    const emptyResume: ParsedResume = {
      contact: { name: "" },
      workExperience: [],
      education: [],
      skills: [],
      interests: [],
      certifications: [],
      awards: [],
      projects: [],
      volunteering: [],
      publications: [],
    }

    const result = computeMatchScore(emptyResume, matchingJobDescription, "Engineer")
    assert.ok(result.score >= 0 && result.score <= 100, "Score should be in valid range")
    assert.ok(result.score < 40, `Empty resume score ${result.score} should be low`)
  })
})
