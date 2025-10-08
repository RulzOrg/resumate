# Task List: Complete Resume Form Population from Optimized Markdown

**PRD Reference:** `/ai-dev-tasks/prds/0001-prd-complete-resume-form-population.md`
**Status:** Ready for Implementation
**Priority:** P0 - Critical Bug Fix

---

## Relevant Files

### Core Files to Modify
- `components/optimization/structured-resume-editor.tsx` - Main parser and form component (lines 105-449 contain `parseMarkdownToStructured`)
- `components/optimization/optimizer-ui-only.tsx` - Parent component that calls the editor

### Supporting Files
- `app/api/resumes/optimize/route.ts` - API that generates optimized markdown
- `lib/db.ts` - Database functions (if schema changes needed)

### Test Files (To Create)
- `components/optimization/__tests__/markdown-parser.test.ts` - Unit tests for parsing functions
- `components/optimization/__tests__/parser-fixtures.ts` - Sample markdown fixtures for testing

### Notes
- The main issue is in the `parseMarkdownToStructured()` function (line 105) which has incomplete parsing logic
- Certifications section has NO parsing implementation despite having the data structure
- Work experience, education, skills, and interests parsers are broken/incomplete
- Current parser is line-by-line imperative style; consider section-based extraction for better maintainability

---

## Tasks

- [x] **1.0 Add Debug Logging and Analysis Tools**
  - [x] 1.1 Add console logging at start of `parseMarkdownToStructured()` to show input markdown length and preview
  - [x] 1.2 Add section detection logging to show which sections are found
  - [x] 1.3 Add summary logging at end of parsing to show what was extracted
  - [x] 1.4 Add error logging with try-catch around entire parser
  - [x] 1.5 Add dev mode toggle for verbose logging (Shift+Ctrl+D)

- [x] **2.0 Fix Work Experience Parsing**
  - [x] 2.1 Fix company/role extraction from heading
  - [x] 2.2 Fix date extraction to handle all formats
  - [x] 2.3 Fix location extraction from metadata line
  - [x] 2.4 Fix bullet point parsing to handle nested bullets
  - [x] 2.5 Handle experience entries without bullets (paragraph format)
  - [x] 2.6 Ensure last experience entry is saved

- [x] **3.0 Fix Education Parsing**
  - [x] 3.1 Fix degree extraction from various patterns
  - [x] 3.2 Fix field of study extraction
  - [x] 3.3 Fix date extraction for education
  - [x] 3.4 Fix GPA extraction
  - [x] 3.5 Extract honors/notes from bullet points under education
  - [x] 3.6 Handle multiple education entries

- [x] **4.0 Implement Certifications Parsing (Missing)**
  - [x] 4.1 Add certifications section detection
  - [x] 4.2 Create certification parser for heading format
  - [x] 4.3 Parse certification from bullet format
  - [x] 4.4 Extract certification name, issuer, and date
  - [x] 4.5 Handle certifications without issuer or date
  - [x] 4.6 Add certifications to markdown converter
  - [x] 4.7 Add certifications to preview HTML

- [ ] **5.0 Fix Skills and Interests Parsing**
  - [ ] 5.1 Enhance skills parser to handle multiple separators
  - [ ] 5.2 Handle bullet-point skills format
  - [ ] 5.3 Handle skill categories/groupings
  - [ ] 5.4 Deduplicate skills (case-insensitive)
  - [ ] 5.5 Enhance interests parser to handle multiple separators
  - [ ] 5.6 Handle bullet-point interests format

- [ ] **6.0 Add Robust Error Handling**
  - [ ] 6.1 Wrap entire parser in try-catch
  - [ ] 6.2 Add try-catch around each section parser
  - [ ] 6.3 Add default values for missing sections
  - [ ] 6.4 Add user-facing error toast on complete parse failure
  - [ ] 6.5 Add fallback to raw markdown display on critical error
  - [ ] 6.6 Log parse errors to console with context

- [ ] **7.0 Testing and Validation**
  - [ ] 7.1 Create test fixtures directory
  - [ ] 7.2 Create unit test file for parser
  - [ ] 7.3 Write test: Complete resume with all sections
  - [ ] 7.4 Write test: Minimal resume (name + email only)
  - [ ] 7.5 Write test: Certifications parsing
  - [ ] 7.6 Write test: Date format variations
  - [ ] 7.7 Write test: Skills/interests with multiple separators
  - [ ] 7.8 Write test: Malformed markdown (error handling)
  - [ ] 7.9 Manual testing: Run dev server and test complete workflow
  - [ ] 7.10 Validation: Check console logs in browser

