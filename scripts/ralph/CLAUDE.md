# Ralph Agent Instructions

You are an autonomous coding agent working on the Resumate project - an AI-powered resume optimization SaaS platform built with Next.js, TypeScript, and Prisma.

## Your Task

1. Read the PRD at `scripts/ralph/prd.json`
2. Read the progress log at `scripts/ralph/progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (see below)
7. Update CLAUDE.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `scripts/ralph/progress.txt`

## Quality Checks for Resumate

Run these commands to verify your changes:

```bash
# TypeScript type checking
npm run lint

# Build the project (catches additional errors)
npm run build

# If you modified Prisma schema
npx prisma generate
npx prisma db push --accept-data-loss  # For development only
```

**All commits must pass `npm run lint` and `npm run build`.**

## Progress Report Format

APPEND to scripts/ralph/progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "this codebase uses X for Y")
  - Gotchas encountered (e.g., "don't forget to update Z when changing W")
  - Useful context (e.g., "the evaluation panel is in component X")
---
```

The learnings section is critical - it helps future iterations avoid repeating mistakes and understand the codebase better.

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist). This section should consolidate the most important learnings:

```
## Codebase Patterns
- Use `@/` path alias for imports from the root directory
- Database queries go in lib/db.ts
- API routes use Next.js App Router in app/api/
- UI components use Shadcn/ui from components/ui/
- Use Zod for schema validation
- Prisma schema is at prisma/schema.prisma
```

Only add patterns that are **general and reusable**, not story-specific details.

## Update CLAUDE.md Files

Before committing, check if any edited files have learnings worth preserving in nearby CLAUDE.md files:

1. **Identify directories with edited files** - Look at which directories you modified
2. **Check for existing CLAUDE.md** - Look for CLAUDE.md in those directories or parent directories
3. **Add valuable learnings** - If you discovered something future developers/agents should know:
   - API patterns or conventions specific to that module
   - Gotchas or non-obvious requirements
   - Dependencies between files
   - Testing approaches for that area
   - Configuration or environment requirements

**Examples of good CLAUDE.md additions:**
- "When modifying X, also update Y to keep them in sync"
- "This module uses pattern Z for all API calls"
- "Tests require the dev server running on PORT 3000"
- "Field names must match the template exactly"

**Do NOT add:**
- Story-specific implementation details
- Temporary debugging notes
- Information already in progress.txt

Only update CLAUDE.md if you have **genuinely reusable knowledge** that would help future work in that directory.

## Project-Specific Conventions

### File Structure
- `/app/` - Next.js App Router pages and API routes
- `/components/` - React components organized by feature
- `/lib/` - Business logic, utilities, database queries
- `/prisma/` - Database schema and migrations
- `/types/` - TypeScript type definitions

### Key Technologies
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: Clerk
- **UI**: Shadcn/ui + Tailwind CSS
- **AI**: Anthropic SDK for resume optimization
- **Email**: Resend
- **Billing**: Polar

### Import Patterns
Always use the `@/` path alias:
```typescript
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
```

## Quality Requirements

- ALL commits must pass `npm run lint` and `npm run build`
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns
- Use TypeScript strict mode

## Browser Testing (If Available)

For any story that changes UI, verify it works in the browser if you have browser testing tools configured (e.g., via MCP):

1. Navigate to the relevant page
2. Verify the UI changes work as expected
3. Take a screenshot if helpful for the progress log

If no browser tools are available, note in your progress report that manual browser verification is needed.

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally (another iteration will pick up the next story).

## Important

- Work on ONE story per iteration
- Commit frequently
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting
