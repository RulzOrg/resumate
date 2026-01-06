---
name: Supabase DB + Storage Migration
overview: Migrate database from Neon PostgreSQL to Supabase PostgreSQL and storage from Cloudflare R2 to Supabase Storage, while preserving Clerk authentication and all existing frontend/business logic.
todos:
  - id: p0-1-supabase-setup
    content: "[Phase 0] Create Supabase project and configure dashboard settings"
    status: completed
  - id: p0-2-env-config
    content: "[Phase 0] Add Supabase environment variables to lib/env.ts schema"
    status: completed
  - id: p0-3-feature-flags
    content: "[Phase 0] Create lib/feature-flags.ts for USE_SUPABASE_DB/STORAGE flags"
    status: completed
  - id: p0-4-supabase-client
    content: "[Phase 0] Create lib/supabase.ts with server/client singleton pattern"
    status: completed
  - id: p1-1-schema-setup
    content: "[Phase 1] Run Prisma migration on Supabase, remove neon_auth schema refs"
    status: completed
    dependencies:
      - p0-1-supabase-setup
  - id: p1-2-db-adapter
    content: "[Phase 1] Create lib/supabase-db.ts SQL adapter matching Neon interface"
    status: completed
    dependencies:
      - p0-4-supabase-client
      - p1-1-schema-setup
  - id: p1-3-db-integration
    content: "[Phase 1] Update lib/db.ts to use feature flag for Neon vs Supabase"
    status: completed
    dependencies:
      - p1-2-db-adapter
      - p0-3-feature-flags
  - id: p1-4-data-migration
    content: "[Phase 1] Create scripts/migrate-data-to-supabase.ts for data export/import"
    status: completed
    dependencies:
      - p1-1-schema-setup
  - id: p1-5-db-switchover
    content: "[Phase 1] Enable USE_SUPABASE_DB=true, validate all queries work"
    status: completed
    dependencies:
      - p1-3-db-integration
      - p1-4-data-migration
  - id: p2-1-storage-utils
    content: "[Phase 2] Create lib/supabase-storage.ts with upload/download/signedUrl"
    status: completed
    dependencies:
      - p0-4-supabase-client
  - id: p2-2-buckets-rls
    content: "[Phase 2] Create Supabase storage buckets (resumes, exports) with RLS"
    status: completed
    dependencies:
      - p0-1-supabase-setup
  - id: p2-3-storage-integration
    content: "[Phase 2] Update lib/r2.ts and lib/storage.ts with feature flag routing"
    status: completed
    dependencies:
      - p2-1-storage-utils
      - p0-3-feature-flags
  - id: p2-4-file-migration
    content: "[Phase 2] Create scripts/migrate-files-to-supabase.ts for R2 to Supabase"
    status: completed
    dependencies:
      - p2-2-buckets-rls
  - id: p2-5-storage-switchover
    content: "[Phase 2] Enable USE_SUPABASE_STORAGE=true, validate file operations"
    status: completed
    dependencies:
      - p2-3-storage-integration
      - p2-4-file-migration
  - id: p3-1-remove-neon
    content: "[Phase 3] Remove Neon code paths from lib/db.ts, delete feature flags"
    status: completed
    dependencies:
      - p1-5-db-switchover
  - id: p3-2-remove-r2
    content: "[Phase 3] Remove R2 code paths from lib/r2.ts and lib/storage.ts"
    status: completed
    dependencies:
      - p2-5-storage-switchover
  - id: p3-3-cleanup-deps
    content: "[Phase 3] Remove @neondatabase/serverless, @aws-sdk/* from package.json"
    status: completed
    dependencies:
      - p3-1-remove-neon
      - p3-2-remove-r2
  - id: p3-4-env-cleanup
    content: "[Phase 3] Remove Neon/R2 env vars from lib/env.ts, update .env.example"
    status: completed
    dependencies:
      - p3-3-cleanup-deps
  - id: p3-5-final-testing
    content: "[Phase 3] Full E2E testing of all resume upload/optimize/export flows"
    status: completed
    dependencies:
      - p3-4-env-cleanup
---

# Supabase Database + Storage Migration Plan

## Architecture Overview

```mermaid
flowchart TB
    subgraph current [Current Architecture]
        ClerkAuth[Clerk Auth]
        NeonDB[Neon PostgreSQL]
        R2[Cloudflare R2]
    end
    
    subgraph target [Target Architecture]
        ClerkAuthNew[Clerk Auth - UNCHANGED]
        SupabaseDB[Supabase PostgreSQL]
        SupabaseStorage[Supabase Storage]
    end
    
    ClerkAuth --> ClerkAuthNew
    NeonDB --> SupabaseDB
    R2 --> SupabaseStorage
```



## Scope

| Component | Action | Files Affected ||-----------|--------|----------------|| Database | Migrate Neon → Supabase | 6 core files || Storage | Migrate R2 → Supabase Storage | 3 core files || Auth | **NO CHANGES** - Keep Clerk | 0 files || Frontend | **NO CHANGES** | 0 files |---

## Phase 0: Setup and Preparation

**Goal:** Set up Supabase infrastructure and feature flags for safe rollout.**Can be parallelized:** Yes (P0.1-P0.3 can run in parallel)

### Files to Create/Modify

- Create `lib/supabase.ts` - Supabase client singleton
- Modify `lib/env.ts` - Add Supabase env vars
- Create `lib/feature-flags.ts` - Migration feature flags