---

## Detailed Implementation Guide

### 1.0 Add Debug Logging and Analysis Tools

#### 1.1 Add console logging at start of parser
**Location:** `structured-resume-editor.tsx:105`
```typescript
function parseMarkdownToStructured(markdown: string): ResumeData {
  console.log('[Parser] Starting parse:', {
    length: markdown.length,
    preview: markdown.substring(0, 200),
    lineCount: markdown.split('\n').length
  })

  const lines = markdown.split('\n')
  // ... rest of function
}
```

#### 1.2 Add section detection logging
**Location:** After each section regex match (lines 217-260)
```typescript
if (line.match(/^##\s*(professional\s*summary|summary|about)/i)) {
  console.log('[Parser] Found section: Summary')
  // ... existing code
}
```

#### 1.3 Add summary logging at end
**Location:** `structured-resume-editor.tsx:449` (before return)
```typescript
console.log('[Parser] Parse complete:', {
  hasContact: !!(data.contactInfo.firstName || data.contactInfo.email),
  summaries: data.summaries.length,
  experience: data.workExperience.length,
  education: data.education.length,
  certifications: data.certifications.length,
  skills: data.skills.length,
  interests: data.interests.length
})

return data
```

#### 1.4 Add error logging with try-catch
**Location:** Wrap entire function body
```typescript
function parseMarkdownToStructured(markdown: string): ResumeData {
  try {
    // ... all existing code
  } catch (error) {
    console.error('[Parser] Fatal error:', {
      error: error.message,
      stack: error.stack,
      markdownPreview: markdown.substring(0, 500)
    })
    // Return default structure
    return {
      contactInfo: { /* defaults */ },
      targetTitle: { text: '', included: true },
      summaries: [],
      workExperience: [],
      education: [],
      certifications: [],
      skills: [],
      interests: []
    }
  }
}
```

#### 1.5 Add dev mode toggle
**Location:** Top of component
```typescript
const [debugMode, setDebugMode] = useState(false)

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.shiftKey && e.ctrlKey && e.key === 'D') {
      setDebugMode(prev => !prev)
      console.log('[Debug] Debug mode:', !debugMode)
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [debugMode])
```

### 2.0 Fix Work Experience Parsing

#### 2.1 Fix company/role extraction
**Location:** `structured-resume-editor.tsx:281-291`
```typescript
if (line.match(/^###\s+/)) {
  if (currentExperience) {
    data.workExperience.push(currentExperience)
  }

  const heading = line.replace(/^###\s+/, '').trim()
  let company = ''
  let role = ''

  // Try different patterns
  if (heading.includes('—') || heading.includes('–')) {
    const parts = heading.split(/[—–]/)
    company = parts[0]?.trim() || ''
    role = parts[1]?.trim() || ''
  } else if (heading.toLowerCase().includes(' at ')) {
    const parts = heading.split(/\s+at\s+/i)
    role = parts[0]?.trim() || ''
    company = parts[1]?.trim() || ''
  } else if (heading.includes('|')) {
    const parts = heading.split('|')
    company = parts[0]?.trim() || ''
    role = parts[1]?.trim() || ''
  } else {
    // Default: treat whole thing as company
    company = heading
    role = ''
  }

  currentExperience = {
    id: generateId(),
    company,
    role,
    dates: '',
    location: '',
    bullets: [],
    included: true
  }
}
```

#### 2.2 Fix date extraction
**Location:** Lines 300-316
```typescript
const datePatterns = [
  /([A-Za-z]{3,}\s+\d{4}\s*[-–]\s*[A-Za-z]{3,}\s+\d{4})/i,  // January 2021 – December 2023
  /([A-Za-z]{3,}\s+\d{4}\s*[-–]\s*Present)/i,               // Jan 2021 – Present
  /(\d{4}\/\d{2}\s*[-–]\s*\d{4}\/\d{2})/,                   // 2020/01 – 2023/12
  /(\d{4}\s*[-–]\s*\d{4})/,                                  // 2020-2023
  /(\d{4}\s*[-–]\s*Present)/i,                               // 2020-Present
  /(Q[1-4]\s+\d{4}\s*[-–]\s*(?:Q[1-4]\s+\d{4}|Present))/i,  // Q1 2020 – Q4 2023
]

let dateMatch = null
for (const pattern of datePatterns) {
  dateMatch = line.match(pattern)
  if (dateMatch) {
    currentExperience.dates = dateMatch[0].trim()
    break
  }
}
```

