---
name: Processing Overlay UX
overview: Build a reusable full-screen processing overlay component with step-based progress, animations, and blocking interaction, then integrate it across all background process flows in the application.
todos:
  - id: phase1-component
    content: "[Phase 1] Create ProcessingOverlay component with steps, progress, and animations"
    status: completed
  - id: phase1-css
    content: "[Phase 1] Add CSS keyframe animations for pulse, gradient border, progress"
    status: completed
    dependencies:
      - phase1-component
  - id: phase2-upload
    content: "[Phase 2] Integrate overlay into upload-resume-dialog.tsx"
    status: completed
  - id: phase2-master
    content: "[Phase 2] Integrate overlay into master-resume-dialog.tsx"
    status: completed
  - id: phase3-quickform
    content: "[Phase 3] Integrate overlay into QuickOptimizeForm extraction flow"
    status: completed
  - id: phase3-review
    content: "[Phase 3] Integrate overlay into ReviewContentDialog optimization flow"
    status: completed
  - id: phase4-polish
    content: "[Phase 4] Add escape handling, timeout, error states, mobile, a11y"
    status: completed
---

# Processing Overlay UX System

## Summary

Create a polished, full-screen overlay system that communicates background process status to users while preventing navigation/interaction. The design will feature:

- Step-based progress indicator with animated transitions
- Subtle pulse/gradient animations  
- Process-specific messaging
- Blocking overlay to prevent accidental navigation

---

## Phase 1: Core Component Design and Implementation

Build the reusable `ProcessingOverlay` component with all visual elements.**Key Files:**

- Create [`components/ui/processing-overlay.tsx`](components/ui/processing-overlay.tsx) - main overlay component
- Update [`app/globals.css`](app/globals.css) - add keyframe animations

**Component API:**

```tsx
interface ProcessingOverlayProps {
  isOpen: boolean
  title: string
  steps: { label: string; status: 'pending' | 'active' | 'completed' }[]
  currentStepIndex: number
  progress?: number // 0-100, optional for determinate progress
  icon?: React.ReactNode
}
```

**Visual Design:**

- Full viewport overlay with `fixed inset-0 z-50`
- Semi-transparent backdrop with blur (`bg-background/80 backdrop-blur-sm`)
- Centered card with gradient border animation
- Step list with checkmarks, spinners, and pending states
- Animated progress bar
- Pulsing icon/logo at top

---

## Phase 2: Upload Flow Integration

Integrate overlay into both resume upload dialogs.**Files to modify:**

- [`components/dashboard/upload-resume-dialog.tsx`](components/dashboard/upload-resume-dialog.tsx)
- [`components/dashboard/master-resume-dialog.tsx`](components/dashboard/master-resume-dialog.tsx)

**Steps to show:**

1. Uploading file
2. Processing document
3. Extracting content
4. Finishing up

---

## Phase 3: Optimization Flow Integration

Integrate overlay into the optimization workflow.**Files to modify:**

- [`components/dashboard/QuickOptimizeForm.tsx`](components/dashboard/QuickOptimizeForm.tsx)
- [`components/optimization/ReviewContentDialog.tsx`](components/optimization/ReviewContentDialog.tsx)

**Steps for extraction (QuickOptimizeForm):**

1. Reading your resume
2. Extracting work experience
3. Preparing review

**Steps for optimization (ReviewContentDialog):**

1. Analyzing job requirements
2. Optimizing content
3. Calculating match score
4. Finalizing resume

---

## Phase 4: Polish and Edge Cases

- Add escape-to-cancel support with confirmation
- Add timeout handling with retry option
- Add error state display within overlay
- Ensure mobile responsiveness
- Add reduced-motion support for accessibility

---

## Architecture

```mermaid
flowchart TD
    subgraph OverlayComponent [ProcessingOverlay Component]
        Portal[React Portal to body]
        Backdrop[Blocking Backdrop]
        Card[Centered Content Card]
        Steps[Step Indicator List]
        Progress[Animated Progress Bar]
    end

    subgraph Consumers [Consumer Components]
        Upload[Upload Resume Dialog]
        Master[Master Resume Dialog]
        Quick[QuickOptimizeForm]
        Review[ReviewContentDialog]
    end

    Upload --> OverlayComponent
    Master --> OverlayComponent
    Quick --> OverlayComponent
    Review --> OverlayComponent


```