import { chromium } from '@playwright/test';

const BARCODE = '013562134151';

async function scannerManualTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const testUser = {
    email: `test-scanner-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  };

  console.log('=== Scanner Manual Test ===');
  console.log('Barcode:', BARCODE);
  console.log('Test user:', testUser.email);

  // Signup + Login
  console.log('\n1. Authenticating...');
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
  console.log('Authenticated!');

  // Go to scanner
  console.log('\n2. Navigating to Scanner...');
  await page.goto('http://localhost:5173/scanner');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/scanner-01-initial.png', fullPage: true });
  console.log('Screenshot: scanner-01-initial.png');

  // ===== PURCHASE MODE =====
  console.log('\n=== PURCHASE MODE ===');

  console.log('3. Clicking Purchase button...');
  await page.click('button:has-text("Purchase")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/scanner-02-purchase-mode.png', fullPage: true });
  console.log('Screenshot: scanner-02-purchase-mode.png');

  console.log('4. Entering barcode:', BARCODE);
  const barcodeInput = page.locator('input[placeholder*="barcode" i]');
  await barcodeInput.fill(BARCODE);
  await page.screenshot({ path: 'screenshots/scanner-03-barcode-entered.png', fullPage: true });
  console.log('Screenshot: scanner-03-barcode-entered.png');

  console.log('5. Submitting barcode (Enter)...');
  await barcodeInput.press('Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/scanner-04-after-barcode-submit.png', fullPage: true });
  console.log('Screenshot: scanner-04-after-barcode-submit.png');

  console.log('6. Checking if product loaded in queue...');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/scanner-05-product-in-queue.png', fullPage: true });
  console.log('Screenshot: scanner-05-product-in-queue.png');

  console.log('7. Clicking keypad buttons (entering amount)...');
  // Try clicking keypad 2
  const key2 = page.locator('button:has-text("2")').first();
  if (await key2.isVisible()) {
    await key2.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: 'screenshots/scanner-06-keypad-used.png', fullPage: true });
  console.log('Screenshot: scanner-06-keypad-used.png');

  console.log('8. Clicking Complete...');
  const completeBtn = page.getByRole('button', { name: 'Complete', exact: true });
  if (await completeBtn.isEnabled()) {
    await completeBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: 'screenshots/scanner-07-after-complete-purchase.png', fullPage: true });
  console.log('Screenshot: scanner-07-after-complete-purchase.png');

  // ===== CONSUME MODE =====
  console.log('\n=== CONSUME MODE ===');

  console.log('9. Clicking Consume button...');
  await page.click('button:has-text("Consume")');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/scanner-08-consume-mode.png', fullPage: true });
  console.log('Screenshot: scanner-08-consume-mode.png');

  console.log('10. Entering barcode for consume...');
  await barcodeInput.fill(BARCODE);
  await barcodeInput.press('Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/scanner-09-consume-barcode-submitted.png', fullPage: true });
  console.log('Screenshot: scanner-09-consume-barcode-submitted.png');

  console.log('11. Entering consume amount (1)...');
  const key1 = page.locator('button:has-text("1")').first();
  if (await key1.isVisible()) {
    await key1.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: 'screenshots/scanner-10-consume-amount.png', fullPage: true });
  console.log('Screenshot: scanner-10-consume-amount.png');

  console.log('12. Clicking Complete for consume...');
  if (await completeBtn.isEnabled()) {
    await completeBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: 'screenshots/scanner-11-after-complete-consume.png', fullPage: true });
  console.log('Screenshot: scanner-11-after-complete-consume.png');

  // ===== ADD TO SHOPPING MODE =====
  console.log('\n=== ADD TO SHOPPING MODE ===');

  console.log('13. Clicking Add to Shopping button...');
  await page.click('text=Add to Shopping');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/scanner-12-shopping-mode.png', fullPage: true });
  console.log('Screenshot: scanner-12-shopping-mode.png');

  console.log('14. Entering barcode for shopping...');
  await barcodeInput.fill(BARCODE);
  await barcodeInput.press('Enter');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/scanner-13-shopping-barcode-submitted.png', fullPage: true });
  console.log('Screenshot: scanner-13-shopping-barcode-submitted.png');

  console.log('15. Entering shopping amount (3)...');
  const key3 = page.locator('button:has-text("3")').first();
  if (await key3.isVisible()) {
    await key3.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: 'screenshots/scanner-14-shopping-amount.png', fullPage: true });
  console.log('Screenshot: scanner-14-shopping-amount.png');

  console.log('16. Clicking Complete for shopping...');
  if (await completeBtn.isEnabled()) {
    await completeBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: 'screenshots/scanner-15-after-complete-shopping.png', fullPage: true });
  console.log('Screenshot: scanner-15-after-complete-shopping.png');

  // ===== VERIFY RESULTS =====
  console.log('\n=== VERIFYING RESULTS ===');

  console.log('17. Checking Inventory...');
  await page.goto('http://localhost:5173/inventory');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/scanner-16-inventory-check.png', fullPage: true });
  console.log('Screenshot: scanner-16-inventory-check.png');

  console.log('18. Checking Shopping List...');
  await page.goto('http://localhost:5173/shopping-list');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/scanner-17-shopping-list-check.png', fullPage: true });
  console.log('Screenshot: scanner-17-shopping-list-check.png');

  console.log('\n=== Scanner Manual Test Complete ===');
  console.log('Screenshots saved to ./screenshots/scanner-*.png');

  await browser.close();
}

scannerManualTest().catch(console.error);
