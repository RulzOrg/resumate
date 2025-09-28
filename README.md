## ResuMate AI

AI-powered resume optimization and job description analysis built with Next.js 14 App Router, TypeScript, Tailwind, Clerk, Neon/Postgres, and Stripe.

### Features
- **AI job analysis**: extract key requirements and score alignment
- **Resume optimization**: generate tailored versions and track versions
- **Auth**: Clerk (email/password + social providers)
- **Billing**: Stripe checkout and portal
- **Storage**: Cloudflare R2 or AWS S3 for resume files
- **Serverless-first**: API routes under `app/api/*`

### Tech Stack
- **Next.js 14** (App Router) + **React 18**
- **TypeScript**, **Tailwind CSS 4**
- **Clerk** for auth
- **Neon/Postgres** for data (`@neondatabase/serverless`)
- **Stripe** for payments
- **R2 / S3** for file storage

---

## Quick Start

1) Clone and install
```bash
git clone https://github.com/RulzOrg/resumate.git
cd resumate
npm ci
```

2) Create `.env.local`

Minimum required to boot locally:
- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**: Clerk publishable key
- **CLERK_SECRET_KEY**: Clerk secret key
- **DATABASE_URL**: Postgres connection string
- **NEXT_PUBLIC_APP_URL**: e.g. `http://localhost:3000`

Optional but used in various features:
- **CLERK_WEBHOOK_SECRET**: For Clerk webhooks
- **STRIPE_SECRET_KEY**, **STRIPE_WEBHOOK_SECRET**
- **R2_ACCOUNT_ID**, **R2_ACCESS_KEY_ID**, **R2_SECRET_ACCESS_KEY**, **R2_BUCKET_NAME**, **R2_REGION**, **R2_PUBLIC_BASE_URL**
- or **AWS_ACCESS_KEY_ID**, **AWS_SECRET_ACCESS_KEY**, **AWS_REGION**, **S3_BUCKET_NAME**, **S3_PUBLIC_BASE_URL**
- **QDRANT_URL**, **QDRANT_API_KEY**: Vector search (local dev defaults to `http://localhost:6333`)

Example `.env.local` (placeholders):
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgres://user:password@localhost:5432/resumate

# Stripe (optional to start)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Storage (pick R2 or S3)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_REGION=
R2_PUBLIC_BASE_URL=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=
S3_PUBLIC_BASE_URL=
```

3) Run the database migrations (Neon recommended)

Provide `DATABASE_URL` and then run:
```bash
python3 scripts/setup-database.py
# or
python3 scripts/run-migration.py
```

4) Start the dev server
```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Scripts
- **npm run dev**: start Next.js dev server
- **npm run build**: production build
- **npm run start**: run production build
- **npm run lint**: lint with ESLint / TypeScript
- **npm run docker:qdrant**: start local Qdrant via Docker Compose

Database scripts (under `scripts/`):
- `setup-database.py`: idempotent setup for tables/indexes/webhook-log
- `run-migration.py`: run SQL from `scripts/` files in order

---

## Storage Configuration
The app reads storage config from env vars in `lib/storage.ts` and works with either Cloudflare **R2** or **AWS S3**. Set one provider’s credentials plus `R2_BUCKET_NAME` or `S3_BUCKET_NAME`. Optionally set a CDN/public base URL via `R2_PUBLIC_BASE_URL` or `S3_PUBLIC_BASE_URL`.

---

## Deployment (Vercel)
1) Push to GitHub and import the repo in Vercel
2) Set the same environment variables in Vercel Project Settings → Environment Variables
3) This project uses **npm** (because `package-lock.json` is present). No `pnpm-lock.yaml` is used.
4) Trigger a deployment

If you see a "frozen lockfile" error related to pnpm, ensure there is no `pnpm-lock.yaml` in the repo and re-deploy.

---

## Troubleshooting
- **Authentication Configuration Error (missing Clerk publishable key)**
  - Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in `.env.local` (and Vercel)
  - Restart the dev server after changing env

- **Database connection errors**
  - Verify `DATABASE_URL` is correct and reachable
  - Run `python3 scripts/setup-database.py` to create necessary tables

- **Stripe webhook errors in dev**
  - Set `STRIPE_WEBHOOK_SECRET`
  - Use the Stripe CLI to forward events to `/api/webhooks/stripe`

- **Storage upload errors**
  - Make sure R2 or S3 credentials and bucket names are set; only one provider needs to be configured

---

## Project Structure
- `app/`: routed UI pages and API routes
- `components/`: reusable React components
- `lib/`: server-side utilities (db, auth, storage, pricing)
- `scripts/`: SQL and helper Python scripts for database setup/migrations
- `public/`: static assets
- `styles/`: Tailwind global styles
- `types/`: shared TypeScript types

---

## Requirements
- Node.js ≥ 18 (tested with Node 24)
- npm (Corepack-enabled environments are fine)

---

## License
MIT


