import { chromium } from '@playwright/test';

async function checkModal() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const testUser = {
    email: `test-modal-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  };

  // Signup + Login
  await page.goto('http://localhost:5173/signup');
  await page.fill('#email', testUser.email);
  await page.fill('#password', testUser.password);
  await page.fill('#confirmPassword', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await page.goto('http://localhost:5173/login');
  await page.fill('#email', testUser.email);
  await page.fill('#password', testUser.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  // Go to home
  await page.goto('http://localhost:5173/home');
  await page.waitForTimeout(2000);

  // Click Target Macros
  await page.click('button:has-text("Target Macros")');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/target-macros-modal.png', fullPage: true });
  console.log('Screenshot saved: target-macros-modal.png');

  await browser.close();
}

checkModal().catch(console.error);
