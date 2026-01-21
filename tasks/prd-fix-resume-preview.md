# PRD: Fix Resume Preview Feature

## 1. Introduction/Overview

The resume preview feature allows users to view their uploaded resumes by clicking the eye icon in the dashboard. Currently, when users click the preview button, they see the error message "Could not load document preview. Please try downloading instead." This occurs for all file types (PDF, DOCX, DOC) and affects both newly uploaded and older resumes.

The download functionality works correctly, indicating the files are properly stored but the preview mechanism is failing. This fix will restore preview functionality and improve the overall preview experience for all supported file types.

## 2. Goals

- Restore working preview functionality for PDF files
- Add preview support for DOCX and DOC files (currently only PDFs are viewable in iframe)
- Improve error handling with more specific error messages
- Ensure consistent preview experience across all supported file types
- Maintain security by using time-limited signed URLs

## 3. User Stories

### US-001: Debug and Fix Signed URL Generation
**Description:** As a developer, I want to identify and fix the root cause of the signed URL generation failure so that preview requests succeed.

**Acceptance Criteria:**
- [ ] Add logging to `/api/resumes/[id]/view/route.ts` to identify failure point
- [ ] Verify Supabase storage connection and credentials are correct
- [ ] Verify the storage key retrieval from `source_metadata` works correctly
- [ ] Test signed URL generation with a known working file
- [ ] API returns valid signed URL with 200 status
- [ ] npm run lint passes
- [ ] npm run build passes

---

### US-002: Fix PDF Preview in Dialog
**Description:** As a user, I want to preview my uploaded PDF resumes so that I can verify the content without downloading.

**Acceptance Criteria:**
- [ ] Clicking eye icon on a PDF resume opens preview dialog
- [ ] PDF displays correctly in the iframe viewer
- [ ] Loading state shows while fetching signed URL
- [ ] Dialog can be closed without errors
- [ ] npm run lint passes
- [ ] npm run build passes
- [ ] **Verify in browser manually**: Upload a PDF and click eye icon to preview

---

### US-003: Add Preview Support for DOCX/DOC Files
**Description:** As a user, I want to preview my uploaded Word documents so that I have the same experience as PDF files.

**Acceptance Criteria:**
- [ ] DOCX files display a preview (either rendered HTML or embedded viewer)
- [ ] DOC files display a preview or show appropriate message with download option
- [ ] File type is correctly detected and appropriate viewer is used
- [ ] npm run lint passes
- [ ] npm run build passes
- [ ] **Verify in browser manually**: Upload a DOCX file and click eye icon to preview

---

### US-004: Improve Error Handling and User Feedback
**Description:** As a user, I want to see specific error messages when preview fails so that I understand what went wrong.

**Acceptance Criteria:**
- [ ] Error messages are specific (e.g., "File not found", "Preview expired", "Unsupported format")
- [ ] Users can still download the file when preview fails
- [ ] Error state clears when dialog is closed and reopened
- [ ] Console logs useful debugging information for developers
- [ ] npm run lint passes
- [ ] npm run build passes
- [ ] **Verify in browser manually**: Test error states display correctly

---

### US-005: Add Fallback for Unsupported Preview Formats
**Description:** As a user, I want to see a helpful message when my file format cannot be previewed so that I know to use the download option.

**Acceptance Criteria:**
- [ ] Non-previewable formats show a clear message explaining preview is unavailable
- [ ] Download button is prominently displayed as the alternative
- [ ] File icon or thumbnail is shown instead of broken preview
- [ ] npm run lint passes
- [ ] npm run build passes
- [ ] **Verify in browser manually**: Test with a DOC file if DOCX preview is implemented but DOC is not

## 4. Functional Requirements

**FR-1:** The system must generate valid signed URLs for stored resume files via the `/api/resumes/[id]/view` endpoint.

**FR-2:** The system must verify user ownership of the resume before generating a signed URL.

**FR-3:** The system must display PDF files in an iframe when the signed URL is successfully retrieved.

**FR-4:** The system must provide an alternative preview method for DOCX files (either convert to HTML, use Google Docs viewer, or Microsoft Office Online viewer).

