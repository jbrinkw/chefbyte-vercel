import { test, expect } from '@playwright/test';

// Skip: This test requires Vercel serverless function (/api/liquidtrack) which isn't available in Vite dev mode
// To run this test, use `vercel dev` instead of `npm run dev`
test.skip('LiquidTrack E2E Flow', async ({ page, request }) => {
  test.setTimeout(120000); // 2 minute timeout for this test

  // 1. Signup/Login
  const userEmail = `test-liquid-${Date.now()}@example.com`;
  const userPass = 'TestPass123!';

  await page.goto('/signup');
  await page.fill('#email', userEmail);
  await page.fill('#password', userPass);
  await page.fill('#confirmPassword', userPass);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  // If redirected to login, log in
  if (page.url().includes('/login')) {
    await page.fill('#email', userEmail);
    await page.fill('#password', userPass);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  }

  // Wait for auth to settle
  await page.waitForTimeout(1000);

  // 2. Navigate to LiquidTrack page
  await page.goto('/settings');
  await page.click('text=Liquor Track');

  // Wait for page title to confirm we're authenticated and on the right page
  await expect(page.locator('h1:has-text("LiquidTrack")')).toBeVisible({ timeout: 10000 });

  // 3. Generate Device Key via UI
  const addDeviceBtn = page.locator('button:has-text("Add Device")');
  await expect(addDeviceBtn).toBeVisible({ timeout: 10000 });
  await addDeviceBtn.click();

  await page.fill('input[placeholder*="Device Name" i]', 'Test Scale');
  await page.click('button:has-text("Generate Key")');

  // Wait for key to appear in readonly input
  const keyInput = page.locator('input[readonly]');
  await expect(keyInput).toBeVisible({ timeout: 5000 });

  // Capture the generated API key
  const apiKey = await keyInput.inputValue();
  expect(apiKey).toBeTruthy();
  console.log('Generated API Key:', apiKey ? 'Yes (hidden)' : 'No');

  // 4. Dismiss the modal (don't need to since we just need the key)
  await page.waitForTimeout(500);

  // 5. Send liquid event via API endpoint (like ESP8266 would)
  const today = new Date();
  const timestamp = today.getTime();

  const eventPayload = {
    scale_id: 'test_scale_1',
    events: [{
      timestamp: timestamp,
      weight_before: 500,
      weight_after: 250,
      consumed: 250,
      is_refill: false,
      product_name: 'Test Water Today',
      calories: 100,
      protein: 0,
      carbs: 0,
      fat: 0
    }]
  };

  const response = await request.post('/api/liquidtrack', {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    data: eventPayload
  });

  expect(response.ok()).toBe(true);
  const responseData = await response.json();
  expect(responseData.success).toBe(true);
  console.log('Liquid event inserted via API');

  // 6. Verify Macros on Dashboard (UI)
  await page.goto('/home');
  await page.waitForTimeout(2000);

  // Verify "Test Water Today" is visible in the consumed items
  await expect(page.getByText('Test Water Today')).toBeVisible({ timeout: 5000 });

  // Verify Macros (100 cal) are counted in first macroBox
  await expect(page.locator('.macroBox').first()).toContainText('100');

  // 7. Send another event for YESTERDAY via API
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayTs = yesterday.getTime();

  const yesterdayPayload = {
    scale_id: 'test_scale_1',
    events: [{
      timestamp: yesterdayTs,
      weight_before: 500,
      weight_after: 250,
      consumed: 250,
      is_refill: false,
      product_name: 'Test Water Yesterday',
      calories: 50,
      protein: 0,
      carbs: 0,
      fat: 0
    }]
  };

  const response2 = await request.post('/api/liquidtrack', {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    data: yesterdayPayload
  });

  expect(response2.ok()).toBe(true);
  console.log('Yesterday liquid event inserted via API');

  // 8. Verify LiquidTrack page shows events
  await page.goto('/settings');
  await page.click('text=Liquor Track');
  await page.waitForTimeout(2000);

  // Should see our test events in the list
  await expect(page.getByText('Test Water Today')).toBeVisible({ timeout: 5000 });

  console.log('LiquidTrack E2E Flow completed successfully');
});
