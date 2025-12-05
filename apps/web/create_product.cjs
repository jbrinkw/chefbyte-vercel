const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnv = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

async function create() {
    // 1. Try to find any product
    let { data: p } = await supabase.from('products').select('user_id').limit(1).single();
    let userId = p?.user_id;

    // 2. Try shopping list
    if (!userId) {
        let { data: sl } = await supabase.from('shopping_list').select('user_id').limit(1).single();
        userId = sl?.user_id;
    }

    // 3. Try meal plan
    if (!userId) {
        let { data: mp } = await supabase.from('meal_plan').select('user_id').limit(1).single();
        userId = mp?.user_id;
    }

    // 4. Try locations
    if (!userId) {
        const { data: loc } = await supabase.from('locations').select('user_id').limit(1).single();
        userId = loc?.user_id;
    }

    if (!userId) {
        console.error('No user found in any table.');
        return;
    }

    console.log('Using User ID:', userId);

    const { data, error } = await supabase
        .from('products')
        .insert({
            user_id: userId,
            name: 'SUPER! MAC Shells & White Cheddar',
            barcode: '013562134151',
            num_servings: 3.5,
            calories_per_serving: 260,
            carbs_per_serving: 45,
            fat_per_serving: 6,
            protein_per_serving: 9
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating product:', error);
    } else {
        console.log('Created Product:', data);
    }
}

create();
