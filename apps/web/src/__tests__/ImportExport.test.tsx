import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportExport from '../components/ImportExport';
import { apiSupabase } from '../lib/api-supabase';

// Mock the API
vi.mock('../lib/api-supabase', () => ({
    apiSupabase: {
        getProducts: vi.fn(),
        getRecipes: vi.fn(),
        getAllRecipeIngredients: vi.fn(),
        getStock: vi.fn(),
        getLocations: vi.fn(),
        getQuantityUnits: vi.fn(),
        importData: vi.fn(),
    },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn();
global.URL.revokeObjectURL = vi.fn();
// Mock anchor click
HTMLAnchorElement.prototype.click = vi.fn();

describe('ImportExport', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<ImportExport />);
        expect(screen.getByText('Import / Export Data')).toBeInTheDocument();
        expect(screen.getByText('Export Data')).toBeInTheDocument();
        expect(screen.getByText('Import Data')).toBeInTheDocument();
    });

    it('handleExport calls all get methods', async () => {
        render(<ImportExport />);

        const exportBtn = screen.getByText('Download Backup');
        fireEvent.click(exportBtn);

        await waitFor(() => {
            expect(apiSupabase.getProducts).toHaveBeenCalled();
            expect(apiSupabase.getRecipes).toHaveBeenCalled();
            expect(apiSupabase.getAllRecipeIngredients).toHaveBeenCalled();
            expect(apiSupabase.getStock).toHaveBeenCalled();
            expect(apiSupabase.getLocations).toHaveBeenCalled();
            expect(apiSupabase.getQuantityUnits).toHaveBeenCalled();
        });

        expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    });

    it('handleImport calls importData with parsed JSON', async () => {
        const { container } = render(<ImportExport />);

        const mockFile = new File([JSON.stringify({ data: { products: [] } })], 'backup.json', { type: 'application/json' });
        mockFile.text = vi.fn().mockResolvedValue(JSON.stringify({ data: { products: [] } }));

        // Since the input doesn't have a label, we find it by type
        const fileInput = container.querySelector('input[type="file"]');

        // Mock confirm
        vi.spyOn(window, 'confirm').mockImplementation(() => true);
        (apiSupabase.importData as any).mockResolvedValue({ success: true });

        if (fileInput) {
            Object.defineProperty(fileInput, 'files', {
                value: [mockFile],
            });
            fireEvent.change(fileInput);
        }

        await waitFor(() => {
            expect(apiSupabase.importData).toHaveBeenCalledWith({ products: [] });
        });

        expect(screen.getByText(/Import completed successfully/i)).toBeInTheDocument();
    });
});
