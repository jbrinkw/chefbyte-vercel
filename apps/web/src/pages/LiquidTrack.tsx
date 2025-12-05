import React, { useState, useEffect } from 'react';
import { apiSupabase } from '../lib/api-supabase';

export default function LiquidTrack() {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newKey, setNewKey] = useState<{ name: string, key: string } | null>(null);
    const [deviceName, setDeviceName] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        try {
            setLoading(true);
            const data = await apiSupabase.listDeviceKeys();
            setKeys(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!deviceName.trim()) return;

        try {
            const result = await apiSupabase.generateDeviceKey(deviceName);
            setNewKey({ name: result.name || deviceName, key: result.raw_key });
            setDeviceName('');
            setShowCreate(false);
            loadKeys();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleRevoke = async (id: string) => {
        if (!confirm('Are you sure you want to revoke this key? The device will stop working immediately.')) return;
        try {
            await apiSupabase.revokeDeviceKey(id);
            loadKeys();
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="content-wrapper">
            <div className="page-header">
                <h1>LiquidTrack Devices</h1>
                <button 
                    className="action-btn"
                    onClick={() => setShowCreate(!showCreate)}
                >
                    {showCreate ? 'Cancel' : 'Add Device'}
                </button>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {newKey && (
                <div className="card success-card" style={{ background: '#d4edda', borderColor: '#c3e6cb', color: '#155724' }}>
                    <h3>Device Key Created!</h3>
                    <p>This is the ONLY time you will see this key. Copy it now.</p>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', margin: '10px 0' }}>
                        <input 
                            type="text" 
                            readOnly 
                            value={newKey.key} 
                            style={{ flex: 1, padding: '8px', fontFamily: 'monospace', fontSize: '1.1em' }}
                        />
                        <button 
                            className="action-btn"
                            onClick={() => navigator.clipboard.writeText(newKey.key)}
                        >
                            Copy
                        </button>
                    </div>
                    <p><strong>Device Name:</strong> {newKey.name}</p>
                    <p><strong>API URL:</strong> {window.location.origin}/api/liquidtrack</p>
                    <button 
                        className="text-btn"
                        onClick={() => setNewKey(null)}
                        style={{ marginTop: '10px' }}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {showCreate && (
                <div className="card">
                    <h3>Add New Device</h3>
                    <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Device Name (e.g. Office Scale)"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            style={{ flex: 1 }}
                            autoFocus
                        />
                        <button type="submit" className="action-btn primary">Generate Key</button>
                    </form>
                </div>
            )}

            <div className="card-grid">
                {loading ? (
                    <p>Loading keys...</p>
                ) : keys.length === 0 ? (
                    <div className="card">
                        <p>No devices configured. Add a device to start tracking liquid consumption.</p>
                    </div>
                ) : (
                    keys.map(key => (
                        <div key={key.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>{key.name}</h3>
                                <button 
                                    className="text-btn danger"
                                    onClick={() => handleRevoke(key.id)}
                                    style={{ color: '#dc3545' }}
                                >
                                    Revoke
                                </button>
                            </div>
                            <p style={{ color: '#666', fontSize: '0.9em' }}>
                                Created: {new Date(key.created_at).toLocaleDateString()}
                            </p>
                            <div style={{ marginTop: '10px', fontSize: '0.8em', color: '#888' }}>
                                ID: {key.id}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
                <h3>How to Configure ESP8266</h3>
                <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '4px', overflowX: 'auto' }}>
{`// In your Arduino code:
const char* api_url = "${window.location.origin}/api/liquidtrack";
const char* api_key = "YOUR_KEY_HERE";

// Send POST request with header:
// x-api-key: YOUR_KEY_HERE`}
                </pre>
            </div>
        </div>
    );
}


