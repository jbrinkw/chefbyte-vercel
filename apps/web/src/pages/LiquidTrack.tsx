import React, { useState, useEffect } from 'react';
import { apiSupabase } from '../lib/api-supabase';

export default function LiquidTrack() {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newKey, setNewKey] = useState<{ name: string, key: string } | null>(null);
    const [deviceName, setDeviceName] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [copiedKey, setCopiedKey] = useState(false);

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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 2000);
    };

    const cardStyle = {
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #e8e8e8',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    };

    const buttonStyle = {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        fontWeight: 600,
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    };

    return (
        <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px',
            }}>
                <div>
                    <h2 style={{ 
                        margin: 0, 
                        fontSize: '22px', 
                        fontWeight: 700,
                        color: '#1a1a2e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}>
                        🥤 LiquidTrack Devices
                    </h2>
                    <p style={{ margin: '6px 0 0', color: '#666', fontSize: '14px' }}>
                        Connect ESP8266 smart scales to track liquid consumption
                    </p>
                </div>
                <button 
                    onClick={() => setShowCreate(!showCreate)}
                    style={{
                        ...buttonStyle,
                        background: showCreate 
                            ? '#f0f0f0' 
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: showCreate ? '#666' : '#fff',
                        boxShadow: showCreate ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.3)',
                    }}
                >
                    {showCreate ? '✕ Cancel' : '+ Add Device'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{ 
                    ...cardStyle, 
                    background: '#fef2f2', 
                    borderColor: '#fecaca',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                }}>
                    <span>⚠️</span> {error}
                </div>
            )}

            {/* New Key Created */}
            {newKey && (
                <div style={{ 
                    ...cardStyle, 
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)', 
                    borderColor: '#a7f3d0',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px' }}>🎉</span>
                        <h3 style={{ margin: 0, color: '#065f46', fontSize: '18px' }}>Device Key Created!</h3>
                    </div>
                    <p style={{ color: '#047857', margin: '0 0 16px', fontSize: '14px' }}>
                        ⚠️ This is the <strong>ONLY</strong> time you'll see this key. Copy it now!
                    </p>
                    <div style={{ 
                        display: 'flex', 
                        gap: '10px', 
                        alignItems: 'center', 
                        background: '#fff',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #a7f3d0',
                    }}>
                        <code style={{ 
                            flex: 1, 
                            fontFamily: 'monospace', 
                            fontSize: '13px',
                            color: '#065f46',
                            wordBreak: 'break-all',
                        }}>
                            {newKey.key}
                        </code>
                        <button 
                            onClick={() => copyToClipboard(newKey.key)}
                            style={{
                                ...buttonStyle,
                                background: copiedKey ? '#10b981' : '#065f46',
                                color: '#fff',
                                padding: '8px 16px',
                            }}
                        >
                            {copiedKey ? '✓ Copied!' : '📋 Copy'}
                        </button>
                    </div>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '12px', 
                        marginTop: '16px',
                        fontSize: '13px',
                    }}>
                        <div style={{ background: '#fff', padding: '10px', borderRadius: '6px' }}>
                            <span style={{ color: '#666' }}>Device Name:</span>
                            <strong style={{ display: 'block', color: '#065f46' }}>{newKey.name}</strong>
                        </div>
                        <div style={{ background: '#fff', padding: '10px', borderRadius: '6px' }}>
                            <span style={{ color: '#666' }}>API URL:</span>
                            <strong style={{ display: 'block', color: '#065f46', fontSize: '12px' }}>{window.location.origin}/api/liquidtrack</strong>
                        </div>
                    </div>
                    <button 
                        onClick={() => setNewKey(null)}
                        style={{
                            marginTop: '16px',
                            background: 'transparent',
                            border: '1px solid #a7f3d0',
                            color: '#065f46',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 500,
                        }}
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Create Form */}
            {showCreate && (
                <div style={cardStyle}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#1a1a2e' }}>
                        🆕 Add New Device
                    </h3>
                    <form onSubmit={handleCreateKey} style={{ display: 'flex', gap: '12px' }}>
                        <input
                            type="text"
                            placeholder="Device name (e.g. Kitchen Scale, Office Water Bottle)"
                            value={deviceName}
                            onChange={(e) => setDeviceName(e.target.value)}
                            style={{ 
                                flex: 1,
                                padding: '12px 16px',
                                border: '1px solid #e0e0e0',
                                borderRadius: '8px',
                                fontSize: '14px',
                            }}
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            style={{
                                ...buttonStyle,
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                color: '#fff',
                                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                            }}
                        >
                            🔑 Generate Key
                        </button>
                    </form>
                </div>
            )}

            {/* Devices List */}
            {loading ? (
                <div style={{ ...cardStyle, textAlign: 'center', color: '#666' }}>
                    <span style={{ fontSize: '24px' }}>⏳</span>
                    <p>Loading devices...</p>
                </div>
            ) : keys.length === 0 ? (
                <div style={{ 
                    ...cardStyle, 
                    textAlign: 'center', 
                    padding: '48px',
                    background: '#f9fafb',
                }}>
                    <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📱</span>
                    <h3 style={{ margin: '0 0 8px', color: '#374151' }}>No devices connected</h3>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                        Add your first ESP8266 smart scale to start tracking
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {keys.map(key => (
                        <div key={key.id} style={{
                            ...cardStyle,
                            marginBottom: 0,
                            transition: 'all 0.2s ease',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ 
                                        fontSize: '24px', 
                                        background: '#f0fdf4', 
                                        padding: '8px',
                                        borderRadius: '8px',
                                    }}>⚖️</span>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '16px', color: '#1a1a2e' }}>{key.name}</h3>
                                        <p style={{ margin: '4px 0 0', color: '#666', fontSize: '12px' }}>
                                            Created {new Date(key.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleRevoke(key.id)}
                                    style={{
                                        background: '#fef2f2',
                                        color: '#dc2626',
                                        border: '1px solid #fecaca',
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Revoke
                                </button>
                            </div>
                            <div style={{ 
                                marginTop: '12px', 
                                padding: '8px 12px',
                                background: '#f9fafb',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                color: '#6b7280',
                            }}>
                                ID: {key.id}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Instructions */}
            <div style={{ ...cardStyle, marginTop: '24px', background: '#f8fafc' }}>
                <h3 style={{ 
                    margin: '0 0 16px', 
                    fontSize: '16px', 
                    color: '#1a1a2e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                    📚 ESP8266 Configuration Guide
                </h3>
                <div style={{ 
                    background: '#1a1a2e', 
                    padding: '20px', 
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#e2e8f0',
                    overflowX: 'auto',
                    lineHeight: '1.6',
                }}>
                    <div style={{ color: '#94a3b8' }}>// In your Arduino code:</div>
                    <div><span style={{ color: '#f472b6' }}>const char*</span> api_url = <span style={{ color: '#a5f3fc' }}>"{window.location.origin}/api/liquidtrack"</span>;</div>
                    <div><span style={{ color: '#f472b6' }}>const char*</span> api_key = <span style={{ color: '#a5f3fc' }}>"YOUR_KEY_HERE"</span>;</div>
                    <br />
                    <div style={{ color: '#94a3b8' }}>// HTTP Header for requests:</div>
                    <div><span style={{ color: '#fbbf24' }}>x-api-key</span>: YOUR_KEY_HERE</div>
                </div>
            </div>
        </div>
    );
}


