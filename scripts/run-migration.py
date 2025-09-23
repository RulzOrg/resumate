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
        print("  2. Updating job_analysis.user_id data type to VARCHAR(255)...")
        cursor.execute("ALTER TABLE job_analysis ALTER COLUMN user_id TYPE VARCHAR(255)")
        
        # Step 3: Re-create foreign key constraint
        print("  3. Creating new foreign key constraint...")
        cursor.execute("""
            ALTER TABLE job_analysis 
            ADD CONSTRAINT job_analysis_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users_sync(id) ON DELETE CASCADE
        """)
        
        # Step 4: Create index for performance
        print("  4. Creating index for performance...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_job_analysis_user_id ON job_analysis(user_id)")
        
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
            WHERE u.id IS NULL
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