#### 2.3 Fix location extraction
**Location:** Lines 316-332
```typescript
if (dateMatch) {
  // Everything after dates (separated by | • or ·) is location
  const remainder = line.replace(dateMatch[0], '').replace(/^[\s|•·,]+/, '').replace(/[\s|•·,]+$/, '').trim()
  if (remainder) {
    currentExperience.location = remainder
  }
} else {
  // No dates found, try to extract location from pipe/bullet separated line
  if (line.includes('|') || line.includes('•') || line.includes('·')) {
    const parts = line.split(/[|•·]/).map(p => p.trim()).filter(Boolean)
    if (parts.length >= 1) {
      // Assume last part is location if it looks like a place
      const lastPart = parts[parts.length - 1]
      if (lastPart.match(/[A-Z][a-z]+/) || lastPart.toLowerCase().includes('remote')) {
        currentExperience.location = lastPart
        // First parts might be dates
        if (parts.length >= 2) {
          currentExperience.dates = parts.slice(0, -1).join(' • ')
        }
      }
    }
  }
}
```

#### 2.4 Fix bullet point parsing
**Location:** Lines 333-343
```typescript
} else if (currentExperience && (line.startsWith('*') || line.startsWith('-'))) {
  // Bullet point - handle nested bullets by checking indentation
  const bulletText = line.replace(/^[\s]*[*-]\s*/, '').trim()
  if (bulletText) {
    currentExperience.bullets.push({
      id: generateId(),
      text: bulletText,
      included: true
    })
  }
}
```

#### 2.5 Handle paragraph format
**Location:** After line 343
```typescript
} else if (currentExperience && !line.startsWith('#') && line.length > 20) {
  // Might be a paragraph description - add as single bullet if no bullets exist yet
  if (currentExperience.bullets.length === 0) {
    currentExperience.bullets.push({
      id: generateId(),
      text: line.trim(),
      included: true
    })
  }
}
```

### 3.0 Fix Education Parsing

#### 3.1-3.6 Complete education parser fix
**Location:** Lines 344-381 (replace existing code)
```typescript
} else if (currentSection === 'education') {
  if (line.match(/^###\s+/)) {
    // Save previous education
    if (currentEducation) {
      data.education.push(currentEducation)
    }
    currentEducation = {
      id: generateId(),
      institution: line.replace(/^###\s+/, '').trim(),
      degree: '',
      field: '',
      location: '',
      start: '',
      end: '',
      gpa: '',
      notes: '',
      included: true
    }
  } else if (currentEducation && !line.startsWith('*') && !line.startsWith('-')) {
    // Try to parse degree and field
    const degreeMatch = line.match(/(?:bachelor|master|phd|doctorate|associate|b\.?s\.?|m\.?s\.?|mba|ma|ba)/i)
    if (degreeMatch) {
      const parts = line.split(/\s+in\s+|\s+of\s+|·|•|\|/)
      currentEducation.degree = parts[0]?.trim() || ''
      if (parts.length > 1) {
        currentEducation.field = parts[1]?.trim().split(/[|•·]/)[0]?.trim() || ''
        if (parts.length > 2) {
          currentEducation.location = parts[2]?.trim() || ''
        }
      }
    }
    // Try to parse dates
    else if (line.match(/\d{4}/)) {
      const dateMatch = line.match(/(\d{4})\s*[-–]\s*(\d{4}|Present|Expected \d{4})/i)
      if (dateMatch) {
        currentEducation.start = dateMatch[1]
        currentEducation.end = dateMatch[2]
      }
    }
    // Try to parse GPA
    else if (line.toLowerCase().includes('gpa')) {
      const gpaMatch = line.match(/GPA:?\s*(\d\.\d+)/i) || line.match(/\((\d\.\d+)\/\d\.\d+\)/)
      if (gpaMatch) {
        currentEducation.gpa = gpaMatch[1]
      }
    }
    // Otherwise might be location
    else if (!currentEducation.location && line.match(/[A-Z][a-z]+/)) {
      currentEducation.location = line.trim()
    }
  } else if (currentEducation && (line.startsWith('*') || line.startsWith('-'))) {
    // Bullet point - add to notes (honors, thesis, etc.)
    const note = line.replace(/^[*-]\s*/, '').trim()
    if (note) {
      currentEducation.notes += (currentEducation.notes ? '\n' : '') + note
    }
  }
}
```

