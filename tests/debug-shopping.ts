import { chromium } from '@playwright/test';

async function debugShoppingAdd() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  // Listen for failed requests
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  // Listen for responses
  page.on('response', response => {
    if (response.url().includes('supabase') && response.status() >= 400) {
      console.log('SUPABASE ERROR:', response.status(), response.url());
      response.text().then(text => console.log('Response body:', text));
    }
  });

  const testUser = {
    email: `test-debug-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  };

  console.log('=== Debug Shopping List Add ===');
  console.log('Test user:', testUser.email);

  // Signup
  console.log('\n1. Signing up...');
  await page.goto('http://localhost:5173/signup');
  await page.fill('#email', testUser.email);
  await page.fill('#password', testUser.password);
  await page.fill('#confirmPassword', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Login
  console.log('\n2. Logging in...');
  await page.goto('http://localhost:5173/login');
  await page.fill('#email', testUser.email);
  await page.fill('#password', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Go to shopping list
  console.log('\n3. Going to shopping list...');
  await page.goto('http://localhost:5173/shopping-list');
  await page.waitForTimeout(2000);

  // Try to add item
  console.log('\n4. Adding item...');
  const input = page.locator('input[placeholder="Item name"]');
  await input.fill('Debug Test Item');
  await page.waitForTimeout(500);

  const addButton = page.getByRole('button', { name: 'Add', exact: true });
  console.log('Button disabled?', await addButton.isDisabled());

  // Intercept the actual API call
  const responsePromise = page.waitForResponse(
    response => response.url().includes('shopping_list'),
    { timeout: 10000 }
  ).catch(e => {
    console.log('No shopping_list response caught');
    return null;
  });

  await addButton.click();
  console.log('Clicked Add button');

  const response = await responsePromise;
  if (response) {
    console.log('\nAPI Response:');
    console.log('  URL:', response.url());
    console.log('  Status:', response.status());
    const body = await response.text();
    console.log('  Body:', body.substring(0, 500));
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/debug-after-add.png', fullPage: true });

  // Check page content
  const toBuyText = await page.locator('text=/To Buy/').textContent();
  console.log('\nTo Buy section text:', toBuyText);

  const inputValue = await input.inputValue();
  console.log('Input value after add:', inputValue || '(empty)');

  console.log('\n=== Debug complete ===');
  await browser.close();
}

debugShoppingAdd().catch(console.error);
