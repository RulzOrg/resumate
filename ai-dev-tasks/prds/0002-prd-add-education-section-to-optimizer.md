# PRD-0002: Add Education Section to Resume Optimizer UI

## Introduction/Overview

The resume optimizer UI currently displays Contact Information, Target Title, Professional Summary, Work Experience, Skills, and Interests sections. However, the **Education section is completely missing** from this interface, despite the structured resume editor (next step in the workflow) supporting it.

This creates a poor user experience where:
1. Users cannot see or edit their education during the initial optimization phase
2. Education data from parsed resumes is not displayed in the optimizer
3. Users must wait until the structured editor to add/modify education
4. The UI is inconsistent with the Certifications section (which has similar structure)

**Goal:** Add a fully functional Education section to the optimizer UI that matches the existing design patterns, allows manual entry via modal, auto-populates from parsed resume data, and integrates with the preview system.

---

## Goals

1. **Display Education section** in the optimizer UI between Work Experience and Skills sections
2. **Match existing design patterns** - Use the same collapsible section UI, modal design, and interaction patterns as Certifications
3. **Enable manual entry** - Provide an "Add education" button that opens a modal for data entry
4. **Support parsed data** - Auto-populate education entries from resume markdown when present
5. **Integrate with preview** - Display education in the preview panel with proper formatting
6. **Maintain data persistence** - Save education data to localStorage and sync with backend
7. **Ensure responsive design** - Work seamlessly on mobile and desktop

---

## User Stories

### US-1: User with Education in Resume
**As a** user optimizing my resume
**I want to** see my education automatically populated in the optimizer
**So that** I can verify and edit it before proceeding

**Acceptance Criteria:**
- Education from parsed resume appears in the Education section
- Multiple education entries are displayed correctly
- Each entry shows: Institution, Degree, Field, Dates, Location, GPA, Notes
- Include/exclude checkbox is checked by default

### US-2: User Adding New Education
**As a** user without education in my resume
**I want to** manually add my education via a modal form
**So that** I can include it in my optimized resume

**Acceptance Criteria:**
- "Add education" button opens a modal with form fields
- Modal validates required fields (Institution)
- Clicking "Save" adds the education entry to the list
- New entry appears with all fields editable inline
- Entry scrolls into view smoothly after creation

### US-3: User Editing Existing Education
**As a** user reviewing my education
**I want to** edit education details inline
**So that** I can correct or update information quickly

**Acceptance Criteria:**
- All fields are editable directly in the entry card
- Changes trigger preview update
- Changes are saved to localStorage automatically
- GPA is merged into notes field (matching provided pattern)

### US-4: User Removing Education
**As a** user with multiple education entries
**I want to** remove entries I don't want to include
**So that** I can customize my resume

**Acceptance Criteria:**
- Each entry has a "Remove" button with trash icon
- Clicking Remove deletes the entry immediately
- Preview updates to reflect removal
- localStorage is updated

### US-5: User Including/Excluding Education
**As a** user optimizing my resume
**I want to** toggle education entries on/off without deleting them
**So that** I can test different resume variations

**Acceptance Criteria:**
- Each entry has a checkbox for include/exclude
- Unchecked entries don't appear in preview
- Preview updates immediately when toggled
- State is saved to localStorage

---

## Functional Requirements

### FR-1: Section Structure
- **FR-1.1** Education section must appear between Work Experience and Skills sections
- **FR-1.2** Section must use the same collapsible design pattern (`.bg-neutral-900/50 border-neutral-800 border rounded-2xl`)
- **FR-1.3** Section header must have:
  - Chevron icon for collapse/expand
  - "Education" heading (text-lg sm:text-xl tracking-tight font-semibold)
  - No AI generation button (manual entry only, matching provided code)
- **FR-1.4** Section must be expanded by default
- **FR-1.5** Section must contain:
  - Education entries list (`#education-list`)
  - "Add education" button
  - Certifications subsection (already exists in provided code)

### FR-2: Add Education Button
- **FR-2.1** Button must display "Add education" with plus icon
- **FR-2.2** Button styling: `inline-flex gap-2 hover:text-white text-sm text-neutral-300`
- **FR-2.3** Clicking button must open education modal
- **FR-2.4** Button must use Lucide icons (data-lucide="plus")

### FR-3: Education Modal
The modal must match the exact design provided in the HTML/CSS code:

- **FR-3.1** Modal overlay: Fixed, centered, with backdrop blur (`bg-neutral-950/40 backdrop-blur`)
- **FR-3.2** Modal container: Rounded-2xl, border-neutral-800, max-w-3xl
- **FR-3.3** Modal header:
  - "Add Education" title (text-lg sm:text-xl)
  - Close button (X icon) in top-right
