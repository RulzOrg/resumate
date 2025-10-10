# Task List: Add Education Section to Resume Optimizer UI

**PRD**: [0002-prd-add-education-section-to-optimizer.md](../prds/0002-prd-add-education-section-to-optimizer.md)

**Status**: Ready for Implementation

---

## Relevant Files

### Primary Implementation
- `components/optimization/optimizer-ui-only.tsx` - Main optimizer component where Education section will be added (1177 lines)

### Related Files (for reference)
- `components/optimization/structured-resume-editor.tsx` - Contains education parser logic (already implemented in PRD-0001)
- `lib/db.ts` - Database functions for resume data persistence
- `app/api/resumes/optimized/[id]/route.ts` - API endpoint for saving optimized resume data

### Notes
- No new files need to be created - all changes are in `optimizer-ui-only.tsx`
- Education parser already exists in `structured-resume-editor.tsx` and can be referenced
- localStorage key: `resume-education-data` (stores both education and certifications)

---

## Tasks

- [ ] **1.0 Add Education Section Structure**
  - [ ] 1.1 Locate the insertion point in `optimizer-ui-only.tsx` (between Work Experience and Skills sections)
  - [ ] 1.2 Add Education section container with collapsible structure (`.bg-neutral-900/50 border-neutral-800 border rounded-2xl`)
  - [ ] 1.3 Add section header with chevron icon and "Education" heading
  - [ ] 1.4 Add `#education-list` container div for education entries
  - [ ] 1.5 Add "Add education" button with plus icon and proper styling
  - [ ] 1.6 Add Certifications subsection below education list (reference provided HTML)
  - [ ] 1.7 Add section collapse/expand toggle handler (attach to chevron button)
  - [ ] 1.8 Verify section renders with correct spacing and borders

- [ ] **2.0 Implement Education Modal**
  - [ ] 2.1 Create `buildModal()` function that returns education modal HTML structure
  - [ ] 2.2 Add modal overlay with backdrop blur (`fixed inset-0 z-40 bg-neutral-950/40 backdrop-blur`)
  - [ ] 2.3 Add modal container (`max-w-3xl rounded-2xl border-neutral-800 bg-neutral-900`)
  - [ ] 2.4 Add modal header with "Add Education" title and close button (X icon)
  - [ ] 2.5 Add modal body with form fields in grid layout:
    - Institution (required) - full width
    - Location and GPA - two column grid
    - Degree and Field - two column grid
    - Start Date and End Date - two column grid (type="month")
    - Additional Information - textarea (4 rows)
  - [ ] 2.6 Add modal footer with Cancel and Save buttons
  - [ ] 2.7 Implement `openModal()` function that appends modal to body and renders icons
  - [ ] 2.8 Implement `closeModal()` function that removes modal from DOM
  - [ ] 2.9 Add ESC key handler to close modal
  - [ ] 2.10 Add click-outside-overlay handler to close modal
  - [ ] 2.11 Add auto-focus on Institution field when modal opens
  - [ ] 2.12 Bind "Add education" button click to `openModal()`

- [ ] **3.0 Implement Education Entry Management**
  - [ ] 3.1 Create `insertEducationItem(data)` function that creates education entry HTML
  - [ ] 3.2 Add education entry container with border and padding
  - [ ] 3.3 Add include/exclude checkbox with green checkmark styling
  - [ ] 3.4 Add institution field (full-width editable input)
  - [ ] 3.5 Add degree and field inputs (two-column grid)
  - [ ] 3.6 Add start date, end date, and location inputs (three-column grid)
  - [ ] 3.7 Add notes textarea (3 rows, auto-expanding)
  - [ ] 3.8 Add "Remove" button with trash icon
  - [ ] 3.9 Implement modal validation (Institution field required)
  - [ ] 3.10 Add red ring styling (`ring-2 ring-red-500/60`) for validation errors
  - [ ] 3.11 Implement Save button handler to validate and call `insertEducationItem()`
  - [ ] 3.12 Merge GPA into notes with bullet separator: `notes + ' • GPA: ' + gpa`
  - [ ] 3.13 Add smooth scroll to new entry after insertion
  - [ ] 3.14 Bind Remove button to delete entry from DOM and localStorage
  - [ ] 3.15 Add input event listeners to all fields for auto-save

- [ ] **4.0 Integrate with Preview System**
  - [ ] 4.1 Create `getEducationData()` function to extract all education entries from DOM
  - [ ] 4.2 Create `renderEducationPreview()` function to build preview HTML
  - [ ] 4.3 Add preview section with ID `education-preview`
  - [ ] 4.4 Add "Education" heading in preview (text-sm font-medium text-neutral-300)
  - [ ] 4.5 Format each education entry in preview:
    - Institution name (font-medium)
    - Degree and Field separated by bullet (text-neutral-300)
    - Dates and Location (text-xs text-neutral-500)
    - Notes paragraph (text-sm text-neutral-200)
  - [ ] 4.6 Implement `formatMonth()` helper to convert "YYYY-MM" to "MMM YYYY"
  - [ ] 4.7 Filter preview to only show entries where `include === true`
  - [ ] 4.8 Hook `renderEducationPreview()` into existing `window.buildPreview()` function
  - [ ] 4.9 Add event listeners to trigger preview update on:
    - Education field input
    - Include/exclude checkbox change
    - Education entry removal
    - New education added
  - [ ] 4.10 Verify preview updates in real-time without page refresh

