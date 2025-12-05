import { useState, useRef } from 'react';
import { apiSupabase } from '../lib/api-supabase';

export default function ImportExport() {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const buttonStyle = {
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
        transition: 'all 0.2s ease',
    };

    const cardStyle = {
        padding: '24px',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    };

    const handleExport = async () => {
        try {
            setExporting(true);
            setMessage(null);

            const [
                products,
                recipes,
                recipeIngredients,
                stock,
                locations,
                quantityUnits
            ] = await Promise.all([
                apiSupabase.getProducts(),
                apiSupabase.getRecipes(),
                apiSupabase.getAllRecipeIngredients(),
                apiSupabase.getStock(),
                apiSupabase.getLocations(),
                apiSupabase.getQuantityUnits()
            ]);

            const exportData = {
                version: 1,
                timestamp: new Date().toISOString(),
                data: {
                    products,
                    recipes,
                    recipeIngredients,
                    stock,
                    locations,
                    quantityUnits
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chefbyte-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: 'Export completed successfully!' });
        } catch (err: any) {
            console.error('Export failed:', err);
            setMessage({ type: 'error', text: `Export failed: ${err.message}` });
        } finally {
            setExporting(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file.name);
        }
    };

    const handleImport = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
            setMessage({ type: 'error', text: 'Please select a file first' });
            return;
        }

        if (!confirm('Importing data will add to your existing data. It might create duplicates if data already exists. Continue?')) {
            return;
        }

        try {
            setImporting(true);
            setMessage(null);

            const text = await file.text();
            const importData = JSON.parse(text);

            if (!importData.data) {
                throw new Error('Invalid backup file format');
            }

            const result = await apiSupabase.importData(importData.data);

            if (result.success) {
                setMessage({ type: 'success', text: 'Import completed successfully! Please refresh the page.' });
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                throw new Error('Import failed');
            }

        } catch (err: any) {
            console.error('Import failed:', err);
            setMessage({ type: 'error', text: `Import failed: ${err.message}` });
        } finally {
            setImporting(false);
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <h2 style={{ 
                margin: '0 0 8px', 
                fontSize: '22px', 
                fontWeight: 700,
                color: '#1a1a2e',
            }}>
                💾 Import / Export Data
            </h2>
            <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
                Backup your data or restore from a previous backup.
            </p>

            {message && (
                <div style={{
                    padding: '14px 18px',
                    marginBottom: '20px',
                    borderRadius: '10px',
                    background: message.type === 'success' 
                        ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' 
                        : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    color: message.type === 'success' ? '#065f46' : '#dc2626',
                    border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '14px',
                }}>
                    <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
                {/* Export Card */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px' }}>📤</span>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1a1a2e' }}>Export Data</h3>
                    </div>
                    <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px' }}>
                        Download a JSON file containing all your products, recipes, and inventory.
                    </p>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        style={{
                            ...buttonStyle,
                            opacity: exporting ? 0.7 : 1,
                            cursor: exporting ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {exporting ? '⏳ Exporting...' : '⬇️ Download Backup'}
                    </button>
                </div>

                {/* Import Card */}
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px' }}>📥</span>
                        <h3 style={{ margin: 0, fontSize: '18px', color: '#1a1a2e' }}>Import Data</h3>
                    </div>
                    <p style={{ color: '#666', fontSize: '14px', margin: '0 0 16px' }}>
                        Restore data from a JSON backup file.
                    </p>
                    
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    
                    {/* Custom file selection UI */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={importing}
                            style={{
                                padding: '12px 24px',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '14px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            📁 Choose File
                        </button>
                        
                        {selectedFile && (
                            <span style={{ 
                                color: '#059669', 
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}>
                                ✓ {selectedFile}
                            </span>
                        )}
                    </div>

                    {selectedFile && (
                        <button
                            onClick={handleImport}
                            disabled={importing}
                            style={{
                                ...buttonStyle,
                                marginTop: '16px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                opacity: importing ? 0.7 : 1,
                                cursor: importing ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {importing ? '⏳ Importing...' : '⬆️ Import Backup'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