- **FR-3.4** Modal body with form fields (grid layout):
  - **Institution** (required): Text input, placeholder "e.g. Columbia University"
  - **Location**: Text input, placeholder "e.g. New York, NY"
  - **GPA**: Text input, placeholder "e.g. 3.8/4.0" (same row as Location)
  - **Degree**: Text input, placeholder "e.g. Bachelor's"
  - **Field of Study**: Text input, placeholder "e.g. Marketing" (same row as Degree)
  - **Start Date**: Month picker (type="month")
  - **End Date**: Month picker (type="month") (same row as Start)
  - **Additional Information**: Textarea (4 rows), placeholder "e.g. Dean's List, relevant coursework, or academic awards"
- **FR-3.5** Modal footer:
  - "Cancel" button (text-neutral-300 hover:text-white)
  - "Save" button (bg-emerald-600 hover:bg-emerald-500) with save icon
- **FR-3.6** Modal interactions:
  - ESC key closes modal
  - Clicking outside overlay closes modal
  - Close button (X) closes modal
  - Auto-focus on Institution field when opened

### FR-4: Modal Validation
- **FR-4.1** Institution field is required
- **FR-4.2** Empty Institution shows red ring (`ring-2 ring-red-500/60`)
- **FR-4.3** Validation occurs on "Save" click
- **FR-4.4** Focus returns to invalid field
- **FR-4.5** All other fields are optional

### FR-5: Education Entry Display
Each education entry must match the provided HTML structure:

- **FR-5.1** Container: `.education-item rounded-xl border border-neutral-800 bg-neutral-950/40`
- **FR-5.2** Entry must have unique `data-edu-id` attribute
- **FR-5.3** Include/exclude checkbox:
  - Checked by default
  - Green checkmark when checked (bg-emerald-600)
  - Triggers preview update on change
- **FR-5.4** Institution field: Full-width text input, editable inline
- **FR-5.5** Degree and Field: Two-column grid on desktop, single column on mobile
- **FR-5.6** Start Date, End Date, Location: Three-column grid on desktop
- **FR-5.7** Notes field: Textarea (3 rows), full-width
- **FR-5.8** Remove button: Trash icon with "Remove" text, right-aligned
- **FR-5.9** All fields use styling: `bg-transparent border border-neutral-800 rounded-md px-2.5 py-1.5 text-sm`

### FR-6: Data Management
- **FR-6.1** Education data structure:
  ```javascript
  {
    id: string,           // Unique identifier
    include: boolean,     // Include in resume
    institution: string,  // School name
    location: string,     // City, State
    degree: string,       // e.g. "Bachelor of Science"
    field: string,        // e.g. "Computer Science"
    start: string,        // YYYY-MM format
    end: string,          // YYYY-MM format
    notes: string         // Additional info including GPA
  }
  ```
- **FR-6.2** GPA must be merged into notes field with bullet separator: `notes + ' • GPA: ' + gpa`
- **FR-6.3** Education array must be stored in localStorage as `resume-education-data`
- **FR-6.4** Data must persist across page refreshes
- **FR-6.5** Data must sync with backend on save

### FR-7: Preview Integration
- **FR-7.1** Preview section must have ID `education-preview`
- **FR-7.2** Preview must show "Education" heading (text-sm font-medium text-neutral-300)
- **FR-7.3** Each education entry in preview must display:
  - Institution name (font-medium)
  - Degree and Field separated by bullet (text-neutral-300)
  - Dates formatted as "MMM YYYY – MMM YYYY" (text-xs text-neutral-500)
  - Location appended to date line
  - Notes paragraph (text-sm text-neutral-200)
- **FR-7.4** Preview must update on:
  - Education field edit (input event)
  - Include/exclude toggle (change event)
  - Education removal
  - New education added
- **FR-7.5** Preview must only show entries where `include === true`

### FR-8: Auto-Population from Parsed Resume
- **FR-8.1** If resume contains education markdown, parse and populate entries
- **FR-8.2** Parsing must extract:
  - Institution from heading (`### Institution Name`)
  - Degree and Field from text (e.g. "Bachelor of Science in Computer Science")
  - Dates (various formats: "YYYY-MM", "Month YYYY", "YYYY")
  - Location from metadata line
  - GPA from text (e.g. "GPA: 3.8/4.0" or "(3.8/4.0)")
  - Honors/notes from bullet points
