import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    const sqlContent = readFileSync('prisma/migrations/add_resume_versions_table.sql', 'utf8');
    
    console.log('🚀 Running migration: add_resume_versions_table.sql\n');
    
    // Split SQL into individual statements (split only on semicolons followed by newline)
    const statements = sqlContent
      .split(/;[\s]*[\n\r]/g)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
      .filter(s => !s.match(/^--/gm)); // Filter out comment-only statements
    
    console.log(`Found ${statements.length} statements to execute\n`);
    
    // Debug: print all statements
    statements.forEach((stmt, idx) => {
      const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');
      console.log(`Statement ${idx + 1}: ${preview}...`);
    });
    console.log('');
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`Executing statement ${i + 1}/${statements.length}: ${preview}...`);
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log('✅ Success');
      } catch (e: any) {
        // Ignore "already exists" errors
        if (e.message.includes('already exists')) {
          console.log('⚠️  Already exists (skipping)');
        } else {
          console.error(`❌ Failed statement:\n${statement.substring(0, 200)}\n`);
          throw e;
        }
      }
    }
    
    console.log('\n✅ All statements executed\n');
    console.log('🔍 Verifying...');
    
    // Verify table creation
    const result = await prisma.$queryRawUnsafe<Array<{column_name: string, data_type: string}>>(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'resume_versions'
      ORDER BY ordinal_position
    `);
    
    if (result.length > 0) {
      console.log(`✅ resume_versions table created with ${result.length} columns:`);
      result.forEach(r => console.log(`   - ${r.column_name} (${r.data_type})`));
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('❌ Table not found');
      process.exit(1);
    }
  } catch (e: any) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
