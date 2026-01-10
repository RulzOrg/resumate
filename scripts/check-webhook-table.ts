import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTable() {
  // Try to get table info
  const { data, error, count } = await supabase
    .from('clerk_webhook_events')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.log('Table status:', error.code === '42P01' ? 'Does NOT exist' : error.message);
    console.log('Error details:', error);
  } else {
    console.log('Table exists! Row count:', count);
  }
}

checkTable();
