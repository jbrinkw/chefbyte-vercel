
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load env
config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Use service role if possible, but anon works for signup

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const email = `demo_${Date.now()}@chefbyte.com`;
    const password = 'password123';

    console.log(`Creating user: ${email}`);

    // 1. Sign Up
    const { data: auth, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('Signup failed:', authError);
        process.exit(1);
    }

    const userId = auth.user?.id;
    if (!userId) {
        console.error('No user ID returned');
        process.exit(1);
    }

    console.log(`User created: ${userId}`);

    // 2. Create Product (Milk)
    const { data: product, error: prodError } = await supabase.from('products').insert({
        user_id: userId,
        name: 'Demo Milk',
        walmart_link: 'https://www.walmart.com/ip/Great-Value-Whole-Vitamin-D-Milk-Gallon-Plastic-Jug-128-fl-oz/351865186',
        is_placeholder: false,
        num_servings: 16,
        calories_per_serving: 150
    }).select().single();

    if (prodError) {
        console.error('Product creation failed:', prodError);
        process.exit(1);
    }
    console.log(`Product created: ${product.name}`);

    // 3. Add to Meal Plan (Tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayStr = tomorrow.toISOString().split('T')[0];

    const { error: mpError } = await supabase.from('meal_plan').insert({
        user_id: userId,
        day: dayStr,
        type: 'product',
        product_id: product.id,
        amount: 5,
        done: false
    });

    if (mpError) {
        console.error('Meal plan creation failed:', mpError);
        process.exit(1);
    }
    console.log(`Meal plan added for ${dayStr}`);

    console.log('SETUP_COMPLETE');
    console.log(JSON.stringify({ email, password }));
}

main();
