# Manual Testing Guide - Resume Form Population Fix

## Overview
This guide covers manual testing for the resume parser improvements implemented in PRD-0001.

## Prerequisites
- Development server running: `npm run dev`
- Browser with developer console open (F12)
- Test account logged in
- At least one optimized resume available

## Test Cases

### 1. Debug Mode Functionality
**Purpose:** Verify debug logging is working

**Steps:**
1. Navigate to optimized resume page
2. Press `Shift + Ctrl + D`
3. Verify green "DEBUG MODE ENABLED" banner appears at top
4. Open browser console (F12 → Console tab)
5. Look for `[Parser]` log entries

**Expected Results:**
- Debug banner toggles on/off with keyboard shortcut
- Console shows parser logs:
  - `[Parser] Starting parse:` with markdown preview
  - `[Parser] Found section:` for each section detected
  - `[Parser] Parse complete:` with section counts
  - Section-specific logs (Work, Education, Skills, etc.)

---

### 2. Complete Resume - All Sections
**Purpose:** Verify all sections parse correctly

**Test Data:** Use `__tests__/fixtures/resumes/complete-resume.md`

**Steps:**
1. Copy content from `complete-resume.md`
2. Navigate to resume optimization page
3. Create new optimized resume with this content
4. Verify structured editor form populates

**Expected Results:**
- ✅ Contact Info: John Doe, email, phone, LinkedIn, location
- ✅ Summary: 2 summary paragraphs visible
- ✅ Work Experience: 3 jobs (TechCorp Inc., StartupXYZ, DevAgency)
  - Each with company, role, dates, location
  - All bullets preserved
- ✅ Education: 2 degrees (Stanford BS, MIT MS)
  - Degree, field, school, dates
  - GPA and honors/notes
- ✅ Certifications: 4 certifications
  - AWS, Google Cloud, Kubernetes, Scrum
  - With issuers and dates
- ✅ Skills: Multiple skills from different formats
  - Individual skills parsed from comma, pipe, semicolon lists
  - Skills from categorized sections (Frontend, Backend)
- ✅ Interests: All interests parsed

**Console Validation:**
```javascript
// Enable debug mode (Shift+Ctrl+D) and check:
[Parser] Parse complete: {
  hasContact: true,
  summaries: 2,
  experience: 3,
  education: 2,
  certifications: 4,
  skills: 15+,
  interests: 10+
}
```

---

### 3. Certifications - Various Formats
**Purpose:** Verify certifications parser handles all formats

**Test Data:** Use `__tests__/fixtures/resumes/certifications-test.md`

**Steps:**
1. Use certifications test data
2. Navigate to certifications section in editor
3. Verify all certifications are parsed

**Expected Results:**
- ✅ Heading format: "AWS Solutions Architect" with Amazon and 2023
- ✅ Heading format: "PMP" with PMI and 2022
- ✅ Bullet with pipes: "CompTIA Security+" parsed correctly
- ✅ Parentheses format: "Certified Kubernetes Administrator" with CNCF
- ✅ Certification without issuer/date: "Certified Ethical Hacker" appears
- ✅ All certifications have checkbox to include/exclude

**Console Check:**
```
[Parser] Found section: Certifications
// Should show certification count
```

---

### 4. Work Experience - Date Formats
**Purpose:** Verify all date format patterns work

**Test Data:** Use `__tests__/fixtures/resumes/date-formats-test.md`

**Steps:**
1. Use date formats test data
2. Check each work experience entry

**Expected Results - All 6 date formats parsed:**
- ✅ `January 2021 – December 2023` (Full month names)
- ✅ `Jan 2020 – Present` (Abbreviated months)
- ✅ `2019/01 – 2020/12` (YYYY/MM format)
- ✅ `2018 – 2019` (Year only)
- ✅ `Q1 2017 – Q4 2017` (Quarterly)
- ✅ `2016/06 – Present` (YYYY/MM with Present)

---

### 5. Skills - Multiple Separators
**Purpose:** Verify skills parser handles different separator types

**Test Data:** Use `__tests__/fixtures/resumes/skills-separators-test.md`

**Steps:**
1. Use skills separators test data
2. Navigate to Skills section
3. Count parsed skills

**Expected Results:**
- ✅ Comma: Python, JavaScript, TypeScript, Java (4 individual skills)
- ✅ Pipe: React, Vue.js, Angular (3 skills)
- ✅ Semicolon: Node.js, Express, FastAPI (3 skills)
- ✅ Bullet-dot: PostgreSQL, MySQL, MongoDB (3 skills)
- ✅ Categories: Skills from "Programming Languages" and "Databases" sections
- ✅ No duplicates (case-insensitive deduplication)

**Console Check:**
```
[Parser] Parsing skills line: Python, JavaScript, TypeScript, Java
[Parser] Adding skill: Python
[Parser] Adding skill: JavaScript
// etc.
```

