# PRD-0003: Fix Resume Parser to Extract All Optimized Resume Data

## Introduction/Overview

**Problem:** The StructuredResumeEditor component is not correctly parsing data from the optimized resume markdown. Currently, only Contact Information and Professional Summary are being extracted, while Work Experience, Education, Certifications, and Skills sections are either empty, missing, or showing fabricated/incorrect data.

**Impact:** Users cannot edit their optimized resumes because the form fields are empty or contain wrong data. This breaks the core resume editing workflow and forces users to manually re-enter all their information.

**Root Cause:** The markdown parser (`parseMarkdownToStructured` function) is not correctly identifying and extracting content from all resume sections in the optimized markdown.

**Goal:** Fix the parser to accurately extract ALL resume sections (Work Experience, Education, Certifications, Skills, Interests) from the optimized resume markdown and populate the StructuredResumeEditor form fields with the correct data, allowing users to review and edit their optimized resume.

---

## Goals

1. **100% Data Extraction** - Parse and extract all sections from optimized resume markdown
2. **Accurate Field Mapping** - Map parsed data correctly to form fields (company, role, dates, degree, etc.)
3. **Zero Data Loss** - Preserve all information from the optimized resume
4. **Enable User Editing** - Allow users to review, edit, and refine the AI-optimized content
5. **Maintain Existing Parser** - Fix bugs in existing parser without breaking Contact Info/Summary parsing

---

## User Stories

### US-1: Work Experience Parsing
**As a** user who has optimized their resume for a job
**I want to** see my work experience entries populated in the editor
**So that** I can review and edit the AI-optimized job descriptions

**Acceptance Criteria:**
- Work experience entries from optimized markdown appear in the Work Experience section
- Each entry shows: Company, Role, Dates, Location
- Bullet points/descriptions are populated
- Include/exclude checkboxes work correctly
- User can edit any field

### US-2: Education Parsing
**As a** user with education in my resume
**I want to** see my education entries auto-populated
**So that** I don't have to manually re-enter my degrees and schools

**Acceptance Criteria:**
- Education entries from optimized markdown appear in the Education section
- Each entry shows: Institution, Degree, Field, Start/End dates, Location, GPA, Notes
- Multiple education entries are supported
- "Add Education" button still works for adding more

### US-3: Certifications Parsing
**As a** user with professional certifications
**I want to** see my actual certifications listed (not fabricated ones)
**So that** I can verify they're correct and included in my resume

**Acceptance Criteria:**
- Only certifications from the optimized markdown are shown
- No placeholder/example certifications appear
- Each certification shows: Name, Issuer, Date
- Certifications can be toggled on/off

### US-4: Skills Parsing
**As a** user reviewing my optimized resume
**I want to** see the skills from the optimized resume (not fabricated ones)
**So that** I can verify the AI selected relevant skills for the job

**Acceptance Criteria:**
- Skills from optimized markdown are parsed and displayed
- No fabricated/example skills appear
- Skills can be added, removed, or toggled
- "Generate skills" button adds suggestions without replacing existing skills

### US-5: Interests Parsing
**As a** user with interests in my resume
**I want to** see my interests populated from the optimized markdown
**So that** I can decide if they should be included

**Acceptance Criteria:**
- Interests from optimized markdown appear in Interests section
- Interests can be added, removed, or toggled

---

## Functional Requirements

