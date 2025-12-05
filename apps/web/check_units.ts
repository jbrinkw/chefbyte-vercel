import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnv = (key: string) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1].trim() : '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('quantity_units').select('*');
    if (error) {
        console.error(error);
    } else {
        console.log('Units:', data);
        const container = data.find((u: any) => u.name.toLowerCase() === 'container' || u.name.toLowerCase() === 'containers');
        if (!container) {
            console.log('Creating Container unit...');
            const { error: insertError } = await supabase.from('quantity_units').insert({ name: 'Container', name_plural: 'Containers' });
            if (insertError) console.error(insertError);
            else console.log('Created.');
        } else {
            console.log('Container unit exists:', container);
        }
    }
}

check();