### 4.0 Implement Certifications Parsing

#### 4.1 Add section detection
**Location:** After line 245 (after education, before skills)
```typescript
} else if (line.match(/^##\s*(certifications?|certificates|professional\s*certifications)/i)) {
  if (currentExperience) data.workExperience.push(currentExperience)
  if (currentEducation) data.education.push(currentEducation)
  currentExperience = null
  currentEducation = null
  currentSection = 'certifications'
  console.log('[Parser] Found section: Certifications')
  continue
}
```

#### 4.2-4.5 Implement certifications parser
**Location:** Around line 398 (before skills section)
```typescript
} else if (currentSection === 'certifications') {
  if (line.match(/^###\s+/)) {
    // Format: ### Certification Name — Issuer (Year)
    const heading = line.replace(/^###\s+/, '').trim()
    let name = heading
    let issuer = ''
    let date = ''

    // Try to extract issuer and date from heading
    // Pattern: "Name — Issuer (Year)" or "Name | Issuer | Year"
    if (heading.includes('—') || heading.includes('–')) {
      const parts = heading.split(/[—–]/)
      name = parts[0]?.trim() || ''
      const remainder = parts[1]?.trim() || ''
      // Check for date in parentheses
      const dateMatch = remainder.match(/\((\d{4})\)/)
      if (dateMatch) {
        date = dateMatch[1]
        issuer = remainder.replace(/\(\d{4}\)/, '').trim()
      } else {
        issuer = remainder
      }
    } else if (heading.includes('|')) {
      const parts = heading.split('|').map(p => p.trim())
      name = parts[0] || ''
      issuer = parts[1] || ''
      date = parts[2] || ''
    }

    data.certifications.push({
      id: generateId(),
      name,
      issuer,
      date,
      included: true
    })
  } else if (line.startsWith('*') || line.startsWith('-')) {
    // Bullet format: "- Cert Name | Issuer | Year" or "- Cert (Issuer, Year)"
    const text = line.replace(/^[*-]\s*/, '').trim()
    let name = text
    let issuer = ''
    let date = ''

    if (text.includes('|')) {
      const parts = text.split('|').map(p => p.trim())
      name = parts[0] || ''
      issuer = parts[1] || ''
      date = parts[2] || ''
    } else if (text.includes('(') && text.includes(')')) {
      const match = text.match(/^(.+?)\s*\((.+?)\)$/)
      if (match) {
        name = match[1].trim()
        const details = match[2].split(',').map(p => p.trim())
        issuer = details[0] || ''
        date = details[1] || ''
      }
    }

    data.certifications.push({
      id: generateId(),
      name,
      issuer,
      date,
      included: true
    })
  }
}
```

