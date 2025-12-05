import { useState } from 'react';
import Products from './Products';
import LiquidTrack from './LiquidTrack';
import ImportExport from '../components/ImportExport';

type Tab = 'products' | 'liquidtrack' | 'import-export';

const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'liquidtrack', label: 'LiquidTrack', icon: '🥤' },
    { id: 'import-export', label: 'Import / Export', icon: '💾' },
];

export default function Settings() {
    const [activeTab, setActiveTab] = useState<Tab>('products');

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ 
                    margin: 0, 
                    fontSize: '28px', 
                    fontWeight: 700,
                    color: '#1a1a2e'
                }}>⚙️ Settings</h1>
                <p style={{ margin: '8px 0 0', color: '#666', fontSize: '14px' }}>
                    Manage your products, devices, and data
                </p>
            </div>

            {/* Modern Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                background: '#f0f0f5',
                padding: '6px',
                borderRadius: '12px',
                width: 'fit-content',
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: '10px 20px',
                            background: activeTab === tab.id 
                                ? '#fff' 
                                : 'transparent',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            color: activeTab === tab.id ? '#1f2937' : '#6b7280',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        }}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ 
                background: '#fff', 
                borderRadius: '12px',
                border: '1px solid #e0e0e0',
                minHeight: '400px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}>
                {activeTab === 'products' && <Products />}
                {activeTab === 'liquidtrack' && <LiquidTrack />}
                {activeTab === 'import-export' && <ImportExport />}
            </div>
        </div>
    );
}
