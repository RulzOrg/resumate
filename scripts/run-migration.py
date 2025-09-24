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


def fix_foreign_key_constraint():
    """Fix the foreign key constraint issue between users_sync.id and job_analysis.user_id"""
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
        
        print("\n📊 Checking current schema state...")
        
        # Check current data types
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'users_sync' AND column_name = 'id'
        """)
        users_sync_result = cursor.fetchall()
        
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'job_analysis' AND column_name = 'user_id'
        """)
        job_analysis_result = cursor.fetchall()
        
        print(f"users_sync.id: {users_sync_result[0]['data_type'] if users_sync_result else 'NOT FOUND'}")
        print(f"job_analysis.user_id: {job_analysis_result[0]['data_type'] if job_analysis_result else 'NOT FOUND'}")
        
        # Check existing constraints
        cursor.execute("""
            SELECT conname, contype, confrelid::regclass, conkey, confkey
            FROM pg_constraint 
            WHERE conrelid = 'job_analysis'::regclass AND contype = 'f'
        """)
        constraints = cursor.fetchall()
        
        print(f"\n🔗 Current foreign key constraints: {len(constraints)}")
        for constraint in constraints:
            print(f"  - {constraint['conname']}")

        print("\n🔧 Running migration...")
        
        # Step 1: Drop existing foreign key constraints
        print("  1. Dropping existing foreign key constraints...")
        cursor.execute("ALTER TABLE job_analysis DROP CONSTRAINT IF EXISTS fk_job_analysis_user_id")
        cursor.execute("ALTER TABLE job_analysis DROP CONSTRAINT IF EXISTS job_analysis_user_id_fkey")
        
        # Step 2: Ensure data type consistency
        # Pre-change compatibility check to avoid truncation/errors when narrowing to VARCHAR(255)
        print("  2.1 Checking job_analysis.user_id value lengths prior to type change...")
        cursor.execute("""
            SELECT COUNT(*) AS offending_count,
                   COALESCE(MAX(CHAR_LENGTH(user_id::text)), 0) AS max_len
            FROM job_analysis
            WHERE CHAR_LENGTH(user_id::text) > 255
        """)
        length_check = cursor.fetchone()
        offending_count = length_check['offending_count'] if length_check else 0
        max_len = length_check['max_len'] if length_check else 0

        if offending_count and offending_count > 0:
            print(f"\n🚫 Incompatibility detected: {offending_count} rows in job_analysis.user_id exceed 255 characters (max length: {max_len}).")
            print("❌ Aborting migration. Choose TEXT or a larger VARCHAR size for job_analysis.user_id and rerun.")
            raise Exception("Incompatible data length for VARCHAR(255) on job_analysis.user_id")

        print("  2. Updating job_analysis.user_id data type to VARCHAR(255)...")
        cursor.execute("ALTER TABLE job_analysis ALTER COLUMN user_id TYPE VARCHAR(255)")
        
        # Step 3: Re-create foreign key constraint
        print("  3. Pre-checking for orphaned job_analysis.user_id before creating foreign key...")
        cursor.execute("""
            SELECT COUNT(*) AS orphan_count
            FROM job_analysis ja
            LEFT JOIN users_sync u ON ja.user_id = u.id
            WHERE ja.user_id IS NOT NULL AND u.id IS NULL
        """)
        orphan_check = cursor.fetchone()
        orphan_count = orphan_check['orphan_count'] if orphan_check else 0
        print(f"     Orphaned records (non-null user_id without matching users_sync.id): {orphan_count}")
        if orphan_count and orphan_count > 0:
            print("❌ Aborting migration: resolve orphaned job_analysis.user_id records before adding foreign key.")
            raise Exception("Orphaned job_analysis.user_id records exist")
        print("  3. Creating new foreign key constraint...")
        cursor.execute("""
            ALTER TABLE job_analysis 
            ADD CONSTRAINT job_analysis_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users_sync(id) ON DELETE CASCADE
        """)
        
        # Step 4: Create index for performance
        print("  4. Creating index for performance...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_job_analysis_user_id ON job_analysis(user_id)")
        
        # Step 5: Fix resumes table foreign key data type mismatch
        print("\n🔧 Fixing resumes table foreign key data type...")
        cursor.execute("ALTER TABLE resumes DROP CONSTRAINT IF EXISTS resumes_user_id_fkey")
        cursor.execute("ALTER TABLE resumes ALTER COLUMN user_id TYPE TEXT")
        cursor.execute("""
            ALTER TABLE resumes 
            ADD CONSTRAINT resumes_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users_sync(id) ON DELETE CASCADE
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id)")
        
        # Step 6: Ensure resumes table has master resume columns
        print("\n🛠️ Ensuring resumes table columns for master resume support...")
        cursor.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS kind VARCHAR(32) DEFAULT 'uploaded'")
        cursor.execute("ALTER TABLE resumes ALTER COLUMN kind SET DEFAULT 'uploaded'")
        cursor.execute("UPDATE resumes SET kind = 'uploaded' WHERE kind IS NULL")
        cursor.execute("ALTER TABLE resumes ALTER COLUMN kind SET NOT NULL")

        cursor.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_status VARCHAR(32) DEFAULT 'completed'")
        cursor.execute("ALTER TABLE resumes ALTER COLUMN processing_status SET DEFAULT 'completed'")
        cursor.execute("UPDATE resumes SET processing_status = 'completed' WHERE processing_status IS NULL")
        cursor.execute("ALTER TABLE resumes ALTER COLUMN processing_status SET NOT NULL")

        cursor.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_error TEXT")
        cursor.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_sections JSONB")
        cursor.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP WITH TIME ZONE")
        cursor.execute("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS source_metadata JSONB")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resumes_kind ON resumes(kind)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_resumes_processing_status ON resumes(processing_status)")
        
        # Commit all changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Verify the fix
        print("\n🔍 Verifying migration...")
        
        # Check final data types
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'users_sync' AND column_name = 'id'
        """)
        users_sync_final = cursor.fetchall()
        
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'job_analysis' AND column_name = 'user_id'
        """)
        job_analysis_final = cursor.fetchall()
        
        # Check new constraints
        cursor.execute("""
            SELECT conname, contype, confrelid::regclass, conkey, confkey
            FROM pg_constraint 
            WHERE conrelid = 'job_analysis'::regclass AND contype = 'f'
        """)
        final_constraints = cursor.fetchall()
        
        print(f"✅ users_sync.id: {users_sync_final[0]['data_type']}")
        print(f"✅ job_analysis.user_id: {job_analysis_final[0]['data_type']}")
        print(f"✅ Foreign key constraints: {len(final_constraints)}")
        for constraint in final_constraints:
            print(f"  - {constraint['conname']}")
        
        # Test the constraint works by checking for orphaned records
        cursor.execute("""
            SELECT COUNT(*) as count
            FROM job_analysis ja
            LEFT JOIN users_sync u ON ja.user_id = u.id
            WHERE ja.user_id IS NOT NULL AND u.id IS NULL
        """)
        orphaned_result = cursor.fetchone()
        orphaned_count = orphaned_result['count'] if orphaned_result else 0
        
        print(f"✅ Orphaned job_analysis records: {orphaned_count}")
        
        cursor.close()
        conn.close()
        print("\n🎉 Migration completed and verified successfully!")
        return True

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False


def run_migration():
    # Keep original function for compatibility
    return fix_foreign_key_constraint()


if __name__ == "__main__":
    success = fix_foreign_key_constraint()
    if not success:
        exit(1)
