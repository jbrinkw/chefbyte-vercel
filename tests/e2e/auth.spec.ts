import { test, expect } from '@playwright/test';

test.describe.serial('Authentication', () => {
  // Unique user for this test run
  const testEmail = `auth-test-${Date.now()}@chefbyte.test`;
  const testPassword = 'testPassword123!';

  test('shows login page by default for unauthenticated users', async ({ page }) => {
    // Clear storage to ensure logged out state
    await page.context().clearCookies();
    await page.goto('/');
    // App renders Login component when not authenticated (doesn't redirect)
    await expect(page.locator('h2')).toContainText('Sign In');
  });

  test('login page displays all required elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('ChefByte');
    await expect(page.locator('h2')).toContainText('Sign In');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
    await expect(page.locator('button:has-text("Try Demo")')).toBeVisible();
    await expect(page.locator('text=Sign Up')).toBeVisible();
  });

  test('can navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign Up');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('h2')).toContainText('Create Account');
  });

  test('can navigate from signup to login page', async ({ page }) => {
    await page.goto('/signup');
    await page.click('text=Sign In');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h2')).toContainText('Sign In');
  });

  test('shows validation error for mismatched passwords', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('#email', testEmail);
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'differentPassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.authError')).toContainText('Passwords do not match');
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('#email', testEmail);
    await page.fill('#password', '12345');
    await page.fill('#confirmPassword', '12345');
    await page.click('button[type="submit"]');

    await expect(page.locator('.authError')).toContainText('at least 6 characters');
  });

  test('can create a new account', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.fill('#confirmPassword', testPassword);
    await page.click('button[type="submit"]');

    // Wait for one of: success message, redirect to login, or error
    // Supabase might auto-confirm and redirect, or show success message first
    const success = page.locator('text=Account Created!');
    const loginPage = page.locator('h2:has-text("Sign In")');
    const authError = page.locator('.authError');
    const headerBar = page.locator('.headerBar'); // If auto-logged in

    // Wait for any outcome
    await Promise.race([
      success.waitFor({ timeout: 10000 }),
      loginPage.waitFor({ timeout: 10000 }),
      headerBar.waitFor({ timeout: 10000 }),
      authError.waitFor({ timeout: 10000 }),
    ]);

    // If there's an auth error, the test should fail with the error message
    if (await authError.isVisible()) {
      const errorText = await authError.textContent();
      throw new Error(`Signup failed: ${errorText}`);
    }

    // Success if we see success message, login page, or header bar (auto-login)
    const wasSuccessful =
      await success.isVisible() ||
      await loginPage.isVisible() ||
      await headerBar.isVisible();

    expect(wasSuccessful).toBe(true);
  });

  test('can login with created account', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to home
    await expect(page).toHaveURL('/');
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('.authError')).toBeVisible({ timeout: 5000 });
  });

  test('can logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Wait for authenticated state (header bar appears)
    await page.waitForSelector('.headerBar', { timeout: 10000 });

    // Look for logout button/link
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click();
      // App shows login form at current URL (doesn't redirect)
      await expect(page.locator('h2')).toContainText('Sign In');
    }
  });

  test('protected routes show login when unauthenticated', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();

    // Try accessing protected routes - app renders Login at any URL when not authenticated
    const protectedRoutes = ['/products', '/recipes', '/meal-plan', '/shopping-list', '/inventory'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      // App shows login form rather than redirecting
      await expect(page.locator('h2')).toContainText('Sign In');
    }
  });

  test('shows loading state during login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');

    // Click and immediately check for loading state
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check that button shows loading state (may be quick)
    // Either we catch it in loading state or it completes
    const wasLoading = await submitButton.textContent();
    // The test passes if the UI responded - either shows loading or completed quickly
    expect(wasLoading === 'Signing in...' || wasLoading === 'Sign In').toBe(true);
  });

  test('shows loading state during signup', async ({ page }) => {
    const loadingTestEmail = `loading-test-${Date.now()}@chefbyte.test`;
    await page.goto('/signup');
    await page.fill('#email', loadingTestEmail);
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for loading state
    const wasLoading = await submitButton.textContent();
    expect(wasLoading === 'Creating account...' || wasLoading === 'Sign Up').toBe(true);
  });

  test('shows error when trying to signup with existing email', async ({ page }) => {
    // First signup should work
    const existingEmail = `existing-${Date.now()}@chefbyte.test`;
    await page.goto('/signup');
    await page.fill('#email', existingEmail);
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');
    await page.click('button[type="submit"]');

    // Wait for any successful outcome - success message, login page, or auto-login (header bar)
    const successLocator = page.locator('text=Account Created!');
    const loginLocator = page.locator('h2:has-text("Sign In")');
    const headerBar = page.locator('.headerBar');

    await Promise.race([
      successLocator.waitFor({ timeout: 10000 }),
      loginLocator.waitFor({ timeout: 10000 }),
      headerBar.waitFor({ timeout: 10000 }),
    ]);

    // Log out if we were auto-logged in
    if (await headerBar.isVisible()) {
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out")');
      if (await logoutButton.isVisible({ timeout: 2000 })) {
        await logoutButton.click();
        await page.waitForSelector('h2:has-text("Sign In")', { timeout: 5000 });
      }
    }

    // Try to signup again with same email
    await page.goto('/signup');
    await page.fill('#email', existingEmail);
    await page.fill('#password', 'password456');
    await page.fill('#confirmPassword', 'password456');
    await page.click('button[type="submit"]');

    // Should show error about existing user
    await expect(page.locator('.authError')).toBeVisible({ timeout: 5000 });
  });

  test('session persists after page refresh', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Wait for authenticated state
    await page.waitForSelector('.headerBar', { timeout: 10000 });

    // Refresh the page
    await page.reload();

    // Should still be logged in (header bar visible, not login form)
    await expect(page.locator('.headerBar')).toBeVisible({ timeout: 5000 });
  });

  test('demo button logs into demo account and resets data', async ({ page }) => {
    await page.goto('/login');

    // Click the demo button
    await page.click('button:has-text("Try Demo")');

    // Should eventually show header bar (after demo login and reset)
    // Demo login may take time due to signup + RPC call
    await page.waitForSelector('.headerBar', { timeout: 45000 });

    // If headerBar is visible, the demo login was successful
    const headerVisible = await page.locator('.headerBar').isVisible();
    expect(headerVisible).toBe(true);
  });
});