#### 4.6 Add to markdown converter
**Location:** `convertToMarkdown()` around line 528
```typescript
// Certifications
const includedCertifications = data.certifications.filter(c => c.included)
if (includedCertifications.length > 0) {
  md += `## Certifications\n\n`
  includedCertifications.forEach(cert => {
    if (cert.issuer && cert.date) {
      md += `### ${cert.name} — ${cert.issuer} (${cert.date})\n\n`
    } else if (cert.issuer) {
      md += `### ${cert.name} — ${cert.issuer}\n\n`
    } else {
      md += `### ${cert.name}\n\n`
    }
  })
}
```

#### 4.7 Add to preview HTML
**Location:** Around line 657
```typescript
// Certifications
const includedCertifications = resumeData.certifications.filter(c => c.included)
if (includedCertifications.length > 0) {
  html += `<div class="pt-4 text-sm font-medium text-neutral-300">Certifications</div>`
  includedCertifications.forEach(cert => {
    html += `<div class="mt-2">
      <div class="font-medium">${cert.name}</div>
      ${cert.issuer ? `<div class="text-neutral-300">${cert.issuer}</div>` : ''}
      ${cert.date ? `<div class="text-xs text-neutral-500">${cert.date}</div>` : ''}
    </div>`
  })
}
```

### 5.0 Fix Skills and Interests Parsing

#### 5.1-5.6 Enhanced parsers
**Location:** Lines 382-413 (replace)
```typescript
} else if (currentSection === 'skills') {
  if (line && !line.startsWith('#')) {
    // Handle bullet points
    if (line.startsWith('*') || line.startsWith('-')) {
      const skillText = line.replace(/^[*-]\s*/, '').trim()
      // Split by multiple separators
      const skills = skillText.split(/[,;|·•]/).map(s => s.trim()).filter(Boolean)
      skills.forEach(skill => {
        if (!data.skills.find(s => s.name.toLowerCase() === skill.toLowerCase())) {
          data.skills.push({ id: generateId(), name: skill, included: true })
        }
      })
    } else {
      // Regular line - might have categories like "Frontend: React, Vue"
      const skillText = line.replace(/^[^:]*:\s*/, '') // Remove category prefix
      const skills = skillText.split(/[,;|·•]/).map(s => s.trim()).filter(Boolean)
      skills.forEach(skill => {
        if (!data.skills.find(s => s.name.toLowerCase() === skill.toLowerCase())) {
          data.skills.push({ id: generateId(), name: skill, included: true })
        }
      })
    }
  }
} else if (currentSection === 'interests') {
  if (line && !line.startsWith('#')) {
    // Same logic as skills
    if (line.startsWith('*') || line.startsWith('-')) {
      const interestText = line.replace(/^[*-]\s*/, '').trim()
      const interests = interestText.split(/[,;|·•]/).map(i => i.trim()).filter(Boolean)
      interests.forEach(interest => {
        if (!data.interests.find(i => i.name.toLowerCase() === interest.toLowerCase())) {
          data.interests.push({ id: generateId(), name: interest, included: true })
        }
      })
    } else {
      const interests = line.split(/[,;|·•]/).map(i => i.trim()).filter(Boolean)
      interests.forEach(interest => {
        if (!data.interests.find(i => i.name.toLowerCase() === interest.toLowerCase())) {
          data.interests.push({ id: generateId(), name: interest, included: true })
        }
      })
    }
  }
}
```

### 6.0 Error Handling

All error handling code snippets are included in sections 1.4, 6.1-6.6 above.

### 7.0 Testing

Create test file and run manual tests as outlined in tasks 7.1-7.10.

---

## Implementation Order & Dependencies

**Critical Path (Must Do First):**
1. Task 1.1-1.4 (Logging) → Enables debugging all other tasks
2. Task 4.0 (Certifications) → Completely missing, highest priority gap
3. Task 2.0 (Work Experience) → Most critical existing section
4. Task 3.0 (Education) → Second most critical section

**Can Do In Parallel:**
- Tasks 5.0 (Skills/Interests) - Independent of others
- Tasks 6.0 (Error Handling) - Can wrap existing code anytime

**Must Do Last:**
- Task 7.0 (Testing) → Requires all parsers fixed first

---

## Estimated Time

- **Task 1.0:** 30-45 minutes (logging infrastructure)
- **Task 2.0:** 45-60 minutes (experience parser fixes)
- **Task 3.0:** 30-45 minutes (education parser fixes)
- **Task 4.0:** 45-60 minutes (certifications from scratch)
- **Task 5.0:** 20-30 minutes (skills/interests enhancement)
- **Task 6.0:** 20-30 minutes (error handling)
- **Task 7.0:** 60-90 minutes (comprehensive testing)

**Total Estimated Time:** 4-6 hours for complete implementation

---

## Summary

- **Total Tasks:** 7 parent tasks
- **Total Sub-tasks:** 45 actionable items
- **Critical Priority:** Tasks 1, 2, 3, 4 (must fix immediately)
- **Files to Modify:** 1 main file (`structured-resume-editor.tsx`)
- **Files to Create:** 2 test files
- **Estimated Time:** 4-6 hours

**Ready to start implementation?**

**Next Steps:**
- A) Start with Task 1.0 (logging) - I can implement this now
- B) Start with Task 4.0 (certifications) - Biggest gap
- C) Review task list and modify priorities
- D) Begin implementation using `/implement` command
