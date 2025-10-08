# Task List: Fix Resume Parser Data Extraction

**PRD**: [0003-prd-fix-resume-parser-data-extraction.md](../prds/0003-prd-fix-resume-parser-data-extraction.md)

**Status**: Ready for Implementation

---

## Relevant Files

- [components/optimization/structured-resume-editor.tsx](../../components/optimization/structured-resume-editor.tsx) - Contains `parseMarkdownToStructured` function (lines ~105-640)

---

## Tasks

### 1.0 Fix Work Experience Parsing ✅
- [x] **1.1** Add enhanced logging for Work Experience section detection
- [x] **1.2** Fix regex pattern to match `### Company — Role` format (handle `—`, `–`, `|` separators)
- [x] **1.3** Extract company name from heading (everything before separator)
- [x] **1.4** Extract role name from heading (everything after separator)
- [x] **1.5** Parse dates and location from metadata line after heading
- [x] **1.6** Extract bullet points using existing bullet detection logic
- [x] **1.7** Create WorkExperience objects with all extracted fields
- [x] **1.8** Test with example markdown containing multiple work entries

### 2.0 Fix Education Parsing ✅
- [x] **2.1** Add enhanced logging for Education section detection
- [x] **2.2** Fix heading detection to match `### Degree — Institution` format
- [x] **2.3** Extract institution name from heading
- [x] **2.4** Parse degree and field from heading using "in" and "of" separators
- [x] **2.5** Extract dates in formats: `2016-2020`, `2016 – 2020`, `September 2016 – June 2020`
- [x] **2.6** Split dates into `start` and `end` fields
- [x] **2.7** Parse location from metadata line
- [x] **2.8** Extract GPA from patterns: `GPA: 3.8/4.0` or `(3.8/4.0)`
- [x] **2.9** Extract notes from bullet points (Dean's List, coursework, etc.)
- [x] **2.10** Create Education objects with all extracted fields
- [x] **2.11** Test with example markdown containing education entries

### 3.0 Fix Certifications Parsing (Remove Fabrication) ✅
- [x] **3.1** Add enhanced logging for Certifications section detection
- [x] **3.2** Remove any default/placeholder certification data
- [x] **3.3** Parse heading format: `### Cert Name — Issuer (Year)`
- [x] **3.4** Parse bullet format: `* Cert Name | Issuer | Year`
- [x] **3.5** Parse parentheses format: `- Cert Name (Issuer, Year)`
- [x] **3.6** Extract certification name, issuer, and date from each format
- [x] **3.7** Create Certification objects only from parsed markdown
- [x] **3.8** Return empty array if no certifications found in markdown
- [x] **3.9** Test with markdown containing certifications and without certifications

### 4.0 Fix Skills Parsing (Remove Fabrication)
- [ ] **4.1** Add enhanced logging for Skills section detection
- [ ] **4.2** Remove any default/placeholder skills data
- [ ] **4.3** Parse comma-separated skills: `Python, JavaScript, React`
- [ ] **4.4** Parse pipe-separated skills: `Python | JavaScript | React`
- [ ] **4.5** Parse semicolon-separated skills: `Python; JavaScript; React`
- [ ] **4.6** Parse bullet-separated skills: `Python · JavaScript · React`
- [ ] **4.7** Parse bullet-list format: `* Python\n* JavaScript`
- [ ] **4.8** Handle skill categories: `### Programming Languages` followed by skills
- [ ] **4.9** Deduplicate skills (case-insensitive)
- [ ] **4.10** Create Skill objects only from parsed markdown
- [ ] **4.11** Return empty array if no skills found in markdown
- [ ] **4.12** Test with various skill formats and without skills section

### 5.0 Add Enhanced Logging and Validation
- [ ] **5.1** Add logging for section detection: `[Parser] Found section: <name>`
- [ ] **5.2** Add logging for entry detection: `[Parser] Found <section> entry: <identifier>`
- [ ] **5.3** Add logging for field extraction: `[Parser] Extracted field: <name>=<value>`
- [ ] **5.4** Add final count logging: `[Parser] Parse complete: { work: X, education: Y, ... }`
- [ ] **5.5** Validate required fields before creating objects (e.g., institution for education)
- [ ] **5.6** Trim whitespace from all extracted fields
- [ ] **5.7** Remove empty entries (e.g., work experience with no company or role)
- [ ] **5.8** Test parser with example markdown and verify console output

---

## Notes

- Parser is in `components/optimization/structured-resume-editor.tsx` (lines ~105-640)
- Critical issue: Parser finds sections but doesn't extract data correctly
- Must NOT break existing Contact Info and Summary parsing
- Remove all fabricated/placeholder data - only parse from markdown
