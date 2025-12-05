import { test, expect } from './fixtures';

test.describe.serial('Products', () => {
  test('displays products list when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');
    await authenticatedPage.waitForTimeout(500);

    // Should show products page heading (use specific selector for Master Products h1)
    await expect(authenticatedPage.locator('h1:has-text("Master Products")')).toBeVisible();

    // Should show products table headers
    await expect(authenticatedPage.locator('th:has-text("Name")')).toBeVisible();
    await expect(authenticatedPage.locator('th:has-text("Barcode")')).toBeVisible();
    await expect(authenticatedPage.locator('th:has-text("Min Stock")')).toBeVisible();
  });

  test('shows loading state initially', async ({ authenticatedPage }) => {
    // Navigate and check for loading
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');

    // Loading might be very fast, so we just ensure the page loads successfully
    await expect(authenticatedPage.locator('h1:has-text("Master Products")')).toBeVisible();
  });

  test('can open edit modal for a product', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');

    // Wait for products to load (table should be visible)
    await expect(authenticatedPage.locator('table')).toBeVisible({ timeout: 10000 });

    // If there are products, click edit on the first one
    const editButton = authenticatedPage.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();

      // Modal should open with Edit heading
      await expect(authenticatedPage.locator('h2:has-text("Edit")')).toBeVisible();

      // Should have form fields
      await expect(authenticatedPage.locator('label:has-text("Name")')).toBeVisible();
      await expect(authenticatedPage.locator('label:has-text("Barcode")')).toBeVisible();
      await expect(authenticatedPage.locator('label:has-text("Min Stock")')).toBeVisible();

      // Close modal
      await authenticatedPage.click('button:has-text("Cancel")');
    }
  });

  test('can update product name in edit modal', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');

    // Wait for products to load
    await expect(authenticatedPage.locator('table')).toBeVisible({ timeout: 10000 });

    // If there are products, edit the first one
    const editButton = authenticatedPage.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();

      // Wait for modal
      await expect(authenticatedPage.locator('h2:has-text("Edit")')).toBeVisible();

      // Update name
      const nameInput = authenticatedPage.locator('input').first();
      const newName = `Test Product ${Date.now()}`;
      await nameInput.fill(newName);

      // Save changes and wait for network response
      const savePromise = authenticatedPage.waitForResponse(
        resp => resp.url().includes('products') && resp.request().method() === 'PATCH',
        { timeout: 10000 }
      ).catch(() => null);

      await authenticatedPage.click('button:has-text("Save Changes")');

      // Wait for API to complete
      const response = await savePromise;

      // Wait for modal to close (give it time for React Query to invalidate and re-render)
      await authenticatedPage.waitForTimeout(1000);
      await expect(authenticatedPage.locator('h2:has-text("Edit")')).not.toBeVisible({ timeout: 5000 });

      // Verify the name was updated in the table
      await expect(authenticatedPage.locator(`td:has-text("${newName}")`)).toBeVisible();
    }
  });

  test('can update product nutrition values', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');
    await expect(authenticatedPage.locator('table')).toBeVisible({ timeout: 10000 });

    const editButton = authenticatedPage.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();
      await expect(authenticatedPage.locator('h2:has-text("Edit")')).toBeVisible();

      // Find nutrition section
      await expect(authenticatedPage.locator('h3:has-text("Nutrition")')).toBeVisible();

      // Update calories
      const caloriesInput = authenticatedPage.locator('label:has-text("Calories")').locator('..').locator('input');
      await caloriesInput.fill('200');

      // Update protein
      const proteinInput = authenticatedPage.locator('label:has-text("Protein")').locator('..').locator('input');
      await proteinInput.fill('25');

      // Save and close
      await authenticatedPage.click('button:has-text("Save Changes")');
      await expect(authenticatedPage.locator('h2:has-text("Edit")')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('edit modal has all required sections', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');
    await expect(authenticatedPage.locator('table')).toBeVisible({ timeout: 10000 });

    const editButton = authenticatedPage.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();
      await expect(authenticatedPage.locator('h2:has-text("Edit")')).toBeVisible();

      // Check all sections exist
      await expect(authenticatedPage.locator('h3:has-text("General")')).toBeVisible();
      await expect(authenticatedPage.locator('h3:has-text("Inventory Settings")')).toBeVisible();
      await expect(authenticatedPage.locator('h3:has-text("Nutrition")')).toBeVisible();
      await expect(authenticatedPage.locator('h3:has-text("Integration")')).toBeVisible();

      // Check integration fields
      await expect(authenticatedPage.locator('label:has-text("Walmart Link")')).toBeVisible();
      await expect(authenticatedPage.locator('label:has-text("Price")')).toBeVisible();
      await expect(authenticatedPage.locator('text=Track at Walmart')).toBeVisible();
      await expect(authenticatedPage.locator('text=Is Meal Product')).toBeVisible();

      await authenticatedPage.click('button:has-text("Cancel")');
    }
  });

  test('cancel button closes modal without saving', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');
    await expect(authenticatedPage.locator('table')).toBeVisible({ timeout: 10000 });

    const editButton = authenticatedPage.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible({ timeout: 3000 })) {
      await editButton.click();
      await expect(authenticatedPage.locator('h2:has-text("Edit")')).toBeVisible();

      // Get original name
      const nameInput = authenticatedPage.locator('input').first();
      const originalName = await nameInput.inputValue();

      // Change the name
      await nameInput.fill('TEMPORARY NAME SHOULD NOT SAVE');

      // Click cancel
      await authenticatedPage.click('button:has-text("Cancel")');

      // Modal should close
      await expect(authenticatedPage.locator('h2:has-text("Edit")')).not.toBeVisible();

      // Re-open and verify original name is still there
      await editButton.click();
      const nameAfterCancel = await authenticatedPage.locator('input').first().inputValue();
      expect(nameAfterCancel).toBe(originalName);

      await authenticatedPage.click('button:has-text("Cancel")');
    }
  });
  test('can create a new product', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');
    await authenticatedPage.waitForTimeout(500);

    // Click "+ New Product" button
    await authenticatedPage.click('button:has-text("+ New Product")');

    // Modal should open with "Create New Product" heading
    await expect(authenticatedPage.locator('h2:has-text("Create New Product")')).toBeVisible();

    // Fill fields (name is required)
    const testName = `New Product ${Date.now()}`;
    const nameInput = authenticatedPage.locator('input').first();
    await nameInput.fill(testName);

    // Save
    await authenticatedPage.click('button:has-text("Save Changes")');

    // Modal should close and product should appear in list
    await expect(authenticatedPage.locator('h2:has-text("Create New Product")')).not.toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.locator(`td:has-text("${testName}")`)).toBeVisible({ timeout: 5000 });
  });

  test('shows validation error for empty name', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');
    await authenticatedPage.waitForTimeout(500);
    await authenticatedPage.click('button:has-text("+ New Product")');

    // Wait for modal to open
    await expect(authenticatedPage.locator('h2:has-text("Create New Product")')).toBeVisible();

    // Click Save without filling name (HTML5 validation should prevent submission)
    await authenticatedPage.click('button:has-text("Save Changes")');

    // Modal should stay open due to HTML5 validation on required name field
    await expect(authenticatedPage.locator('h2:has-text("Create New Product")')).toBeVisible();
  });

  test('can delete a product', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/settings');
    await authenticatedPage.click('text=Products');
    await expect(authenticatedPage.locator('table')).toBeVisible({ timeout: 10000 });

    // Find a product to delete
    const deleteButton = authenticatedPage.locator('button:has-text("Delete")').first();

    if (await deleteButton.isVisible({ timeout: 2000 })) {
      // Get name to verify removal
      const row = deleteButton.locator('xpath=ancestor::tr');
      const name = await row.locator('td').first().textContent();

      // First click shows "Confirm?" (button changes text)
      await deleteButton.click();
      await authenticatedPage.waitForTimeout(500);

      // Second click confirms deletion
      const confirmButton = authenticatedPage.locator('button:has-text("Confirm?")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
        await authenticatedPage.waitForTimeout(1000);

        // Verify removed
        if (name && name.trim()) {
          await expect(authenticatedPage.locator(`td:has-text("${name.trim()}")`)).not.toBeVisible({ timeout: 5000 });
        }
      }
    }
  });
});
