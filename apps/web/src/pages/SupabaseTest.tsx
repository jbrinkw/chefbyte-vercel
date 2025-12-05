import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function SupabaseTest() {
    const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<any>(null);

    useEffect(() => {
        async function testConnection() {
            try {
                // Try to get a row from locations (simple health check)
                const { data: _data, error } = await supabase.from('locations').select('id').limit(1);

                // Even if table doesn't exist, it means we connected successfully
                if (error && !error.message.includes('does not exist') && !error.message.includes('schema cache')) {
                    throw error;
                }

                setStatus('connected');
                setInfo({
                    url: import.meta.env.VITE_SUPABASE_URL,
                    connected: true,
                    message: error ? 'Connected (table not found, which is expected)' : 'Connected'
                });
            } catch (err: any) {
                setStatus('error');
                setError(err.message || 'Unknown error');
            }
        }
        testConnection();
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h2>Supabase Connection Test</h2>

            {status === 'loading' && <p>Testing connection...</p>}

            {status === 'connected' && (
                <div style={{ color: 'green' }}>
                    <p>Connected to Supabase!</p>
                    <pre>{JSON.stringify(info, null, 2)}</pre>
                </div>
            )}

            {status === 'error' && (
                <div style={{ color: 'red' }}>
                    <p>Connection failed:</p>
                    <pre>{error}</pre>
                    <p>Check that:</p>
                    <ul>
                        <li>Supabase is running on {import.meta.env.VITE_SUPABASE_URL}</li>
                        <li>VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env</li>
                    </ul>
                </div>
            )}
        </div>
    );
}
