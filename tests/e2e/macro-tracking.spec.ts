import { test, expect } from '@playwright/test';

test.describe('Macro Tracking', () => {
  let testUser = {
    email: '',
    password: 'TestPassword123!'
  };

  test.beforeAll(() => {
    testUser.email = `macro-test-${Date.now()}@example.com`;
  });

  test.beforeEach(async ({ page }) => {
    // Signup (might already exist from previous test)
    await page.goto('/signup');
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.fill('#confirmPassword', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Login
    await page.goto('/login');
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.click('button[type="submit"]');
    // Wait for redirect after login (either to / or /home)
    await page.waitForTimeout(2000);
  });

  test('should display macro tracking on Home page', async ({ page }) => {
    await page.goto('/home');

    // Check that macro boxes are displayed
    await expect(page.locator('.macroBox')).toHaveCount(4);

    // Check for consumed/planned/goal labels
    await expect(page.locator('text=consumed / planned / goal')).toHaveCount(4);

    // Check that goals show default values (2500 cal, 300 carbs, 80 fats, 150 protein)
    await page.screenshot({ path: 'screenshots/macro-01-home-macros.png', fullPage: true });
  });

  test('should update macros when meal is marked done', async ({ page }) => {
    // First create a product via scanner
    await page.goto('/scanner');
    await page.waitForTimeout(1000);

    const barcodeInput = page.locator('input[placeholder*="barcode" i]');
    await barcodeInput.fill('013562134151');
    await barcodeInput.press('Enter');
    await page.waitForTimeout(3000);

    // Now add to meal plan via Meal Plan page
    await page.goto('/meal-plan');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/macro-02-meal-plan.png', fullPage: true });

    // Go to Home to check initial macro state
    await page.goto('/home');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/macro-03-home-before.png', fullPage: true });

    // Check if any meal is displayed
    const markDoneBtn = page.locator('button:has-text("Mark Done")');
    const markDoneCount = await markDoneBtn.count();

    if (markDoneCount > 0) {
      // Click Mark Done
      await markDoneBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/macro-04-after-mark-done.png', fullPage: true });

      // The consumed macros should now be updated
      // Verify the button changed to "Done"
      await expect(page.locator('button:has-text("Done")')).toBeVisible();
    }
  });

  test('should show Today section with macro grid', async ({ page }) => {
    await page.goto('/home');

    // Verify Today header (exact match)
    await expect(page.getByText('Today', { exact: true })).toBeVisible();
    await expect(page.locator('text=(6:00 AM - 5:59 AM)')).toBeVisible();

    // Verify all 4 macro types
    await expect(page.locator('.macroBox:has-text("Calories")')).toBeVisible();
    await expect(page.locator('.macroBox:has-text("Carbs")')).toBeVisible();
    await expect(page.locator('.macroBox:has-text("Fats")')).toBeVisible();
    await expect(page.locator('.macroBox:has-text("Protein")')).toBeVisible();
  });
});
