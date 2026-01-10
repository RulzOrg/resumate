import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkWebhookEvents() {
  // Check if table exists and get recent events
  const { data, error } = await supabase
    .from('clerk_webhook_events')
    .select('event_type, event_id, user_id, created_at')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('Error (table may not exist):', error.message);
    return;
  }

  console.log('Recent Clerk webhook events:');
  console.log('='.repeat(80));

  if (!data || data.length === 0) {
    console.log('No webhook events found in database');
    return;
  }

  data.forEach((evt: any, i: number) => {
    console.log(`${i+1}. ${evt.event_type} | user: ${evt.user_id || 'N/A'} | ${evt.created_at}`);
  });

  const userCreated = data.filter((e: any) => e.event_type === 'user.created').length;
  console.log('='.repeat(80));
  console.log(`Found ${userCreated} user.created events in last ${data.length} events`);
}

checkWebhookEvents();
