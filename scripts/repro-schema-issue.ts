
import { z } from "zod";

// Copying the relevant parts of the schema from lib/llm-resume-extractor.ts for testing
// I will need to keep this in sync manually for this test, or ideally import it if possible.
// But importing might be tricky if the file has side effects or environment dependencies.
// Let's try to just define the schema here exactly as it is in the file to reproduce the error first.

const ContactInfoSchema = z.object({
    name: z.string().describe("Full name of the candidate"),
    location: z.string().optional().describe("City, State/Country"),
    phone: z.string().optional().describe("Phone number"),
    email: z.string().optional().describe("Email address"),
    linkedin: z.string().optional().describe("LinkedIn profile URL"),
    website: z.string().optional().describe("Personal website or portfolio URL"),
})

const WorkExperienceItemSchema = z.object({
    company: z.string().describe("Company name"),
    title: z.string().describe("Job title"),
    location: z.string().optional().describe("Job location"),
    startDate: z.string().optional().describe("Start date (e.g., 'Jan 2020')"),
    endDate: z.string().optional().describe("End date (e.g., 'Present', 'Dec 2022')"),
    employmentType: z.string().optional().describe("Full-time, Contract, etc."),
    bullets: z.array(z.string()).describe("List of work responsibilities and achievements"),
})

const EducationItemSchema = z.object({
    institution: z.string().describe("University or School name"),
    degree: z.string().optional().describe("Degree name (e.g., BS Computer Science)"),
    field: z.string().optional().describe("Field of study"),
    graduationDate: z.string().optional().describe("Graduation date/year"),
    notes: z.string().optional().describe("GPA, Honors, etc."),
})

const CertificationItemSchema = z.object({
    name: z.string().describe("Name of certification"),
    issuer: z.string().optional().describe("Issuing organization"),
    date: z.string().optional().describe("Date obtained"),
})

const ProjectItemSchema = z.object({
    name: z.string().describe("Project name"),
    description: z.string().optional().describe("Project description"),
    technologies: z.array(z.string()).optional().describe("Technologies used"),
    bullets: z.array(z.string()).describe("Details about the project"),
})

const VolunteerItemSchema = z.object({
    organization: z.string().describe("Organization name"),
    role: z.string().optional().describe("Role title"),
    dates: z.string().optional().describe("Dates of service"),
    description: z.string().optional().describe("Description of volunteer work"),
})

const PublicationItemSchema = z.object({
    title: z.string().describe("Publication title"),
    publisher: z.string().optional().describe("Publisher or conference name"),
    date: z.string().optional().describe("Publication date"),
    description: z.string().optional().describe("Description"),
})

const ParsedResumeSchema = z.object({
    contact: ContactInfoSchema,
    targetTitle: z.string().optional().describe("Target job title or headline from resume"),
    summary: z.string().optional().describe("Professional summary"),
    workExperience: z.array(WorkExperienceItemSchema),
    education: z.array(EducationItemSchema),
    skills: z.array(z.string()).describe("List of skills"),
    interests: z.array(z.string()).optional().default([]),
    certifications: z.array(CertificationItemSchema).optional().default([]),
    awards: z.array(z.string()).optional().default([]),
    projects: z.array(ProjectItemSchema).optional().default([]),
    volunteering: z.array(VolunteerItemSchema).optional().default([]),
    publications: z.array(PublicationItemSchema).optional().default([]),
})

const mockBadData = {
    contact: {
        name: "John Doe",
    },
    education: [
        {
            institution: "University of Example",
            field: null, // This caused invalid_type expected string received null
            graduationDate: null // This caused invalid_type expected string received null
        }
    ],
    workExperience: [],
    skills: ["Skill 1"],
    certifications: [
        "Certified Examples", // This caused invalid_type expected object received string
        "AWS Certified"
    ]
};

console.log("Testing with current (broken) schema expectations...");
const result = ParsedResumeSchema.safeParse(mockBadData);

if (!result.success) {
    console.log("Validation FAILED as expected.");
    console.log(JSON.stringify(result.error.issues, null, 2));
} else {
    console.log("Validation SUCCEEDED unexpectedly.");
}
