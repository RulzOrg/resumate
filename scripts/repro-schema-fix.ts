
import { z } from "zod";

// Updated schema from lib/llm-resume-extractor.ts

const ContactInfoSchema = z.object({
    name: z.string().describe("Full name of the candidate"),
    location: z.string().nullish().describe("City, State/Country"),
    phone: z.string().nullish().describe("Phone number"),
    email: z.string().nullish().describe("Email address"),
    linkedin: z.string().nullish().describe("LinkedIn profile URL"),
    website: z.string().nullish().describe("Personal website or portfolio URL"),
})

const WorkExperienceItemSchema = z.object({
    company: z.string().describe("Company name"),
    title: z.string().describe("Job title"),
    location: z.string().nullish().describe("Job location"),
    startDate: z.string().nullish().describe("Start date (e.g., 'Jan 2020')"),
    endDate: z.string().nullish().describe("End date (e.g., 'Present', 'Dec 2022')"),
    employmentType: z.string().nullish().describe("Full-time, Contract, etc."),
    bullets: z.array(z.string()).describe("List of work responsibilities and achievements"),
})

const EducationItemSchema = z.object({
    institution: z.string().describe("University or School name"),
    degree: z.string().nullish().describe("Degree name (e.g., BS Computer Science)"),
    field: z.string().nullish().describe("Field of study"),
    graduationDate: z.string().nullish().describe("Graduation date/year"),
    notes: z.string().nullish().describe("GPA, Honors, etc."),
})

const CertificationItemSchema = z.object({
    name: z.string().describe("Name of certification"),
    issuer: z.string().nullish().describe("Issuing organization"),
    date: z.string().nullish().describe("Date obtained"),
})

const ProjectItemSchema = z.object({
    name: z.string().describe("Project name"),
    description: z.string().nullish().describe("Project description"),
    technologies: z.array(z.string()).optional().describe("Technologies used"),
    bullets: z.array(z.string()).describe("Details about the project"),
})

const VolunteerItemSchema = z.object({
    organization: z.string().describe("Organization name"),
    role: z.string().nullish().describe("Role title"),
    dates: z.string().nullish().describe("Dates of service"),
    description: z.string().nullish().describe("Description of volunteer work"),
})

const PublicationItemSchema = z.object({
    title: z.string().describe("Publication title"),
    publisher: z.string().nullish().describe("Publisher or conference name"),
    date: z.string().nullish().describe("Publication date"),
    description: z.string().nullish().describe("Description"),
})

const ParsedResumeSchema = z.object({
    contact: ContactInfoSchema,
    targetTitle: z.string().nullish().describe("Target job title or headline from resume"),
    summary: z.string().nullish().describe("Professional summary"),
    workExperience: z.array(WorkExperienceItemSchema),
    education: z.array(EducationItemSchema),
    skills: z.array(z.string()).describe("List of skills"),
    interests: z.array(z.string()).optional().default([]),
    certifications: z.preprocess(
        (val) => {
            if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
                return val.map(name => ({ name }));
            }
            return val;
        },
        z.array(CertificationItemSchema).optional().default([])
    ),
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
            field: null, // previously failed, should pass now
            graduationDate: null // previously failed, should pass now
        }
    ],
    workExperience: [],
    skills: ["Skill 1"],
    certifications: [
        "Certified Examples", // previously failed, should be transformed to { name: "Certified Examples" }
        "AWS Certified"
    ]
};

console.log("Testing with patched schema...");
const result = ParsedResumeSchema.safeParse(mockBadData);

if (result.success) {
    console.log("Validation SUCCEEDED with patched schema!");
    console.log("Certifications transformed:", JSON.stringify(result.data.certifications, null, 2));
} else {
    console.log("Validation FAILED:");
    console.log(JSON.stringify(result.error.issues, null, 2));
}