---

### 6. Interests - Multiple Separators
**Purpose:** Verify interests parser handles different formats

**Test Data:** Use same file as #5

**Steps:**
1. Check Interests section
2. Verify all interests parsed

**Expected Results:**
- ✅ Comma-separated interests parsed
- ✅ Pipe-separated interests parsed
- ✅ Semicolon-separated interests parsed
- ✅ Each interest appears once (deduplicated)

---

### 7. Minimal Resume
**Purpose:** Verify parser doesn't crash on minimal data

**Test Data:** Use `__tests__/fixtures/resumes/minimal-resume.md`

**Steps:**
1. Use minimal resume data
2. Check if form loads without errors

**Expected Results:**
- ✅ Name: Jane Smith
- ✅ Email: jane.smith@example.com
- ✅ Summary: 1 summary line
- ✅ No errors in console
- ✅ Empty sections show "Add" buttons
- ✅ No crash or parse error

---

### 8. Error Handling - Empty/Malformed Data
**Purpose:** Verify error handling and fallback UI

**Test A - Empty Markdown:**
1. Create optimized resume with empty content: `""`
2. Check for error toast
3. Verify fallback UI appears

**Expected Results:**
- ✅ Error toast: "Resume parser returned empty data..."
- ✅ Fallback shows raw markdown with error message
- ✅ Console shows error details

**Test B - Malformed Markdown:**
1. Create resume with invalid structure:
```markdown
Random text without headers
### Floating heading
## Work Experience
No company name or bullets
```

**Expected Results:**
- ✅ Parser doesn't crash
- ✅ Extracts what it can
- ✅ Console logs show what was found

---

### 9. Preview and Export
**Purpose:** Verify markdown converter includes all sections

**Steps:**
1. Use complete resume from Test #2
2. Edit some fields (add bullet, modify skill, etc.)
3. Click "Preview" tab
4. Check preview HTML
5. Click "Download PDF"
6. Click "Download DOCX"
7. Click "Copy to Clipboard"

**Expected Results:**
- ✅ Preview shows all sections with edits
- ✅ Certifications section appears in preview
- ✅ PDF includes certifications
- ✅ DOCX includes certifications
- ✅ Clipboard markdown includes all sections

---

### 10. Save Functionality
**Purpose:** Verify saving preserves all data

**Steps:**
1. Edit optimized resume (add certification, modify work bullet)
2. Click "Save Resume"
3. Refresh page
4. Verify changes persisted

**Expected Results:**
- ✅ Success toast: "Resume saved successfully"
- ✅ After refresh, all changes preserved
- ✅ No data loss in any section

---

## Console Log Reference

### Successful Parse Example:
```javascript
[Parser] Starting parse: { length: 2543, preview: "# John Doe...", lineCount: 87 }
[Parser] Found section: Contact Info
[Parser] Found section: Summary
[Parser] Found section: Work Experience
[Parser] Found section: Education
[Parser] Found section: Certifications
[Parser] Found section: Skills
[Parser] Found section: Interests
[Parser] Parse complete: {
  hasContact: true,
  summaries: 2,
  experience: 3,
  education: 2,
  certifications: 4,
  skills: 18,
  interests: 12
}
```

### Error Example:
```javascript
[Parser] Fatal error: {
  error: "Cannot read property...",
  stack: "Error: ...",
  markdownPreview: "..."
}
[Editor] Parse error: Error { ... }
```

---

## Regression Testing

Verify these existing features still work:

- ✅ Toggle section visibility (expand/collapse)
- ✅ Include/exclude items (checkboxes)
- ✅ Add new work experience
- ✅ Add new education
- ✅ Add new certification
- ✅ Add/remove skills
- ✅ Add/remove interests
- ✅ Edit contact info fields
- ✅ Edit summary paragraphs
- ✅ Reorder work bullets (if implemented)

---

## Success Criteria

**All tests pass if:**
1. ✅ Debug mode works (Shift+Ctrl+D)
2. ✅ All 7 resume sections parse correctly
3. ✅ Certifications section works (previously missing)
4. ✅ All date formats recognized
5. ✅ Skills/interests handle multiple separators
6. ✅ Error handling shows fallback UI
7. ✅ Preview includes all sections
8. ✅ Save/load preserves data
9. ✅ Console logs provide debugging info
10. ✅ No TypeScript errors or console warnings

---

## Reporting Issues

If you find bugs during testing:

1. Enable debug mode (Shift+Ctrl+D)
2. Open browser console
3. Reproduce the issue
4. Copy console logs
5. Note which test case failed
6. Document expected vs. actual behavior

**Report format:**
```
Test Case: #X - [Name]
Issue: [Description]
Expected: [What should happen]
Actual: [What happened]
Console Logs: [Paste logs]
```
