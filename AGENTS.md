# Repository Guidelines

## Project Structure & Module Organization
This Next.js 14 App Router project keeps routed UI and API handlers under `app/`, reusing composable React pieces from `components/`. Shared TypeScript utilities live in `lib/` and reusable types in `types/`. Visual assets (logos, mock screenshots, fonts) live in `public/`, while `styles/globals.css` holds the Tailwind layer imports and design tokens. Database SQL and helper scripts sit in `scripts/`; run them from the project root so relative paths resolve correctly.

## Build, Test, and Development Commands
Use `npm install` to stay aligned with the committed `package-lock.json`. Run `npm run dev` for the local development server, `npm run build` to produce an optimized production bundle, and `npm run start` to verify the built output. Execute `npm run lint` before pushing to catch ESLint and TypeScript issues surfaced by `next lint`.

## Coding Style & Naming Conventions
Code is TypeScript-first, with React components and route handlers using PascalCase filenames (for example, `ResumeBuilder.tsx`) and hooks/utilities in camelCase (`useResumeForm`, `formatDate`). Keep indentation at two spaces, prefer functional components, and colocate Tailwind classes near the JSX they affect. Group Tailwind utility classes logically (layout → spacing → color) to ease diffs, and lean on `clsx` or `class-variance-authority` when conditions appear.

## Testing Guidelines
Automated tests are not yet configured, so document manual verification steps in every pull request (affected route, expected behaviour, screenshots or gifs). When introducing tests, coordinate with maintainers and place them under a `tests/` directory using the pattern `*.test.ts(x)` so future tooling can discover them consistently.

## Commit & Pull Request Guidelines
Follow conventional commit prefixes already in the history (`fix:`, `feat:`, `chore:`) with concise, imperative summaries. Keep pull requests focused, link the relevant Linear/Jira/GitHub issue, and include before/after visuals for UI changes. Describe database impacts explicitly when touching items in `scripts/` and list required environment variables so reviewers can reproduce the setup.

## Environment & Configuration Tips
Copy `.env.local` from the secure secrets store rather than committing new values. Database migrations rely on `scripts/setup-database.py` and `scripts/run-migration.py`; ensure `DATABASE_URL` and Clerk API keys are present before running them. Always restart `npm run dev` after editing Clerk or auth configuration to avoid stale provider state.
