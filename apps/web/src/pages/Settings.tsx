import { useState } from 'react';
import Products from './Products';
import LiquidTrack from './LiquidTrack';
import ImportExport from '../components/ImportExport';

type Tab = 'liquor' | 'products' | 'import-export';

export default function Settings() {
    const [activeTab, setActiveTab] = useState<Tab>('liquor');

    return (
        <div className="content-wrapper" style={{ padding: '20px' }}>
            <div className="page-header" style={{ marginBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>Settings</h1>
            </div>

            {/* Tabs Navigation */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid #ddd',
                marginBottom: '20px'
            }}>
                <button
                    onClick={() => setActiveTab('liquor')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'liquor' ? '#fff' : 'transparent',
                        border: '1px solid #ddd',
                        borderBottom: activeTab === 'liquor' ? '1px solid #fff' : '1px solid #ddd',
                        marginBottom: '-1px',
                        borderRadius: '4px 4px 0 0',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'liquor' ? 600 : 400,
                        color: activeTab === 'liquor' ? '#007bff' : '#666'
                    }}
                >
                    Liquor Track
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'products' ? '#fff' : 'transparent',
                        border: '1px solid #ddd',
                        borderBottom: activeTab === 'products' ? '1px solid #fff' : '1px solid #ddd',
                        marginBottom: '-1px',
                        borderRadius: '4px 4px 0 0',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'products' ? 600 : 400,
                        color: activeTab === 'products' ? '#007bff' : '#666',
                        marginLeft: '5px'
                    }}
                >
                    Products
                </button>
                <button
                    onClick={() => setActiveTab('import-export')}
                    style={{
                        padding: '10px 20px',
                        background: activeTab === 'import-export' ? '#fff' : 'transparent',
                        border: '1px solid #ddd',
                        borderBottom: activeTab === 'import-export' ? '1px solid #fff' : '1px solid #ddd',
                        marginBottom: '-1px',
                        borderRadius: '4px 4px 0 0',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'import-export' ? 600 : 400,
                        color: activeTab === 'import-export' ? '#007bff' : '#666',
                        marginLeft: '5px'
                    }}
                >
                    Import / Export
                </button>
            </div>

            {/* Tab Content */}
            <div style={{ background: '#fff', minHeight: '400px' }}>
                {activeTab === 'liquor' && <LiquidTrack />}
                {activeTab === 'products' && <Products />}
                {activeTab === 'import-export' && <ImportExport />}
            </div>
        </div>
    );
}
