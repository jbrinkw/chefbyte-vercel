
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Verifying data for demo2@chefbyte.test...');

    // 1. Get User ID (admin.listUsers might not work with anon key)
    const { data: { users: _users }, error: _userError } = await supabase.auth.admin.listUsers();

    // Note: admin.listUsers might not work with anon key. 
    // We might need to just query the tables if we can't get the user ID easily, 
    // but RLS prevents that without a user context.
    // Actually, we can try to sign in to get the ID.

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'demo2@chefbyte.test',
        password: 'DemoPassword123!'
    });

    if (authError || !authData.user) {
        console.error('Login failed:', authError?.message);
        return;
    }

    const userId = authData.user.id;
    console.log(`Logged in as ${userId}`);
    console.log(`Access Token: ${authData.session.access_token}`);

    // 2. Check Products
    const { data: products, error: prodError } = await supabase
        .from('products')
        .select('id, name')
        .eq('user_id', userId);

    if (prodError) console.error('Product fetch error:', prodError);
    else console.log(`Found ${products?.length} products. First 3:`, products?.slice(0, 3).map(p => p.name));

    // 3. Check Recipes
    const { data: recipes, error: recError } = await supabase
        .from('recipes')
        .select('id, name')
        .eq('user_id', userId);

    if (recError) console.error('Recipe fetch error:', recError);
    else console.log(`Found ${recipes?.length} recipes. First 3:`, recipes?.slice(0, 3).map(r => r.name));
}

verify();
