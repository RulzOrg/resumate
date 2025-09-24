import os
import asyncio
from neondb_serverless import neon

# Get database URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable not found")
    exit(1)

# Initialize Neon client
sql = neon(DATABASE_URL)

async def setup_database():
    """Set up the complete database schema for the resume optimization platform"""
    
    print("Setting up database schema...")
    
    try:
        # Enable UUID extension
        await sql("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"")
        print("✓ UUID extension enabled")
        
        # Create users_sync table
        await sql("""
            CREATE TABLE IF NOT EXISTS users_sync (
                id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                clerk_user_id VARCHAR(255) UNIQUE,
                email VARCHAR(255) NOT NULL,
                name VARCHAR(255) NOT NULL,
                subscription_status VARCHAR(50) DEFAULT 'free',
                subscription_plan VARCHAR(50) DEFAULT 'free',
                subscription_period_end TIMESTAMP WITH TIME ZONE,
                stripe_customer_id VARCHAR(255),
                stripe_subscription_id VARCHAR(255),
                deleted_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✓ Users table created")
        
        # Create indexes for users_sync
        await sql("CREATE INDEX IF NOT EXISTS idx_users_sync_clerk_user_id ON users_sync(clerk_user_id)")
        await sql("CREATE INDEX IF NOT EXISTS idx_users_sync_email ON users_sync(email)")
        await sql("CREATE INDEX IF NOT EXISTS idx_users_sync_deleted_at ON users_sync(deleted_at)")
        print("✓ User table indexes created")
        
        # Create resumes table
        await sql("""
            CREATE TABLE IF NOT EXISTS resumes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_url TEXT NOT NULL,
                file_type VARCHAR(100) NOT NULL,
                file_size INTEGER NOT NULL,
                content_text TEXT,
                kind VARCHAR(32) NOT NULL DEFAULT 'uploaded',
                processing_status VARCHAR(32) NOT NULL DEFAULT 'completed',
                processing_error TEXT,
                parsed_sections JSONB,
                extracted_at TIMESTAMP WITH TIME ZONE,
                source_metadata JSONB,
                is_primary BOOLEAN DEFAULT false,
                deleted_at TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✓ Resumes table created")
        
        # Create indexes for resumes
        await sql("CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id)")
        await sql("CREATE INDEX IF NOT EXISTS idx_resumes_is_primary ON resumes(is_primary)")
        await sql("CREATE INDEX IF NOT EXISTS idx_resumes_deleted_at ON resumes(deleted_at)")
        await sql("CREATE INDEX IF NOT EXISTS idx_resumes_kind ON resumes(kind)")
        await sql("CREATE INDEX IF NOT EXISTS idx_resumes_processing_status ON resumes(processing_status)")
        print("✓ Resume table indexes created")

        # Ensure master resume processing columns exist
        await sql("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS kind VARCHAR(32) DEFAULT 'uploaded'")
        await sql("ALTER TABLE resumes ALTER COLUMN kind SET DEFAULT 'uploaded'")
        await sql("UPDATE resumes SET kind = 'uploaded' WHERE kind IS NULL")
        await sql("ALTER TABLE resumes ALTER COLUMN kind SET NOT NULL")

        await sql("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_status VARCHAR(32) DEFAULT 'completed'")
        await sql("ALTER TABLE resumes ALTER COLUMN processing_status SET DEFAULT 'completed'")
        await sql("UPDATE resumes SET processing_status = 'completed' WHERE processing_status IS NULL")
        await sql("ALTER TABLE resumes ALTER COLUMN processing_status SET NOT NULL")

        await sql("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_error TEXT")
        await sql("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS parsed_sections JSONB")
        await sql("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMP WITH TIME ZONE")
        await sql("ALTER TABLE resumes ADD COLUMN IF NOT EXISTS source_metadata JSONB")
        print("✓ Master resume columns ensured")
        
        # Create job_analysis table
        await sql("""
            CREATE TABLE IF NOT EXISTS job_analysis (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
                job_title VARCHAR(255) NOT NULL,
                company_name VARCHAR(255),
                job_url TEXT,
                job_description TEXT NOT NULL,
                analysis_result JSONB NOT NULL,
                keywords TEXT[] DEFAULT '{}',
                required_skills TEXT[] DEFAULT '{}',
                preferred_skills TEXT[] DEFAULT '{}',
                experience_level VARCHAR(100),
                salary_range VARCHAR(100),
                location VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✓ Job analysis table created")
        
        # Create indexes for job_analysis
        await sql("CREATE INDEX IF NOT EXISTS idx_job_analysis_user_id ON job_analysis(user_id)")
        await sql("CREATE INDEX IF NOT EXISTS idx_job_analysis_keywords ON job_analysis USING GIN(keywords)")
        await sql("CREATE INDEX IF NOT EXISTS idx_job_analysis_required_skills ON job_analysis USING GIN(required_skills)")
        print("✓ Job analysis table indexes created")
        
        # Create optimized_resumes table
        await sql("""
            CREATE TABLE IF NOT EXISTS optimized_resumes (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
                original_resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
                job_analysis_id UUID NOT NULL REFERENCES job_analysis(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                optimized_content TEXT NOT NULL,
                optimization_summary JSONB NOT NULL,
                match_score INTEGER,
                improvements_made TEXT[] DEFAULT '{}',
                keywords_added TEXT[] DEFAULT '{}',
                skills_highlighted TEXT[] DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✓ Optimized resumes table created")
        
        # Create indexes for optimized_resumes
        await sql("CREATE INDEX IF NOT EXISTS idx_optimized_resumes_user_id ON optimized_resumes(user_id)")
        await sql("CREATE INDEX IF NOT EXISTS idx_optimized_resumes_original_resume_id ON optimized_resumes(original_resume_id)")
        await sql("CREATE INDEX IF NOT EXISTS idx_optimized_resumes_job_analysis_id ON optimized_resumes(job_analysis_id)")
        print("✓ Optimized resumes table indexes created")
        
        # Create user_profiles table
        await sql("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                clerk_user_id VARCHAR(255) NOT NULL UNIQUE,
                user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
                bio TEXT,
                company VARCHAR(255),
                job_title VARCHAR(255),
                experience_level VARCHAR(100),
                skills TEXT[] DEFAULT '{}',
                preferences JSONB DEFAULT '{}',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✓ User profiles table created")
        
        # Create indexes for user_profiles
        await sql("CREATE INDEX IF NOT EXISTS idx_user_profiles_clerk_user_id ON user_profiles(clerk_user_id)")
        await sql("CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id)")
        print("✓ User profiles table indexes created")
        
        # Create job_applications table
        await sql("""
            CREATE TABLE IF NOT EXISTS job_applications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id VARCHAR(255) NOT NULL REFERENCES users_sync(id) ON DELETE CASCADE,
                resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
                job_title VARCHAR(255) NOT NULL,
                company_name VARCHAR(255) NOT NULL,
                job_url TEXT,
                job_description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✓ Job applications table created")
        
        # Create indexes for job_applications
        await sql("CREATE INDEX IF NOT EXISTS idx_job_applications_user_id ON job_applications(user_id)")
        await sql("CREATE INDEX IF NOT EXISTS idx_job_applications_resume_id ON job_applications(resume_id)")
        print("✓ Job applications table indexes created")
        
        # Create clerk_webhook_events table
        await sql("""
            CREATE TABLE IF NOT EXISTS clerk_webhook_events (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                event_type VARCHAR(100) NOT NULL,
                event_id VARCHAR(255) NOT NULL UNIQUE,
                user_id VARCHAR(255),
                processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                raw_data JSONB NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✓ Webhook events table created")
        
        # Create indexes for webhook events
        await sql("CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_event_type ON clerk_webhook_events(event_type)")
        await sql("CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_user_id ON clerk_webhook_events(user_id)")
        await sql("CREATE INDEX IF NOT EXISTS idx_clerk_webhook_events_created_at ON clerk_webhook_events(created_at)")
        print("✓ Webhook events table indexes created")
        
        # Create update trigger function
        await sql("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        """)
        print("✓ Update trigger function created")
        
        # Create triggers for all tables
        tables_with_updated_at = [
            'users_sync', 'resumes', 'job_applications', 
            'job_analysis', 'optimized_resumes', 'user_profiles'
        ]
        
        for table in tables_with_updated_at:
            await sql(f"""
                DROP TRIGGER IF EXISTS update_{table}_updated_at ON {table};
                CREATE TRIGGER update_{table}_updated_at 
                    BEFORE UPDATE ON {table} 
                    FOR EACH ROW 
                    EXECUTE FUNCTION update_updated_at_column()
            """)
        print(f"✓ Update triggers created for {len(tables_with_updated_at)} tables")
        
        print("\n🎉 Database schema setup completed successfully!")
        print("All tables, indexes, and triggers have been created.")
        
        # Verify tables exist
        result = await sql("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        print(f"\n📋 Created tables ({len(result)}):")
        for row in result:
            print(f"  - {row['table_name']}")
            
    except Exception as e:
        print(f"❌ Error setting up database: {e}")
        raise e

# Run the setup
if __name__ == "__main__":
    asyncio.run(setup_database())