**FR-5:** The system must display a loading indicator while fetching the signed URL.

**FR-6:** The system must display specific error messages based on the failure type:
- "File not found" - when the file doesn't exist in storage
- "Preview link expired" - when the signed URL has expired
- "Unable to preview this file type" - for unsupported formats
- "Something went wrong" - for unexpected errors

**FR-7:** The system must always provide a working download option as a fallback when preview fails.

**FR-8:** The system must handle the case where `source_metadata` is missing or malformed by falling back to parsing the `file_url`.

## 5. Non-Goals (Out of Scope)

- Converting DOCX/DOC to PDF on the server
- Adding annotation or editing capabilities to the preview
- Supporting additional file formats beyond PDF, DOCX, and DOC
- Implementing a custom PDF renderer (will use browser's native PDF viewer or iframe)
- Adding thumbnail generation for the resume list view
- Mobile-specific preview optimizations

## 6. Design Considerations

### UI Components to Modify
- [master-resume-preview-dialog.tsx](components/dashboard/master-resume-preview-dialog.tsx) - Main preview dialog

### Preview Strategies by File Type
| File Type | Preview Method |
|-----------|----------------|
| PDF | Native iframe with signed URL |
| DOCX | Google Docs Viewer or Office Online embed |
| DOC | Same as DOCX, or fallback to download-only |

### Error States UI
- Loading: Spinner with "Loading preview..." text
- Error: Red alert icon with specific message + Download button
- Unsupported: Info icon with explanation + Download button

## 7. Technical Considerations

### Files to Investigate/Modify
1. [app/api/resumes/[id]/view/route.ts](app/api/resumes/[id]/view/route.ts) - Signed URL generation endpoint
2. [components/dashboard/master-resume-preview-dialog.tsx](components/dashboard/master-resume-preview-dialog.tsx) - Preview dialog component
3. [lib/storage.ts](lib/storage.ts) - Storage utility functions (if exists)

### Potential Root Causes to Check
1. **Supabase storage bucket permissions** - Bucket may not allow signed URL generation
2. **Storage key format** - Key stored in `source_metadata` may not match actual file path
3. **CORS configuration** - Signed URLs may be blocked by CORS when loaded in iframe
4. **Environment variables** - Missing or incorrect Supabase credentials

### DOCX Preview Options
1. **Google Docs Viewer**: `https://docs.google.com/viewer?url={encodedUrl}&embedded=true`
   - Pros: Free, reliable, handles most formats
   - Cons: Requires public URL or may have rate limits

2. **Microsoft Office Online**: `https://view.officeapps.live.com/op/embed.aspx?src={encodedUrl}`
   - Pros: Best fidelity for Office documents
   - Cons: Requires publicly accessible URL

3. **Convert to HTML server-side**: Use mammoth.js or similar
   - Pros: Works with signed URLs, no external dependency
   - Cons: Formatting may not be perfect

### Security Notes
- Signed URLs should remain time-limited (5 minutes is appropriate)
- User ownership must be verified before generating URLs
- External viewers (Google/Microsoft) require public URLs - consider implications

## 8. Success Metrics

- **Preview Success Rate**: 95%+ of preview attempts successfully display the document
- **Error Clarity**: Users understand why preview failed (measured by reduced support tickets)
- **Feature Completeness**: All three file types (PDF, DOCX, DOC) have a working preview or clear fallback
- **Performance**: Preview loads within 3 seconds for average file sizes

## 9. Open Questions

1. **DOCX Preview Approach**: Should we use Google Docs Viewer, Microsoft Office Online, or server-side conversion? Each has trade-offs around privacy, reliability, and formatting fidelity.

2. **Public URL Requirement**: External viewers require public URLs. Should we generate temporary public URLs, or implement server-side rendering instead?

3. **DOC File Support**: Legacy .doc files may have limited viewer support. Is it acceptable to show download-only for these?

4. **Caching**: Should we cache signed URLs client-side to avoid regenerating on every preview open? (Would need to handle expiration)