- **FR-8.3** If no education in resume, section must still render with "Add education" button
- **FR-8.4** Multiple education entries must be supported

### FR-9: Responsive Design
- **FR-9.1** Mobile (< 640px):
  - Single column layout for all field pairs
  - Modal padding: px-4 py-4
  - Text sizes adjust: text-sm minimum
- **FR-9.2** Desktop (≥ 640px):
  - Grid layouts: sm:grid-cols-2, sm:grid-cols-3, sm:grid-cols-12
  - Modal padding: sm:px-5 sm:py-5
  - Text sizes: sm:text-xl for headings
- **FR-9.3** Modal must be scrollable on small screens
- **FR-9.4** Smooth scroll to new entries on mobile

### FR-10: Interactions and Animations
- **FR-10.1** Section collapse/expand: Chevron rotates with transition
- **FR-10.2** New entry: Smooth scroll into view (`scrollIntoView({ behavior: 'smooth', block: 'center' })`)
- **FR-10.3** Modal open/close: Backdrop blur animation
- **FR-10.4** Checkbox: Checkmark opacity transition (0 → 100%)
- **FR-10.5** Hover states on all interactive elements

---

## Non-Goals (Out of Scope)

1. **AI generation** - No "Generate education" button (unlike Skills/Interests). Users must enter manually or rely on parsed data.
2. **Education ordering** - No drag-and-drop reordering (can be added later)
3. **Education templates** - No pre-filled templates or suggestions
4. **Degree validation** - No dropdown of standard degrees
5. **Institution autocomplete** - No school name suggestions
6. **GPA validation** - No enforcement of GPA format/range
7. **Date validation** - No enforcement of start < end
8. **Duplicate detection** - No automatic detection of duplicate entries
9. **Import from LinkedIn** - No external data import
10. **Certification modal changes** - Certifications modal remains unchanged

---

## Design Considerations

### Design System Compliance
- **Colors**: Must use neutral-900, neutral-800, neutral-700, neutral-300, emerald-600 palette
- **Borders**: border-neutral-800 with rounded-xl or rounded-2xl
- **Typography**: font-space-grotesk for headings, text-sm for body
- **Icons**: Lucide icon library (lucide.createIcons())
- **Spacing**: Consistent pt-4, px-4, gap-2, gap-4 spacing

### Component Reusability
- Education modal closely mirrors Certification modal design
- Both use same button styles, input styles, layout grids
- Consider extracting shared modal component (future refactor)

### Accessibility
- **Labels**: Proper aria-labels for form fields
- **Focus management**: Auto-focus on modal open, focus trap in modal
- **Keyboard navigation**: ESC to close, Tab to navigate fields
- **Screen readers**: Proper semantic HTML (label, input associations)
- **Color contrast**: WCAG AA compliance for all text

---

## Technical Considerations

### File Location
- **Component**: `components/optimization/optimizer-ui-only.tsx` (or similar optimizer component)
- **Styling**: Inline Tailwind classes (matching existing pattern)
- **Script**: Inline JavaScript within component (matching provided code pattern)

### Code Pattern
The provided HTML/CSS uses inline `<script>` tags with IIFEs. Match this pattern:
```javascript
(function() {
  const btn = document.getElementById('btn-add-education');
  // Modal and interaction logic here
})();
```

### State Management
- **localStorage**: Primary storage for education data
- **Key**: `resume-education-data`
- **Format**: JSON with `{ education: [...], certifications: [...] }`
- **Sync**: Call `saveAll()` on every change
- **Hydrate**: Call `loadAll()` on component mount

### Integration Points
1. **Preview System**: Hook into existing `window.buildPreview()` function
2. **Parser**: Integrate with resume markdown parser (from PRD-0001)
3. **Structured Editor**: Data must sync with structured resume editor on next step
4. **Backend**: PATCH `/api/resumes/optimized/:id` to save changes

### Browser Compatibility
- **Month input**: Supported in modern browsers (Chrome 20+, Safari 14.1+)
- **Fallback**: No polyfill needed (graceful degradation to text input)
- **localStorage**: Check availability with try/catch

### Performance
- **Debouncing**: Consider debouncing input events for preview updates (not required for MVP)
- **Lazy loading**: Icons rendered via `lucide.createIcons()` after DOM updates
- **Scroll performance**: Use `scrollIntoView({ behavior: 'smooth' })` sparingly

---

## Success Metrics