### FR-1: Parser Architecture
- **FR-1.1** Parser must receive the complete optimized resume markdown as input
- **FR-1.2** Parser must use section headers (## Work Experience, ## Education, etc.) to identify sections
- **FR-1.3** Parser must handle variations in section names (e.g., "Work Experience" vs "Professional Experience")
- **FR-1.4** Parser must extract data line-by-line and store in appropriate data structures
- **FR-1.5** Parser must log detailed debug information for troubleshooting

### FR-2: Work Experience Parsing (CRITICAL - Currently Broken)
- **FR-2.1** Detect Work Experience section via `## Work Experience` or `## Professional Experience`
- **FR-2.2** Extract each job entry from `### Company — Role` heading format
- **FR-2.3** Parse company and role from heading (handle `—`, `–`, `|`, `at` separators)
- **FR-2.4** Extract dates and location from metadata line after heading
- **FR-2.5** Extract all bullet points (lines starting with `*`, `-`, or `•`)
- **FR-2.6** Handle nested bullets and multi-line descriptions
- **FR-2.7** Create WorkExperience objects with: `{ company, role, dates, location, bullets[], included: true }`
- **FR-2.8** Support multiple work experience entries

### FR-3: Education Parsing (CRITICAL - Currently Returns 0 Entries)
- **FR-3.1** Detect Education section via `## Education` or `## Academic Background`
- **FR-3.2** Extract each education entry from `### Institution Name` heading
- **FR-3.3** Parse degree and field from line like "Bachelor of Science in Computer Science"
- **FR-3.4** Extract dates in formats: `2016-2020`, `2016 – 2020`, `September 2016 – June 2020`
- **FR-3.5** Parse location from metadata (e.g., `Stanford, CA`)
- **FR-3.6** Extract GPA from patterns: `GPA: 3.8/4.0` or `(3.8/4.0)`
- **FR-3.7** Extract honors/notes from bullet points (Dean's List, coursework, thesis, etc.)
- **FR-3.8** Create Education objects with: `{ institution, degree, field, start, end, location, gpa, notes, included: true }`

### FR-4: Certifications Parsing (CRITICAL - Currently Shows Wrong Data)
- **FR-4.1** Detect Certifications section via `## Certifications` or `## Certificates`
- **FR-4.2** Parse heading format: `### Cert Name — Issuer (Year)`
- **FR-4.3** Parse bullet format: `* Cert Name | Issuer | Year`
- **FR-4.4** Parse parentheses format: `- Cert Name (Issuer, Year)`
- **FR-4.5** Extract certification name, issuer, and date/year
- **FR-4.6** Create Certification objects with: `{ name, issuer, date, included: true }`
- **FR-4.7** Do NOT add placeholder/example certifications
- **FR-4.8** Only show certifications explicitly found in the markdown

### FR-5: Skills Parsing (CRITICAL - Currently Shows Fabricated Skills)
- **FR-5.1** Detect Skills section via `## Skills` or `## Core Competencies`
- **FR-5.2** Parse comma-separated skills: `Python, JavaScript, React`
- **FR-5.3** Parse pipe-separated skills: `Python | JavaScript | React`
- **FR-5.4** Parse semicolon-separated skills: `Python; JavaScript; React`
- **FR-5.5** Parse bullet-separated skills: `Python · JavaScript · React`
- **FR-5.6** Parse bullet-list format: `* Python`, `* JavaScript`
- **FR-5.7** Handle skill categories: `### Programming Languages` followed by skill list
- **FR-5.8** Create Skill objects with: `{ name, included: true }`
- **FR-5.9** Do NOT add fabricated/example skills
- **FR-5.10** Deduplicate skills (case-insensitive)

### FR-6: Interests Parsing
- **FR-6.1** Detect Interests section via `## Interests` or `## Hobbies`
- **FR-6.2** Parse using same separator logic as skills (comma, pipe, semicolon, bullet)
- **FR-6.3** Create Interest objects with: `{ name, included: true }`
- **FR-6.4** Deduplicate interests (case-insensitive)

### FR-7: Contact Information Parsing (Already Working - Don't Break)
- **FR-7.1** Continue parsing first name from `# First Last` heading
- **FR-7.2** Continue extracting email via regex
- **FR-7.3** Continue extracting phone via regex
- **FR-7.4** Continue extracting LinkedIn URL
- **FR-7.5** Continue extracting location

### FR-8: Professional Summary Parsing (Already Working - Don't Break)
- **FR-8.1** Continue parsing summary paragraphs from `## Professional Summary` section
- **FR-8.2** Support multiple summary paragraphs

### FR-9: Error Handling and Logging
- **FR-9.1** Log section detection: `[Parser] Found section: <name>`
- **FR-9.2** Log entry detection: `[Parser] Found <section> entry: <identifier>`
- **FR-9.3** Log final counts: `[Parser] Parse complete: { work: X, education: Y, ... }`
- **FR-9.4** Catch parsing errors without crashing entire parser
- **FR-9.5** Return empty arrays for sections not found (not default placeholder data)

### FR-10: Data Validation
- **FR-10.1** Validate required fields before creating objects (e.g., institution for education)
- **FR-10.2** Trim whitespace from all extracted fields
- **FR-10.3** Remove empty entries (e.g., work experience with no company or role)
- **FR-10.4** Ensure all IDs are unique (use `generateId()`)

---

## Non-Goals (Out of Scope)

1. **AI Content Generation** - This PRD is about parsing existing content, not generating new content
2. **Markdown Formatting** - Not changing how markdown is formatted, only parsing it
3. **UI Changes** - Editor UI already exists and works, just needs correct data
4. **Database Changes** - No schema changes needed
5. **API Changes** - No changes to backend endpoints
6. **New Sections** - Not adding new resume sections beyond what exists
7. **Validation Rules** - Not enforcing field formats (e.g., date validation)
8. **Data Migration** - Not backfilling old resumes
9. **Performance Optimization** - Parser performance is already acceptable
10. **Multi-language Support** - English markdown only

---

## Design Considerations

### Current Parser Location
- File: `components/optimization/structured-resume-editor.tsx`
- Function: `parseMarkdownToStructured(markdown: string): ResumeData`
- Lines: ~105-640

### Existing Data Structures (Don't Change)
```typescript
interface WorkExperience {
  id: string
  company: string
  role: string
  dates: string
  location: string
  bullets: { id: string; text: string; included: boolean }[]
  included: boolean
}

interface Education {
  id: string
  institution: string
  degree: string
  field: string
  location: string
  gpa?: string
  start: string
  end: string
  notes: string
  included: boolean
}

interface Certification {
  id: string
  name: string
  issuer: string
  date: string
  included: boolean
}

interface Skill {
  id: string
  name: string
  included: boolean
}

interface Interest {
  id: string
  name: string
  included: boolean
}
```

### Example Optimized Resume Markdown
```markdown
# John Iseghohi

iseghohi.john@gmail.com

## Professional Summary

Dynamic and results-driven Engineering Manager with a strong background in product design and management...

## Work Experience

### Senior Product Designer — ABC Design Corp**

Jan 2015 – Present*

* Spearheaded the design and delivery of multiple high-impact projects
* Coordinated with cross-functional teams
* Facilitated stakeholder communications

### Product Designer — XYZ Innovations**

Aug 2010 – Dec 2014*

* Led design initiatives for multiple product lines
* Collaborated with technical leads

## Education

### Bachelor of Science in Computer Science — Stanford University

2010 - 2014 | Stanford, CA

GPA: 3.8/4.0

* Dean's List (2012, 2013)

## Certifications

### Certified ScrumMaster — Scrum Alliance (2020)

### Design Thinking Practitioner — IDEO (2019)

## Skills

Technical Leadership, People Management, Project Delivery, Stakeholder Engagement, Coaching and Development, Communication and Collaboration, Problem Solving, Strategic Planning

## Interests

Mentoring, Innovation, Team Building
```

---

## Technical Considerations

### Current Issues (from Debug Logs)
Based on console output:
```
[Parser] Found section: Education
[Parser] Parse complete: {
  education: 0,        // ❌ Should be 1
  experience: 1,       // ❌ Entry exists but fields are empty
  certifications: 3,   // ❌ Wrong certifications (fabricated)
  skills: 29,          // ❌ Fabricated skills
  hasContact: true,    // ✅ Working
  summaries: 1         // ✅ Working
}
```

### Root Cause Analysis
1. **Work Experience Empty Fields**: Parser creates entries but doesn't extract company/role from heading
2. **Education 0 Entries**: Parser finds section but doesn't create education objects (likely heading format mismatch)
3. **Wrong Certifications**: Parser might be using default/example data instead of parsing markdown
4. **Fabricated Skills**: Parser might be adding default skills instead of parsing from markdown

### Fix Strategy
1. **Add more logging** to see exactly what's being parsed
2. **Fix heading parsers** to handle different formats (—, –, |, etc.)
3. **Remove default/placeholder data** - only use parsed data
4. **Test with actual resume markdown** from the screenshot

### Dependencies
- Existing parser infrastructure (already implemented in PRD-0001)
- TypeScript interfaces (already defined)
- Lucide icons (already imported)
- generateId() function (already exists)

### Testing Strategy
1. **Unit tests** with sample markdown (create test fixtures)
2. **Manual testing** with actual optimized resume
3. **Console logging** to verify each section's count
4. **Before/After screenshots** to verify UI population

---

## Success Metrics

### Quantitative Metrics
1. **Parser Accuracy**: 100% of sections correctly identified and extracted
2. **Data Completeness**: 100% of entries in markdown result in form entries
3. **Field Accuracy**: 95%+ of fields correctly populated
4. **Zero Fabrication**: 0% fabricated/placeholder data in parsed results
5. **Error Rate**: < 1% of parses result in errors

### Qualitative Metrics
1. **User Feedback**: Positive feedback on data accuracy
2. **Edit Time**: Users spend less time fixing incorrect data
3. **Confidence**: Users trust the editor shows their actual resume data

### Test Cases (Must Pass)
| Section | Test Input | Expected Output |
|---------|-----------|-----------------|
| Work Experience | `### Company — Role` | `{ company: "Company", role: "Role" }` |
| Work Experience | `### Role at Company` | `{ company: "Company", role: "Role" }` |
| Education | `### Stanford University` | `{ institution: "Stanford University" }` |
| Education | `Bachelor of Science in CS` | `{ degree: "Bachelor of Science", field: "CS" }` |
| Certifications | `### CSM — Scrum Alliance (2020)` | `{ name: "CSM", issuer: "Scrum Alliance", date: "2020" }` |
| Skills | `Python, Java, React` | `[{ name: "Python" }, { name: "Java" }, { name: "React" }]` |
| Skills | No skills section | `[]` (empty array, not fabricated skills) |

---

## Open Questions

1. **Q: What if a section is missing from optimized markdown?**
   - A: Return empty array (e.g., `education: []`), show "Add Education" button

2. **Q: What if dates are in unexpected format?**
   - A: Extract as-is, user can edit later

3. **Q: What if GPA is missing from education?**
   - A: Leave `gpa` field empty or undefined

4. **Q: Should we validate data (e.g., email format)?**
   - A: No, just parse and display. User can edit.

5. **Q: What if markdown has HTML or special characters?**
   - A: Strip HTML, preserve special chars in text

6. **Q: Should parser handle typos in section headers (e.g., "Educaton")?**
   - A: No, require correct headers. Add fuzzy matching in future PRD if needed.

7. **Q: What if bullet points use different markers (*, -, •)?**
   - A: Support all three (already in requirements)

8. **Q: Should we parse Target Title section?**
   - A: Yes, if present. Extract from `## Target Title` or similar.

9. **Q: What about "Included parts" from the console log?**
   - A: This seems to be separate feature. Focus on parsing first.

10. **Q: Should we test with user's actual resume markdown?**
    - A: Yes, use the example from screenshot for testing.

---

## Implementation Phases

### Phase 1: Fix Critical Parsing Issues (P0)
1. Fix Work Experience field extraction (company, role from heading)
2. Fix Education entry creation (detect `### Institution` headings)
3. Remove fabricated certifications (only parse from markdown)
4. Remove fabricated skills (only parse from markdown)

### Phase 2: Enhance Parsing Logic (P1)
1. Add support for more date formats
2. Add support for more heading formats
3. Improve bullet point extraction
4. Add GPA and notes extraction for education

### Phase 3: Testing and Validation (P2)
1. Create comprehensive test fixtures
2. Add unit tests for parser
3. Manual testing with real resumes
4. Fix edge cases

### Phase 4: Polish and Documentation (P3)
1. Improve error messages
2. Add inline code comments
3. Update IMPLEMENTATION_SUMMARY.md
4. Create troubleshooting guide

---

## Risk Mitigation

**Risk**: Parser changes break existing Contact Info/Summary parsing
**Mitigation**: Add tests for existing functionality before making changes

**Risk**: Regex patterns don't match all markdown variations
**Mitigation**: Start with broad patterns, refine based on testing

**Risk**: Performance issues with large resumes
**Mitigation**: Parser is already fast (~100ms), shouldn't be an issue

**Risk**: Users' resumes have unexpected formats
**Mitigation**: Add extensive logging to debug issues in production

**Risk**: TypeScript type mismatches
**Mitigation**: Use existing interfaces, run `npx tsc --noEmit` frequently

---

## Acceptance Criteria (Final)

- [ ] Work Experience entries populate with company, role, dates, location, bullets
- [ ] Education entries populate with institution, degree, field, dates, GPA, notes
- [ ] Certifications show only what's in markdown (no fabricated data)
- [ ] Skills show only what's in markdown (no fabricated data)
- [ ] Interests populate from markdown if present
- [ ] Contact Info continues to work (regression test)
- [ ] Professional Summary continues to work (regression test)
- [ ] Console logs show correct counts for all sections
- [ ] No TypeScript errors
- [ ] No console errors during parsing
- [ ] User can edit all populated fields
- [ ] Include/exclude checkboxes work for all entries
- [ ] "Add <section>" buttons work for adding new entries
- [ ] Empty sections show "Add <section>" button (not empty entries)

---

## Priority

**Severity**: P0 - Critical Bug (Blocks core functionality)
**Impact**: High (Affects all users editing optimized resumes)
**Effort**: Medium (3-5 hours) - Parser logic exists, needs bug fixes

**Recommended Timeline**:
- Fix critical issues (Work, Education, Certs, Skills): 1-2 hours
- Testing and edge cases: 1-2 hours
- Documentation and commit: 30 minutes
**Total**: 2.5-4.5 hours

---

**Document Version**: 1.0
**Created**: 2025-10-08
**Status**: Draft - Pending Approval
**Related**: PRD-0001 (Complete Resume Form Population), PRD-0002 (Add Education Section to Optimizer)
