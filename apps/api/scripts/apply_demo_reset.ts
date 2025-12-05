import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://192.168.0.226:54321';
// Service role key for admin access
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function applyMigration() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Read the migration file
  const migrationPath = path.join(__dirname, '../../..', 'supabase/migrations/007_demo_reset_function.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying demo_reset migration...');
  console.log('Supabase URL:', SUPABASE_URL);

  // Execute the SQL using Supabase's RPC or direct query
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // If exec_sql doesn't exist, we need another approach
    console.log('RPC exec_sql not available, trying direct approach...');

    // Split the SQL into individual statements and execute
    // For now, let's just print instructions
    console.log('\n==========================================');
    console.log('Manual Steps Required:');
    console.log('==========================================');
    console.log('1. Open Supabase Studio at:', SUPABASE_URL.replace(':54321', ':54323'));
    console.log('2. Go to SQL Editor');
    console.log('3. Copy and paste the contents of:');
    console.log('   supabase/migrations/007_demo_reset_function.sql');
    console.log('4. Click "Run" to create the demo_reset function');
    console.log('==========================================\n');

    console.log('Error details:', error);
  } else {
    console.log('Migration applied successfully!');
    console.log('Result:', data);
  }
}

applyMigration().catch(console.error);
