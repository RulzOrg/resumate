import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRecentSignups() {
  const { data, error } = await supabase
    .from('users_sync')
    .select('email, name, created_at, beehiiv_subscriber_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent signups and Beehiiv status:');
  console.log('='.repeat(80));
  
  data.forEach((user: any, i: number) => {
    const hasBeehiiv = user.beehiiv_subscriber_id ? '✅' : '❌';
    const subId = user.beehiiv_subscriber_id || 'NOT SET';
    console.log(`${i+1}. ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Beehiiv: ${hasBeehiiv} ${subId}`);
    console.log('');
  });
  
  const withBeehiiv = data.filter((u: any) => u.beehiiv_subscriber_id).length;
  console.log('='.repeat(80));
  console.log(`Summary: ${withBeehiiv}/${data.length} users have Beehiiv subscriber IDs`);
}

checkRecentSignups();
