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

async function check() {
    const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', '013562134151')
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Product:', JSON.stringify(product, null, 2));
    }
}

check();
