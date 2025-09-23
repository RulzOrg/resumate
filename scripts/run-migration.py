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


def run_migration():
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')

    if not database_url:
        print("❌ DATABASE_URL environment variable not found. Set it or create .env.local with DATABASE_URL=postgres://...")
        return

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        print("🔗 Connected to database successfully")

        sql_files = [
            'scripts/create-users-table.sql',
            'scripts/create-database-schema.sql',
        ]

        for sql_file in sql_files:
            print(f"\n➡️  Running migration file: {sql_file}")
            with open(sql_file, 'r') as file:
                sql_content = file.read()
            try:
                cursor.execute(sql_content)
                conn.commit()
                print(f"✅ {sql_file} executed successfully")
            except Exception as file_error:
                conn.rollback()
                print(f"❌ Error executing {sql_file}: {str(file_error)}")
                raise

        # Verify tables were created
        cursor.execute(
            """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
            """
        )

        tables = cursor.fetchall()
        print(f"\n📊 Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table['table_name']}")

        cursor.close()
        conn.close()
        print("\n🎉 Migration completed successfully")

    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()


if __name__ == "__main__":
    run_migration()
