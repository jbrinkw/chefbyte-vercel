import { test as base, Page } from '@playwright/test';

// Use demo account for faster, more reliable tests
const DEMO_EMAIL = 'demo2@chefbyte.test';
const DEMO_PASSWORD = 'DemoPassword123!';

// Extend base test with authenticated page
export const test = base.extend<{
  authenticatedPage: Page;
  testUser: { email: string; password: string };
}>({
  // Provide test user credentials
  testUser: async ({ }, use) => {
    await use({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
  },

  // Provide an authenticated page using demo account
  authenticatedPage: async ({ page }, use) => {
    // Try to login with demo account
    await page.goto('/login');
    await page.fill('#email', DEMO_EMAIL);
    await page.fill('#password', DEMO_PASSWORD);
    await page.click('button[type="submit"]');

    // Check if login worked
    const headerBar = page.locator('.headerBar');
    const authError = page.locator('.authError');

    try {
      await headerBar.waitFor({ timeout: 10000 });
    } catch {
      // Demo account might not exist, try creating it
      console.log('[Fixture] Demo login failed, creating account...');

      await page.goto('/signup');
      await page.fill('#email', DEMO_EMAIL);
      await page.fill('#password', DEMO_PASSWORD);
      await page.fill('#confirmPassword', DEMO_PASSWORD);
      await page.click('button[type="submit"]');

      // Wait for signup to complete
      const success = page.locator('text=Account Created!');
      try {
        await success.waitFor({ timeout: 10000 });
        await page.waitForTimeout(2500);
      } catch {
        // Already exists or other issue
      }

      // Try login again
      await page.goto('/login');
      await page.fill('#email', DEMO_EMAIL);
      await page.fill('#password', DEMO_PASSWORD);
      await page.click('button[type="submit"]');

      try {
        await headerBar.waitFor({ timeout: 10000 });
      } catch {
        const errorText = await authError.textContent().catch(() => 'Unknown error');
        throw new Error(`Authentication failed: ${errorText}`);
      }
    }

    // Provide the authenticated page
    await use(page);
  },
});

export { expect } from '@playwright/test';

// Helper function to login an existing user
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// Helper to wait for navigation with loading states
export async function waitForPageLoad(page: Page) {
  // Wait for any loading spinners to disappear
  await page.waitForSelector('.loading', { state: 'hidden', timeout: 10000 }).catch(() => { });
}

// Helper to create a product via UI
export async function createTestProduct(page: Page, name: string, barcode?: string) {
  await page.goto('/products');
  await page.click('button:has-text("Add Product")');
  await page.fill('input[name="name"]', name);
  if (barcode) {
    await page.fill('input[name="barcode"]', barcode);
  }
  await page.click('button:has-text("Save")');
  await page.waitForSelector(`text=${name}`);
}

// Helper to create a recipe via UI
export async function createTestRecipe(page: Page, name: string, servings: number = 4) {
  await page.goto('/recipes/create');
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="base_servings"]', servings.toString());
  await page.click('button:has-text("Create Recipe")');
  await page.waitForURL(/\/recipes\/\d+/);
}
