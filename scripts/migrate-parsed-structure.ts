import { sql } from "../lib/db"
import fs from "fs"
import path from "path"

async function runMigration() {
    try {
        console.log("Reading migration file...")
        const migrationPath = path.join(process.cwd(), "scripts", "add_parsed_structure_column.sql")
        const sqlContent = fs.readFileSync(migrationPath, "utf-8")

        console.log("Executing migration...")
        // Split by semicolons to handle multiple statements if needed, 
        // but neon driver might handle it or we can just run the whole thing if it supports it.
        // simpler to just run the statements hardcoded here for safety or use the file content.

        // The file content is:
        // ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_structure JSONB;
        // ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE;
        // CREATE INDEX IF NOT EXISTS idx_resumes_parsed_at ON resumes(parsed_at);

        await sql`ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_structure JSONB`
        console.log("- Added parsed_structure column")

        await sql`ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE`
        console.log("- Added parsed_at column")

        await sql`CREATE INDEX IF NOT EXISTS idx_resumes_parsed_at ON resumes(parsed_at)`
        console.log("- Added index on parsed_at")

        console.log("Migration completed successfully.")
    } catch (error) {
        console.error("Migration failed:", error)
        process.exit(1)
    }
}

runMigration()
