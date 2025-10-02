#!/usr/bin/env python3
"""
Migration script to create resume_health_checks table
Run with: python scripts/migrations/run_health_check_migration.py
"""

import os
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from dotenv import load_dotenv
    # Load environment from .env.local if present
    if os.path.exists('.env.local'):
        load_dotenv('.env.local')
except Exception:
    # dotenv is optional; continue if not installed
    pass

def run_health_check_migration():
    """Create resume_health_checks table for ATS Health Checker feature"""

    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')

    if not database_url:
        print("❌ DATABASE_URL environment variable not found. Set it or create .env.local with DATABASE_URL=postgres://...")
        return False

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        print("🔗 Connected to database successfully")
        print("\n📊 Running resume_health_checks migration...")

        # Create resume_health_checks table
        print("  1. Creating resume_health_checks table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS resume_health_checks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                file_size INTEGER NOT NULL,
                file_hash VARCHAR(64),
                analysis_result JSONB,
                status VARCHAR(32) DEFAULT 'pending',
                processing_error TEXT,
                email_sent_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)

        # Create indexes for performance optimization
        print("  2. Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resume_health_checks_email ON resume_health_checks(email)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resume_health_checks_file_hash ON resume_health_checks(file_hash)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resume_health_checks_status ON resume_health_checks(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resume_health_checks_created_at ON resume_health_checks(created_at)")

        # Add table and column comments
        print("  3. Adding documentation comments...")
        cursor.execute("COMMENT ON TABLE resume_health_checks IS 'Stores public ATS health check submissions without authentication requirement'")
        cursor.execute("COMMENT ON COLUMN resume_health_checks.file_hash IS 'SHA-256 hash for deduplication and caching'")
        cursor.execute("COMMENT ON COLUMN resume_health_checks.analysis_result IS 'JSON structure containing ATS analysis results'")
        cursor.execute("COMMENT ON COLUMN resume_health_checks.status IS 'Status: pending, processing, completed, or failed'")

        # Create update trigger for updated_at column
        print("  4. Creating update trigger...")
        cursor.execute("""
            DROP TRIGGER IF EXISTS update_resume_health_checks_updated_at ON resume_health_checks;
            CREATE TRIGGER update_resume_health_checks_updated_at
                BEFORE UPDATE ON resume_health_checks
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        """)

        # Commit all changes
        conn.commit()
        print("\n✅ Migration completed successfully!")

        # Verify the table was created
        print("\n🔍 Verifying migration...")
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'resume_health_checks'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()

        print(f"✅ resume_health_checks table created with {len(columns)} columns:")
        for col in columns:
            data_type = col['data_type']
            if col['character_maximum_length']:
                data_type += f"({col['character_maximum_length']})"
            print(f"  - {col['column_name']}: {data_type}")

        cursor.close()
        conn.close()
        print("\n🎉 resume_health_checks table is ready for use!")
        return True

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    success = run_health_check_migration()
    if not success:
        exit(1)