- [ ] **5.0 Add Auto-Population from Parsed Resume**
  - [ ] 5.1 Create `hydrateFromStorage()` function to load education from localStorage
  - [ ] 5.2 Implement localStorage save/load with key `resume-education-data`
  - [ ] 5.3 Add `saveAll()` function to persist education and certifications to localStorage
  - [ ] 5.4 Add `loadAll()` function to retrieve data from localStorage on mount
  - [ ] 5.5 Parse existing education entries from resume markdown (if optimizer receives optimized content)
  - [ ] 5.6 Extract education fields from markdown:
    - Institution from heading
    - Degree and Field from text
    - Dates (handle multiple formats: "YYYY-MM", "Month YYYY", "YYYY")
    - Location from metadata
    - GPA from text patterns
    - Notes from bullet points
  - [ ] 5.7 Call `insertEducationItem()` for each parsed education entry
  - [ ] 5.8 Handle empty education gracefully (show empty section with "Add education" button)
  - [ ] 5.9 Add unique ID generation using `Date.now()` for each entry
  - [ ] 5.10 Call `hydrateFromStorage()` on component mount

- [ ] **6.0 Testing and Polish**
  - [ ] 6.1 Test modal open/close with all methods (ESC, X button, click outside)
  - [ ] 6.2 Test required field validation (Institution must be filled)
  - [ ] 6.3 Test education entry creation with all fields populated
  - [ ] 6.4 Test education entry creation with minimal fields (Institution only)
  - [ ] 6.5 Test inline editing of all fields
  - [ ] 6.6 Test include/exclude checkbox toggle
  - [ ] 6.7 Test Remove button functionality
  - [ ] 6.8 Test preview updates after each change
  - [ ] 6.9 Test localStorage persistence (add entry, refresh page, verify data restored)
  - [ ] 6.10 Test multiple education entries (add 3+, verify order, edit each)
  - [ ] 6.11 Verify responsive design on mobile (< 640px):
    - Modal is scrollable
    - Field grids collapse to single column
    - Buttons are accessible
  - [ ] 6.12 Verify responsive design on desktop (≥ 640px):
    - Grid layouts display correctly (2-col, 3-col)
    - Modal width is max-w-3xl
  - [ ] 6.13 Test keyboard navigation:
    - Tab through all form fields
    - ESC closes modal
    - Enter in Institution field doesn't submit
  - [ ] 6.14 Test accessibility:
    - Screen reader announces field labels
    - Focus visible on all interactive elements
    - Color contrast meets WCAG AA
  - [ ] 6.15 Verify Lucide icons render correctly (lucide.createIcons())
  - [ ] 6.16 Test section collapse/expand animation
  - [ ] 6.17 Test smooth scroll to new entry
  - [ ] 6.18 Test date formatting in preview (MMM YYYY)
  - [ ] 6.19 Test GPA merge into notes with bullet separator
  - [ ] 6.20 Verify no console errors or warnings
  - [ ] 6.21 Test with existing certifications section (ensure both work together)
  - [ ] 6.22 Test auto-population from parsed resume with sample education data
  - [ ] 6.23 Run TypeScript compilation: `npx tsc --noEmit`
  - [ ] 6.24 Test in production build: `npm run build`

---

## Implementation Order

**Critical Path** (must be completed in order):
1. Task 1.0 → Task 2.0 → Task 3.0 → Task 4.0 → Task 5.0 → Task 6.0

**Parallel Work** (can be done simultaneously):
- Tasks 1.1-1.8 can be done together
- Tasks 2.1-2.6 (modal structure) can be done before 2.7-2.12 (modal interactions)
- Tasks 3.1-3.8 (entry HTML) can be done before 3.9-3.15 (entry interactions)
- Tasks 4.1-4.7 (preview logic) can be done independently, then integrated in 4.8-4.10

---

## Estimated Time

- **Task 1.0**: 1-1.5 hours (Section structure)
- **Task 2.0**: 2-3 hours (Modal implementation)
- **Task 3.0**: 2-3 hours (Entry management)
- **Task 4.0**: 1.5-2 hours (Preview integration)
- **Task 5.0**: 1-1.5 hours (Auto-population)
- **Task 6.0**: 2-3 hours (Testing and polish)

**Total**: 9.5-13 hours

---

## Success Criteria

