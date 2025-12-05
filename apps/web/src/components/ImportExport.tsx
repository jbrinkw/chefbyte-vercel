import { useState } from 'react';
import { apiSupabase } from '../lib/api-supabase';

export default function ImportExport() {
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleExport = async () => {
        try {
            setExporting(true);
            setMessage(null);

            // Fetch all data
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

            // Create download
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

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('Importing data will add to your existing data. It might create duplicates if data already exists. Continue?')) {
            e.target.value = '';
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

            // Call API to import data
            const result = await apiSupabase.importData(importData.data);

            if (result.success) {
                setMessage({ type: 'success', text: 'Import completed successfully! Please refresh the page.' });
            } else {
                throw new Error('Import failed');
            }

        } catch (err: any) {
            console.error('Import failed:', err);
            setMessage({ type: 'error', text: `Import failed: ${err.message}` });
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h2>Import / Export Data</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
                Backup your data or restore from a previous backup.
            </p>

            {message && (
                <div style={{
                    padding: '10px',
                    marginBottom: '20px',
                    borderRadius: '4px',
                    background: message.type === 'success' ? '#d4edda' : '#f8d7da',
                    color: message.type === 'success' ? '#155724' : '#721c24',
                    border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gap: '20px', maxWidth: '600px' }}>
                <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
                    <h3>Export Data</h3>
                    <p>Download a JSON file containing all your products, recipes, and inventory.</p>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        style={{
                            padding: '10px 20px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: exporting ? 'not-allowed' : 'pointer',
                            opacity: exporting ? 0.7 : 1
                        }}
                    >
                        {exporting ? 'Exporting...' : 'Download Backup'}
                    </button>
                </div>

                <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
                    <h3>Import Data</h3>
                    <p>Restore data from a JSON backup file.</p>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        disabled={importing}
                        style={{ display: 'block', width: '100%' }}
                    />
                    {importing && <p style={{ marginTop: '10px', color: '#666' }}>Importing...</p>}
                </div>
            </div>
        </div>
    );
}
