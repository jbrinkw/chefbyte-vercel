import { chromium } from '@playwright/test';

async function mealPlanManualTest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const testUser = {
    email: `test-mealplan-${Date.now()}@example.com`,
    password: 'TestPassword123!'
  };

  console.log('=== Meal Plan Manual Test ===');
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
  await page.waitForTimeout(2000);
  console.log('Authenticated!');

  // First create a product via scanner
  console.log('\n2. Creating product via scanner...');
  await page.goto('http://localhost:5173/scanner');
  await page.waitForTimeout(1000);

  const barcodeInput = page.locator('input[placeholder*="barcode" i]');
  await barcodeInput.fill('013562134151');
  await barcodeInput.press('Enter');
  await page.waitForTimeout(3000);

  // Click Complete to create product and add to inventory
  const completeBtn = page.getByRole('button', { name: 'Complete', exact: true });
  await completeBtn.click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/meal-01-product-created.png', fullPage: true });
  console.log('Screenshot: meal-01-product-created.png');

  // Check Products page and get product ID
  console.log('\n3. Checking Products page...');
  await page.goto('http://localhost:5173/products');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/meal-02-products-list.png', fullPage: true });
  console.log('Screenshot: meal-02-products-list.png');

  // Add product to today's meal plan via browser console
  console.log('\n4. Adding product to meal plan via API...');
  const today = new Date().toISOString().split('T')[0];

  // Use page.evaluate to call the API from within the browser context
  const mealPlanResult = await page.evaluate(async (day: string) => {
    // Get the apiSupabase from the window (we need to import it differently)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      'http://192.168.0.226:54321',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    );

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Get the product
    const { data: products } = await supabase
      .from('products')
      .select('id, name')
      .eq('user_id', user.id)
      .limit(1);

    if (!products || products.length === 0) return { error: 'No products found' };

    const product = products[0];

    // Create meal plan entry for today
    const { data: mealPlan, error } = await supabase
      .from('meal_plan')
      .insert({
        user_id: user.id,
        day: day,
        product_id: product.id,
        amount: 1,
        done: false,
      })
      .select()
      .single();

    if (error) return { error: error.message };
    return { success: true, mealPlan, product };
  }, today);

  console.log('Meal plan result:', mealPlanResult);

  // Go to Home page to check Today's Meals
  console.log('\n5. Checking Home page for Today\'s Meals...');
  await page.goto('http://localhost:5173/home');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/meal-03-home-with-meal.png', fullPage: true });
  console.log('Screenshot: meal-03-home-with-meal.png');

  // Check if Mark Done button exists
  console.log('\n6. Looking for Mark Done button...');
  const markDoneBtn = page.locator('button:has-text("Mark Done")');
  const markDoneCount = await markDoneBtn.count();
  console.log(`Found ${markDoneCount} Mark Done buttons`);

  if (markDoneCount > 0) {
    const isDisabled = await markDoneBtn.first().isDisabled();
    console.log(`Mark Done button disabled: ${isDisabled}`);

    if (!isDisabled) {
      console.log('Clicking Mark Done button...');
      await markDoneBtn.first().click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/meal-04-after-mark-done.png', fullPage: true });
      console.log('Screenshot: meal-04-after-mark-done.png');
    }
  }

  // Refresh and check final state
  console.log('\n7. Refreshing to verify meal is marked done...');
  await page.reload();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'screenshots/meal-05-final-state.png', fullPage: true });
  console.log('Screenshot: meal-05-final-state.png');

  await browser.close();
  console.log('\n=== Meal Plan Manual Test Complete ===');
  console.log('Screenshots saved to ./screenshots/meal-*.png');
}

mealPlanManualTest().catch(console.error);