- [ ] Education section visible in optimizer UI between Work Experience and Skills
- [ ] "Add education" button opens modal with all form fields
- [ ] Modal validates Institution field (required)
- [ ] Education entries display with all fields editable inline
- [ ] Include/exclude checkbox toggles entry in preview
- [ ] Remove button deletes entries
- [ ] Preview updates in real-time showing formatted education
- [ ] Data persists to localStorage and survives page refresh
- [ ] Auto-populates from parsed resume markdown
- [ ] Responsive design works on mobile and desktop
- [ ] Keyboard navigation and accessibility compliant
- [ ] No TypeScript errors or build failures
- [ ] Certifications section continues to work (no regressions)

---

## Testing Checklist

### Functional Testing
- [ ] Modal opens via "Add education" button
- [ ] Modal closes via ESC, X button, click outside
- [ ] Institution field validation works (shows red ring if empty)
- [ ] Save button creates new education entry
- [ ] All form fields (8 total) populate entry correctly
- [ ] GPA merges into notes with " • GPA: " separator
- [ ] Inline editing updates values
- [ ] Include/exclude checkbox toggles correctly
- [ ] Remove button deletes entry
- [ ] Preview shows only included entries
- [ ] Preview formats dates as "MMM YYYY"
- [ ] Preview shows all education fields correctly
- [ ] localStorage saves data on every change
- [ ] Page refresh restores all education entries

### Responsive Testing
- [ ] Mobile: Modal is scrollable
- [ ] Mobile: Grids collapse to single column
- [ ] Desktop: Grids display as 2-col and 3-col
- [ ] Desktop: Modal is max-w-3xl
- [ ] Smooth scroll works on both mobile and desktop

### Accessibility Testing
- [ ] All form fields have proper labels
- [ ] Tab navigation works through all fields
- [ ] Focus visible on all interactive elements
- [ ] Screen reader announces field labels
- [ ] Color contrast meets WCAG AA (use contrast checker)

### Integration Testing
- [ ] Certifications section still works
- [ ] Preview system shows both education and certifications
- [ ] localStorage stores both education and certifications
- [ ] Section collapse/expand works independently

### Browser Testing
- [ ] Chrome/Edge (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Notes for Implementation

### Code Style
- Match existing optimizer-ui-only.tsx patterns
- Use inline `<script>` tags with IIFEs: `(function() { ... })()`
- Use `document.getElementById()` and `document.querySelector()`
- No React state for education (DOM-based approach)

### Data Structure
```javascript
{
  education: [
    {
      id: "edu-1234567890",
      include: true,
      institution: "Columbia University",
      location: "New York, NY",
      degree: "Bachelor of Science",
      field: "Computer Science",
      start: "2016-09",
      end: "2020-05",
      notes: "Dean's List • GPA: 3.8/4.0"
    }
  ],
  certifications: [ ... ]
}
```

### Month Input Format
- Input type: `<input type="month">`
- Value format: "YYYY-MM" (e.g., "2020-05")
- Display format: "MMM YYYY" (e.g., "May 2020")
- Use helper: `formatMonth(val)` for preview

### Validation Pattern
```javascript
const inst = modal.querySelector('input[data-field="institution"]');
inst.classList.remove('ring-2', 'ring-red-500/60');
if (!vals.institution) {
  inst.classList.add('ring-2', 'ring-red-500/60');
  inst.focus();
  return;
}
```

### Preview Update Pattern
```javascript
function updatePreview() {
  saveAll();
  try {
    if (window.buildPreview) window.buildPreview();
  } catch(e) {}
}
```

---

## Dependencies

- **PRD-0001**: Education parser in structured-resume-editor.tsx (already complete)
- **Lucide Icons**: Must be available on page (`window.lucide.createIcons()`)
- **localStorage API**: Browser support (all modern browsers)
- **window.buildPreview()**: Existing preview function in optimizer component

---

## Risk Mitigation

**Risk**: Modal conflicts with existing modals (certifications)
- **Mitigation**: Use unique IDs (`modal-add-education` vs `modal-add-certification`)

**Risk**: localStorage quota exceeded
- **Mitigation**: Implement try/catch around localStorage operations

**Risk**: Date input not supported in all browsers
- **Mitigation**: Graceful degradation to text input (browser handles this automatically)

**Risk**: Performance issues with many education entries
- **Mitigation**: No issue expected (typical users have 1-3 entries)

**Risk**: Preview update causes lag
- **Mitigation**: Already handled by existing buildPreview() debouncing

---

## Post-Implementation

After completing all tasks:
1. Create PR with title: "feat: add Education section to optimizer UI"
2. Include before/after screenshots in PR description
3. Link to PRD-0002 in PR description
4. Request review from UI/UX team
5. Test in staging environment
6. Deploy to production

---

**Document Version**: 1.0
**Created**: 2025-10-08
**Status**: Ready for Implementation
