import { chromium } from '@playwright/test';

async function manualTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const testUser = {
    email: `test-manual-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  };

  console.log('Starting manual test with screenshots...');
  console.log('Test user:', testUser.email);

  // 1. Go to login page
  console.log('\n1. Navigating to login page...');
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/01-login-page.png', fullPage: true });
  console.log('Screenshot: 01-login-page.png');

  // 2. Try signup first
  console.log('\n2. Navigating to signup...');
  await page.goto('http://localhost:5173/signup');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/02-signup-page.png', fullPage: true });

  await page.fill('#email', testUser.email);
  await page.fill('#password', testUser.password);
  await page.fill('#confirmPassword', testUser.password);
  await page.screenshot({ path: 'screenshots/03-signup-filled.png', fullPage: true });

  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/04-after-signup.png', fullPage: true });
  console.log('Screenshot: 04-after-signup.png');

  // 3. Login
  console.log('\n3. Logging in...');
  await page.goto('http://localhost:5173/login');
  await page.waitForTimeout(1000);
  await page.fill('#email', testUser.email);
  await page.fill('#password', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/05-after-login.png', fullPage: true });
  console.log('Screenshot: 05-after-login.png');

  // 4. Check if authenticated - go to home
  console.log('\n4. Going to home page...');
  await page.goto('http://localhost:5173/home');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/06-home-page.png', fullPage: true });
  console.log('Screenshot: 06-home-page.png');

  // 5. Shopping List page
  console.log('\n5. Going to shopping list...');
  await page.goto('http://localhost:5173/shopping-list');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/07-shopping-list.png', fullPage: true });
  console.log('Screenshot: 07-shopping-list.png');

  // 6. Try adding an item
  console.log('\n6. Adding item to shopping list...');
  const input = page.locator('input[placeholder="Item name"]');
  const addButton = page.getByRole('button', { name: 'Add', exact: true });

  // Check button state before
  const isDisabledBefore = await addButton.isDisabled();
  console.log('Add button disabled before typing:', isDisabledBefore);

  await input.fill('Test Item Manual');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/08-item-filled.png', fullPage: true });

  const isDisabledAfter = await addButton.isDisabled();
  console.log('Add button disabled after typing:', isDisabledAfter);

  if (!isDisabledAfter) {
    await addButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/09-after-add.png', fullPage: true });
    console.log('Screenshot: 09-after-add.png');
  } else {
    console.log('ERROR: Add button is still disabled!');
  }

  // 7. Products page
  console.log('\n7. Going to products page...');
  await page.goto('http://localhost:5173/products');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/10-products.png', fullPage: true });
  console.log('Screenshot: 10-products.png');

  // 8. Inventory page
  console.log('\n8. Going to inventory page...');
  await page.goto('http://localhost:5173/inventory');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/11-inventory.png', fullPage: true });
  console.log('Screenshot: 11-inventory.png');

  // 9. Recipes page
  console.log('\n9. Going to recipes page...');
  await page.goto('http://localhost:5173/recipes');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/12-recipes.png', fullPage: true });
  console.log('Screenshot: 12-recipes.png');

  // 10. Meal Plan page
  console.log('\n10. Going to meal plan page...');
  await page.goto('http://localhost:5173/meal-plan');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/13-meal-plan.png', fullPage: true });
  console.log('Screenshot: 13-meal-plan.png');

  // 11. Scanner page
  console.log('\n11. Going to scanner page...');
  await page.goto('http://localhost:5173/scanner');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/14-scanner.png', fullPage: true });
  console.log('Screenshot: 14-scanner.png');

  console.log('\n=== Manual test complete! ===');
  console.log('Screenshots saved to ./screenshots/');

  await browser.close();
}

manualTest().catch(console.error);
