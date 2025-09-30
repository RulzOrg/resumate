#!/usr/bin/env python3
"""
Run the onboarding migration to add onboarding_completed_at column to users_sync table
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


def run_onboarding_migration():
    """Run the onboarding migration SQL script"""
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')

    if not database_url:
        print("❌ DATABASE_URL environment variable not found. Set it or create .env.local with DATABASE_URL=postgres://...")
        return False
    
    # Strip quotes that might be in the .env file
    database_url = database_url.strip().strip("'").strip('"')

    try:
        # Read the SQL migration file
        sql_file = os.path.join(os.path.dirname(__file__), 'add-onboarding-status.sql')
        
        if not os.path.exists(sql_file):
            print(f"❌ Migration file not found: {sql_file}")
            return False
        
        with open(sql_file, 'r') as f:
            sql_content = f.read()

        print(f"📄 Reading migration from: {sql_file}")
        
        # Connect to database
        # Handle sslmode=require in connection string
        conn_params = database_url
        if 'sslmode=require' in database_url and "channel_binding" not in database_url:
            conn_params = database_url.replace('sslmode=require', 'sslmode=require&channel_binding=prefer')
        
        conn = psycopg2.connect(conn_params)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        print("🔗 Connected to database successfully")
        
        # Execute the migration
        print("\n🔧 Running onboarding migration...")
        cursor.execute(sql_content)
        
        # Commit the changes
        conn.commit()
        print("\n✅ Migration completed successfully!")
        
        # Verify the migration
        print("\n🔍 Verifying migration...")
        
        # Check that the column was added
        cursor.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'users_sync' AND column_name = 'onboarding_completed_at'
        """)
        column_result = cursor.fetchone()
        
        if column_result:
            print(f"✅ onboarding_completed_at column added successfully")
            print(f"   Type: {column_result['data_type']}")
            print(f"   Nullable: {column_result['is_nullable']}")
        else:
            print("❌ onboarding_completed_at column was not found!")
            return False
        
        # Check that the index was created
        cursor.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'users_sync' AND indexname = 'idx_users_sync_onboarding'
        """)
        index_result = cursor.fetchone()
        
        if index_result:
            print(f"✅ Index created: {index_result['indexname']}")
        else:
            print("⚠️  Index idx_users_sync_onboarding not found")
        
        # Count users who have completed onboarding
        cursor.execute("""
            SELECT 
                COUNT(*) as total_users,
                COUNT(onboarding_completed_at) as completed_users,
                COUNT(*) - COUNT(onboarding_completed_at) as pending_users
            FROM users_sync
            WHERE deleted_at IS NULL
        """)
        stats = cursor.fetchone()
        
        if stats:
            print(f"\n📊 User onboarding statistics:")
            print(f"   Total users: {stats['total_users']}")
            print(f"   Completed onboarding: {stats['completed_users']}")
            print(f"   Pending onboarding: {stats['pending_users']}")
        
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


if __name__ == "__main__":
    success = run_onboarding_migration()
    if not success:
        exit(1)
