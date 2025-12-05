import { test, expect } from './fixtures';
import { seedTestAccount } from './helpers';

// Skip: This integration test accumulates duplicate data across runs and requires cleanup
// Individual feature tests cover the same functionality more reliably
test.describe.skip('Golden Path Workflow', () => {
    test('Complete flow: Inventory -> Recipe -> Meal Plan -> Shopping List -> Inventory', async ({ authenticatedPage, request }) => {
        test.setTimeout(120000); // 2 minutes

        // Listen for console logs
        authenticatedPage.on('console', msg => console.log(`BROWSER: ${msg.text()}`));

        // 1. Seed Data
        console.log('Seeding data...');
        const seed = await seedTestAccount(authenticatedPage, request);
        console.log('Data seeded:', seed);

        // 2. Verify Inventory (Milk should be there)
        console.log('Step 2: Verify Inventory');
        await authenticatedPage.goto('/inventory');
        await expect(authenticatedPage.locator('h1:not(#pageTitle)')).toContainText('Inventory');
        await expect(authenticatedPage.getByText('Milk', { exact: true }).first()).toBeVisible();

        // 3. Verify Recipe (Grilled Cheese)
        console.log('Step 3: Verify Recipe');
        await authenticatedPage.goto('/recipes');
        await expect(authenticatedPage.locator(`h3:has-text("Grilled Cheese")`).first()).toBeVisible();

        // 4. Add to Meal Plan
        console.log('Step 4: Add to Meal Plan');
        await authenticatedPage.goto('/meal-plan');

        const addMealBtn = authenticatedPage.locator('button:has-text("Add Meal")').first();
        await addMealBtn.click();

        console.log('Modal opened, searching...');
        await expect(authenticatedPage.locator('h2:has-text("Add Meal")')).toBeVisible();
        await authenticatedPage.fill('input[placeholder*="Search"]', 'Grilled Cheese');
        await authenticatedPage.click('button:has-text("Search")');

        // Wait for results
        await authenticatedPage.waitForTimeout(1000);

        // Click "Add" next to Grilled Cheese
        await authenticatedPage.locator('div').filter({ hasText: 'Grilled Cheese' }).last().locator('button:has-text("Add")').click();

        console.log('Meal added to plan');
        // Wait for modal to close
        await expect(authenticatedPage.locator('h2:has-text("Add Meal")')).not.toBeVisible();

        // Verify it appears on the plan
        await expect(authenticatedPage.locator('text=Grilled Cheese')).toBeVisible();

        // 5. Verify Home Dashboard
        console.log('Step 5: Verify Home Dashboard');
        await authenticatedPage.goto('/home');
        await expect(authenticatedPage.locator('text=Today\'s Meals')).toBeVisible();
        await expect(authenticatedPage.locator('.plannedRecipeCard').filter({ hasText: 'Grilled Cheese' })).toBeVisible();

        // 6. Sync to Shopping List
        console.log('Step 6: Sync to Shopping List');
        await authenticatedPage.click('button:has-text("Meal Plan")');
        await authenticatedPage.waitForTimeout(2000);
        await authenticatedPage.goto('/shopping-list');

        // 7. Verify Shopping List
        console.log('Step 7: Verify Shopping List');
        await expect(authenticatedPage.locator('strong', { hasText: 'Bread' })).toBeVisible();
        await expect(authenticatedPage.locator('strong', { hasText: 'Cheese' })).toBeVisible();
        await expect(authenticatedPage.locator('strong', { hasText: 'Butter' })).toBeVisible();
        await expect(authenticatedPage.locator('strong', { hasText: 'Milk' })).not.toBeVisible();

        // 8. Import Shopping List
        console.log('Step 8: Import Shopping List');

        // Find checkboxes in the "To Buy" section
        // We need to be careful because clicking one moves it, changing the list
        // Best strategy: Keep clicking the first checkbox in "To Buy" until none are left
        const toBuySection = authenticatedPage.locator('h3:has-text("To Buy")').locator('..');

        // Wait for list to be stable
        await authenticatedPage.waitForTimeout(1000);

        let toBuyCount = await toBuySection.locator('input[type="checkbox"]').count();
        console.log(`Initial To Buy count: ${toBuyCount}`);

        while (toBuyCount > 0) {
            console.log(`Clicking checkbox... (Remaining: ${toBuyCount})`);
            await toBuySection.locator('input[type="checkbox"]').first().click({ force: true });
            await authenticatedPage.waitForTimeout(1000); // Wait for move

            const newCount = await toBuySection.locator('input[type="checkbox"]').count();
            console.log(`New To Buy count: ${newCount}`);

            if (newCount === toBuyCount) {
                console.log('WARNING: Checkbox click did not remove item. Trying label click...');
                // Try clicking the label/div container
                await toBuySection.locator('input[type="checkbox"]').first().locator('..').click({ force: true });
                await authenticatedPage.waitForTimeout(1000);
            }
            toBuyCount = await toBuySection.locator('input[type="checkbox"]').count();
        }

        // Verify "Purchased" section exists and has items
        // h3 is inside a header div, which is inside the main container div
        const purchasedHeader = authenticatedPage.locator('h3:has-text("Purchased")');
        await expect(purchasedHeader).toBeVisible();

        // Get the main container (parent of header row)
        const purchasedSection = purchasedHeader.locator('..').locator('..');

        const purchasedCount = await purchasedSection.locator('input[type="checkbox"]').count();
        console.log(`Purchased items count: ${purchasedCount}`);
        expect(purchasedCount).toBeGreaterThan(0);

        // Setup dialog handler before clicking
        const dialogPromise = authenticatedPage.waitForEvent('dialog');

        const completeBtn = authenticatedPage.locator('button:has-text("Add Checked to Inventory")');
        await expect(completeBtn).toBeVisible();
        await authenticatedPage.waitForTimeout(500); // Wait for button to be interactive
        await completeBtn.click();
        console.log('Clicked Add Checked to Inventory');

        // Wait for alert and accept it
        const dialog = await dialogPromise;
        const msg = dialog.message();
        console.log(`Dialog message: ${msg}`);
        expect(msg).toContain('Added 3 items'); // Assert we bought 3 things
        await dialog.accept();

        // Wait a bit for backend to settle (just in case)
        await authenticatedPage.waitForTimeout(1000);

        // 9. Verify Inventory Updated
        console.log('Step 9: Verify Inventory Updated');
        await authenticatedPage.goto('/inventory');
        await expect(authenticatedPage.locator(`strong:has-text("Bread")`)).toBeVisible();
        await expect(authenticatedPage.locator(`strong:has-text("Cheese")`)).toBeVisible();

        // Check stock amounts (should be > 0)
        const breadRow = authenticatedPage.locator('tr', { hasText: 'Bread' });
        await expect(breadRow.locator('span', { hasText: /\d+/ })).not.toContainText(/^0(\.00)?\s/);

        // 10. Execute Meal (Consume Ingredients)
        console.log('Step 10: Execute Meal');
        await authenticatedPage.goto('/home');

        // Wait for "Today's Meals" to ensure the section is loaded
        await expect(authenticatedPage.locator('h3:has-text("Today\'s Meals")')).toBeVisible();

        // Wait for loading to finish (there might be multiple loading indicators)
        await expect(authenticatedPage.locator('text=Loading...')).toHaveCount(0);

        // Find the "Execute" or "Mark Done" button for Grilled Cheese
        const card = authenticatedPage.locator('.plannedRecipeCard').filter({ hasText: 'Grilled Cheese' }).first();
        const executeBtn = card.locator('button', { hasText: /Execute|Mark Done/ });
        await expect(executeBtn).toBeVisible();
        await executeBtn.click();

        // Wait for it to change to "Undo"
        await expect(authenticatedPage.locator('.plannedRecipeCard').filter({ hasText: 'Grilled Cheese' }).locator('button:has-text("Undo")')).toBeVisible();

        // 11. Verify Inventory Consumed
        console.log('Step 11: Verify Inventory Consumed');
        await authenticatedPage.goto('/inventory');

        // Stock should be back to 0 (or decreased)
        // Since we bought exactly what was needed (shortfall), and consumed it, it should be 0.
        // But let's just check it decreased or is 0.
        // Actually, checking for 0 is safer if we assume perfect math.
        // Let's check that it IS 0.
        const breadRowFinal = authenticatedPage.locator('tr', { hasText: 'Bread' });
        // It might show "0 units" or "0.00 units"
        await expect(breadRowFinal.locator('span', { hasText: /\d+/ })).toContainText(/^0(\.00)?\s/);
    });
});