### Environment Variables to Add

```javascript
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
USE_SUPABASE_DB=false
USE_SUPABASE_STORAGE=false
```

---

## Phase 1: Database Migration

**Goal:** Migrate all database operations from Neon to Supabase PostgreSQL.**Dependency:** Phase 0 must be complete.

```mermaid
flowchart LR
    subgraph phase1 [Phase 1 Flow]
        P1_1[P1.1 Schema Setup]
        P1_2[P1.2 Create Adapter]
        P1_3[P1.3 Data Migration Script]
        P1_4[P1.4 Integration]
        P1_5[P1.5 Switchover]
    end
    
    P1_1 --> P1_2
    P1_1 --> P1_3
    P1_2 --> P1_4
    P1_3 --> P1_4
    P1_4 --> P1_5
```



### Files to Modify

- [`lib/db.ts`](lib/db.ts) - Add Supabase SQL client alongside Neon
- [`prisma/schema.prisma`](prisma/schema.prisma) - Remove `neon_auth` schema dependency
- [`lib/env.ts`](lib/env.ts) - Add Supabase database validation

### Files to Create

- `lib/supabase-db.ts` - Supabase database adapter
- `scripts/migrate-data-to-supabase.ts` - Data migration script

### Key Changes in [`lib/db.ts`](lib/db.ts)

The file currently uses Neon's template literal SQL:

```typescript
// Line 1-18: Current Neon implementation
import { neon } from "@neondatabase/serverless"
const sql = neon(databaseUrl)
```

Will be refactored to support both with feature flag:

```typescript
import { neon } from "@neondatabase/serverless"
import { createClient } from "@supabase/supabase-js"
import { getFeatureFlags } from "./feature-flags"

const sql = getFeatureFlags().USE_SUPABASE_DB 
  ? createSupabaseSQL() 
  : createNeonSQL()
```

---

## Phase 2: Storage Migration

**Goal:** Migrate file storage from Cloudflare R2 to Supabase Storage.**Dependency:** Phase 0 must be complete. Can run parallel to Phase 1.

```mermaid
flowchart LR
    subgraph phase2 [Phase 2 Flow]
        P2_1[P2.1 Create Storage Utils]
        P2_2[P2.2 Setup Buckets/RLS]
        P2_3[P2.3 File Migration Script]
        P2_4[P2.4 Integration]
        P2_5[P2.5 Switchover]
    end
    
    P2_1 --> P2_4
    P2_2 --> P2_3
    P2_3 --> P2_4
    P2_4 --> P2_5
```



### Files to Modify

- [`lib/r2.ts`](lib/r2.ts) - Add feature flag to route to Supabase
- [`lib/storage.ts`](lib/storage.ts) - Add Supabase storage client
- [`lib/env.ts`](lib/env.ts) - Make R2 vars optional when using Supabase

### Files to Create

- `lib/supabase-storage.ts` - Supabase Storage utilities
- `scripts/migrate-files-to-supabase.ts` - File migration script

### Supabase Storage Buckets to Create

| Bucket | Access | Purpose ||--------|--------|---------|| `resumes` | Private | User resume uploads || `exports` | Private | Generated DOCX/PDF files |---

## Phase 3: Integration and Cleanup

**Goal:** Validate migration, remove old code, update dependencies.**Dependency:** Phase 1 and Phase 2 complete and verified.

### Files to Modify

- [`lib/db.ts`](lib/db.ts) - Remove Neon code paths
- [`lib/r2.ts`](lib/r2.ts) - Remove R2 code paths
- [`lib/storage.ts`](lib/storage.ts) - Simplify to Supabase only
- [`lib/env.ts`](lib/env.ts) - Remove Neon/R2 env requirements
- `package.json` - Remove unused dependencies

### Dependencies to Remove

```json
{
  "@neondatabase/serverless": "remove",
  "@aws-sdk/client-s3": "remove",
  "@aws-sdk/s3-request-presigner": "remove"
}
```

---

## Parallel Execution Map

```mermaid
gantt
    title Migration Timeline
    dateFormat  YYYY-MM-DD
    section Phase_0
    P0.1_Supabase_Project_Setup    :p01, 2026-01-06, 1d
    P0.2_Environment_Config        :p02, 2026-01-06, 1d
    P0.3_Feature_Flags             :p03, 2026-01-06, 1d
    section Phase_1_DB
    P1.1_Schema_Setup              :p11, after p01, 2d
    P1.2_DB_Adapter                :p12, after p11, 3d
    P1.3_Data_Migration_Script     :p13, after p11, 2d
    P1.4_DB_Integration            :p14, after p12 p13, 2d
    P1.5_DB_Switchover             :p15, after p14, 1d
    section Phase_2_Storage
    P2.1_Storage_Utils             :p21, after p01, 2d
    P2.2_Buckets_RLS               :p22, after p01, 1d
    P2.3_File_Migration_Script     :p23, after p22, 2d
    P2.4_Storage_Integration       :p24, after p21 p23, 2d
    P2.5_Storage_Switchover        :p25, after p24, 1d
    section Phase_3_Cleanup
    P3.1_Remove_Old_Code           :p31, after p15 p25, 2d
    P3.2_Update_Dependencies       :p32, after p31, 1d
    P3.3_Final_Testing             :p33, after p32, 2d
```

---