### Quantitative Metrics
1. **Adoption Rate**: 80%+ of users with education in resume see it auto-populated
2. **Manual Adds**: 60%+ of users without education add at least one entry
3. **Completion Rate**: 90%+ of education modal opens result in saved entry (not cancelled)
4. **Error Rate**: < 5% of users encounter validation errors
5. **Data Persistence**: 99%+ of education entries successfully saved to backend

### Qualitative Metrics
1. **User Feedback**: Positive feedback on education section discoverability
2. **Support Tickets**: Reduction in "can't add education" support requests
3. **User Testing**: 9/10 users successfully add education without assistance
4. **Consistency**: Design pattern matches Certifications section perfectly

### Technical Metrics
1. **Page Load Time**: No measurable impact (< 50ms increase)
2. **Preview Update Time**: < 100ms from input to preview render
3. **localStorage Size**: < 50KB per user session
4. **Mobile Performance**: 60fps animations on mid-range devices

---

## Open Questions

1. **Q: Should the Education section have a collapse/expand state saved to localStorage?**
   - A: Yes, match the behavior of other sections (save expanded state)

2. **Q: Should we validate date ranges (start before end)?**
   - A: No for MVP, can add later as enhancement

3. **Q: Should GPA have a separate field in the entry display or stay merged in notes?**
   - A: Per provided code, merge into notes with bullet separator

4. **Q: Should we support "Expected" graduation dates like the parser does?**
   - A: No special handling needed - user can type "Expected" in notes

5. **Q: Should clicking outside the entry fields save changes automatically?**
   - A: Yes, auto-save on input (no explicit save button for inline edits)

6. **Q: Should we limit the number of education entries?**
   - A: No limit for MVP (typically users have 1-3 entries)

7. **Q: Should we provide a "Duplicate" button like the provided code suggests?**
   - A: Optional - include if implementation time allows, otherwise defer

8. **Q: How should we handle very long notes (> 500 characters)?**
   - A: No truncation needed - textarea will expand, preview will show full text

9. **Q: Should the section toggle (chevron) be animated?**
   - A: Yes, use `transition-transform` on chevron rotation

10. **Q: Should we use the exact same modal close behavior as Certifications?**
    - A: Yes, for consistency: ESC key, outside click, close button all close modal

---

## Implementation Notes

### Phase 1: Core Functionality (MVP)
1. Add Education section HTML structure to optimizer component
2. Implement "Add education" modal with all form fields
3. Implement validation (required Institution field)
4. Implement education entry creation and display
5. Implement Remove functionality
6. Implement include/exclude checkbox
7. Implement localStorage persistence

### Phase 2: Preview Integration
1. Create `renderEducationPreview()` function
2. Hook into `window.buildPreview()`
3. Format dates (MMM YYYY)
4. Show only included entries

### Phase 3: Auto-Population
1. Parse education from resume markdown
2. Extract all education fields
3. Populate entries on component mount
4. Handle missing/empty education gracefully

### Phase 4: Polish
1. Add smooth scroll animations
2. Verify responsive design on all breakpoints
3. Test keyboard navigation
4. Test screen reader compatibility
5. Add Lucide icon rendering

### Testing Checklist
- [ ] Modal opens and closes correctly
- [ ] Required field validation works
- [ ] Education entries display correctly
- [ ] Inline editing updates preview
- [ ] Include/exclude toggle works
- [ ] Remove button deletes entry
- [ ] localStorage saves and loads data
- [ ] Preview shows formatted education
- [ ] Responsive design works on mobile
- [ ] Icons render correctly
- [ ] Multiple entries can be added
- [ ] Parsed education auto-populates
- [ ] GPA merges into notes correctly
- [ ] Dates format as MMM YYYY in preview
- [ ] Keyboard navigation works (Tab, ESC)

---

## Dependencies

- **PRD-0001**: Resume parser must support education parsing (already implemented)
- **Lucide Icons**: Icon library must be loaded on page
- **Tailwind CSS v4**: For styling classes
- **localStorage API**: For data persistence
- **Optimizer Component**: Must identify correct file to modify

---

## Timeline Estimate

- **Design Review**: 0.5 hours (verify HTML/CSS matches design system)
- **Core Implementation**: 3-4 hours (modal, entries, validation)
- **Preview Integration**: 1-2 hours (rendering, formatting)
- **Auto-Population**: 1 hour (parser integration)
- **Testing & Polish**: 2-3 hours (responsive, accessibility, edge cases)
- **Total**: 7.5-10.5 hours

---

## Approval

**Product Owner**: _____________________
**Engineering Lead**: _____________________
**Designer**: _____________________
**Date**: _____________________

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Status**: Draft - Pending Review
