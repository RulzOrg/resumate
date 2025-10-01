#!/usr/bin/env python3
"""
CV Generation Tables Migration Script
Runs migration 003_cv_generation_tables.sql to create cv_versions, cv_variants, and cv_changelog tables
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    from dotenv import load_dotenv
    # Load environment from .env.local if present
    if os.path.exists('.env.local'):
        load_dotenv('.env.local')
        print("✓ Loaded .env.local")
except ImportError:
    print("ℹ️  python-dotenv not installed, using system environment variables")

def run_cv_migration():
    """Run the CV generation tables migration"""

    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')

    if not database_url:
        print("❌ DATABASE_URL environment variable not found")
        print("   Set it in .env.local or export it:")
        print("   export DATABASE_URL='postgresql://...'")
        return False

    # Fix potential channel_binding issue with Neon
    if 'sslmode=require' in database_url and 'channel_binding' not in database_url:
        # Remove problematic characters and ensure proper formatting
        database_url = database_url.replace("'", "").strip()
        if not database_url.endswith('?sslmode=require'):
            database_url = database_url.rstrip('?&') + '?sslmode=require'

    # Read migration file
    migration_file = 'scripts/migrations/003_cv_generation_tables.sql'

    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False

    print(f"📄 Reading migration file: {migration_file}")

    with open(migration_file, 'r') as f:
        migration_sql = f.read()

    conn = None
    cursor = None

    try:
        # Connect to database
        print("🔗 Connecting to database...")
        conn = psycopg2.connect(database_url)
        conn.autocommit = False  # Use transactions
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        print("✓ Connected to database successfully")

        # Check if tables already exist
        print("\n📊 Checking current schema state...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('cv_versions', 'cv_variants', 'cv_changelog')
            ORDER BY table_name
        """)
        existing_tables = [row['table_name'] for row in cursor.fetchall()]

        if existing_tables:
            print(f"⚠️  Some tables already exist: {', '.join(existing_tables)}")
            print("   Migration will use CREATE TABLE IF NOT EXISTS (safe to run)")
        else:
            print("✓ No existing CV generation tables found")

        # Verify foreign key tables exist
        print("\n🔍 Verifying prerequisite tables...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('users_sync', 'job_analysis', 'resumes')
            ORDER BY table_name
        """)
        prereq_tables = [row['table_name'] for row in cursor.fetchall()]
        required_tables = ['users_sync', 'job_analysis', 'resumes']

        missing_tables = [t for t in required_tables if t not in prereq_tables]
        if missing_tables:
            print(f"❌ Required tables missing: {', '.join(missing_tables)}")
            print("   Run scripts/setup-database.py first to create base schema")
            cursor.close()
            conn.close()
            return False

        print("✓ All prerequisite tables exist")

        # Run migration
        print("\n🚀 Running migration...")
        print("   - Creating cv_versions table")
        print("   - Creating cv_variants table")
        print("   - Creating cv_changelog table")
        print("   - Creating indexes")
        print("   - Creating triggers")

        cursor.execute(migration_sql)
        conn.commit()

        print("✓ Migration executed successfully")

        # Verify tables were created
        print("\n✅ Verifying migration results...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('cv_versions', 'cv_variants', 'cv_changelog')
            ORDER BY table_name
        """)
        created_tables = [row['table_name'] for row in cursor.fetchall()]

        for table in ['cv_versions', 'cv_variants', 'cv_changelog']:
            if table in created_tables:
                print(f"   ✓ {table} table exists")

                # Count rows
                cursor.execute(f"SELECT COUNT(*) as count FROM {table}")
                count = cursor.fetchone()['count']
                print(f"     └─ {count} rows")
            else:
                print(f"   ❌ {table} table NOT FOUND")

        # Check indexes
        print("\n🔍 Checking indexes...")
        cursor.execute("""
            SELECT tablename, indexname
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename IN ('cv_versions', 'cv_variants', 'cv_changelog')
            ORDER BY tablename, indexname
        """)
        indexes = cursor.fetchall()

        index_count_by_table = {}
        for idx in indexes:
            table = idx['tablename']
            index_count_by_table[table] = index_count_by_table.get(table, 0) + 1

        for table in ['cv_versions', 'cv_variants', 'cv_changelog']:
            count = index_count_by_table.get(table, 0)
            print(f"   ✓ {table}: {count} indexes")

        # Check foreign key constraints
        print("\n🔗 Checking foreign key constraints...")
        cursor.execute("""
            SELECT
                conname AS constraint_name,
                conrelid::regclass AS table_name,
                confrelid::regclass AS foreign_table
            FROM pg_constraint
            WHERE contype = 'f'
            AND conrelid::regclass::text IN ('cv_versions', 'cv_variants', 'cv_changelog')
            ORDER BY table_name, constraint_name
        """)
        foreign_keys = cursor.fetchall()

        if foreign_keys:
            for fk in foreign_keys:
                print(f"   ✓ {fk['constraint_name']}: {fk['table_name']} → {fk['foreign_table']}")
        else:
            print("   ⚠️  No foreign keys found (unexpected)")

        # Close connection
        cursor.close()
        conn.close()

        print("\n" + "="*60)
        print("✅ CV GENERATION TABLES MIGRATION COMPLETE")
        print("="*60)
        print("\nNext steps:")
        print("1. Implement CvDraft types in lib/schemas/generate.ts")
        print("2. Create /api/cv/generate endpoint")
        print("3. Update optimization wizard UI")
        print("\nSee docs/GENERATE_CV_AUDIT_REPORT.md for full implementation plan")

        return True

    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        if conn:
            conn.rollback()
            print("   Changes rolled back")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        if conn:
            conn.rollback()
            print("   Changes rolled back")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("CV Generation Tables Migration")
    print("Migration: 003_cv_generation_tables.sql")
    print("=" * 60)
    print()

    success = run_cv_migration()

    if success:
        print("\n✅ SUCCESS")
        sys.exit(0)
    else:
        print("\n❌ FAILED")
        sys.exit(1)
