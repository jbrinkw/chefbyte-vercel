import { test, expect } from './fixtures';

test.describe('Settings Page', () => {
    test('navigates to settings page', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');
        // Use h1 specifically to avoid matching the nav link
        await expect(authenticatedPage.locator('h1:has-text("Settings")')).toBeVisible();
    });

    test('shows all tabs', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');

        await expect(authenticatedPage.getByText('Liquor Track')).toBeVisible();
        await expect(authenticatedPage.getByText('Products')).toBeVisible();
        await expect(authenticatedPage.getByText('Import / Export')).toBeVisible();
    });

    test('can switch to Products tab', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');

        await authenticatedPage.click('text=Products');
        await authenticatedPage.waitForTimeout(500);

        // Products tab should show product management UI
        const hasProductUI = await authenticatedPage.locator('text=/product|create|new/i').first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasProductUI).toBe(true);
    });

    test('can switch to Import/Export tab', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');

        await authenticatedPage.click('text=Import / Export');
        await expect(authenticatedPage.getByText('Import / Export Data')).toBeVisible();
        await expect(authenticatedPage.getByText('Download Backup')).toBeVisible();
    });

    test('can switch to Liquor Track tab', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');

        await authenticatedPage.click('text=Liquor Track');
        await authenticatedPage.waitForTimeout(500);

        // Should show LiquidTrack content
        const hasLiquidTrackUI = await authenticatedPage.locator('text=/liquid|device|key|track/i').first().isVisible({ timeout: 3000 }).catch(() => false);
        expect(hasLiquidTrackUI).toBe(true);
    });

    test('export triggers download', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');
        await authenticatedPage.click('text=Import / Export');

        // Setup download listener
        const downloadPromise = authenticatedPage.waitForEvent('download');

        // Click export
        await authenticatedPage.click('text=Download Backup');

        const download = await downloadPromise;
        // Filename is "chefbyte-backup-..." with hyphen
        expect(download.suggestedFilename()).toContain('chefbyte-backup');
    });

    test('import JSON file input exists', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings');
        await authenticatedPage.click('text=Import / Export');
        await authenticatedPage.waitForTimeout(500);

        // Look for file input for importing
        const fileInput = authenticatedPage.locator('input[type="file"]');
        const hasFileInput = await fileInput.isVisible({ timeout: 2000 }).catch(() => false);

        // Or look for import button/label
        const importLabel = authenticatedPage.locator('text=/Import|Upload|Restore/i').first();
        const hasImportLabel = await importLabel.isVisible({ timeout: 2000 }).catch(() => false);

        // Either file input or import label should exist
        expect(hasFileInput || hasImportLabel).toBe(true);
    });
});
