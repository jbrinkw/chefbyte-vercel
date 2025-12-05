const { db, initDB } = require('../lib/db');
const { updateAllRecipeMacros, syncMealProducts } = require('../lib/automation');

console.log('Running DB Verification Tests...');

try {
    // Ensure DB is initialized
    initDB();

    // Test Data
    const TEST_BARCODE = 'TEST-12345';
    const TEST_PRODUCT_NAME = 'Test Product';

    // 1. Create Product
    console.log('1. Creating Test Product...');

    // Check if exists and delete
    const existing = db.prepare('SELECT id FROM products WHERE barcode = ?').get(TEST_BARCODE);
    if (existing) {
        console.log('   Cleaning up existing test data...');
        try {
            db.prepare('DELETE FROM stock WHERE product_id = ?').run(existing.id);
            db.prepare('DELETE FROM recipe_ingredients WHERE product_id = ?').run(existing.id);
            db.prepare('DELETE FROM shopping_list WHERE product_id = ?').run(existing.id);
            db.prepare('DELETE FROM meal_plan WHERE product_id = ?').run(existing.id);
            db.prepare('UPDATE recipes SET product_id = NULL WHERE product_id = ?').run(existing.id);
            db.prepare('DELETE FROM products WHERE id = ?').run(existing.id);
        } catch (err) {
            console.error('   Cleanup Failed:', err);
        }
    }

    const info = db.prepare(`
    INSERT INTO products (name, barcode, num_servings, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(TEST_PRODUCT_NAME, TEST_BARCODE, 5, 100, 10, 5, 2);
    const productId = info.lastInsertRowid;
    console.log(`   Product created with ID: ${productId}`);

    // 2. Add Stock (Purchase)
    console.log('2. Adding Stock (Purchase)...');
    // Simulate API: Purchase 2 containers (10 servings)
    const containers = 2;
    db.prepare('INSERT INTO stock (product_id, amount, location_id) VALUES (?, ?, 1)').run(productId, containers);

    const stock = db.prepare('SELECT sum(amount) as total FROM stock WHERE product_id = ?').get(productId);
    console.log(`   Stock total: ${stock.total} containers`);
    if (stock.total !== 2) throw new Error('Stock mismatch after purchase');

    // 3. Consume Stock
    console.log('3. Consuming Stock...');
    // Consume 1.5 containers
    const consumeAmount = 1.5;
    const stockRows = db.prepare('SELECT id, amount FROM stock WHERE product_id = ?').all(productId);
    let remaining = consumeAmount;
    for (const row of stockRows) {
        if (remaining <= 0) break;
        const take = Math.min(row.amount, remaining);
        const newAmt = row.amount - take;
        if (newAmt <= 0.001) db.prepare('DELETE FROM stock WHERE id = ?').run(row.id);
        else db.prepare('UPDATE stock SET amount = ? WHERE id = ?').run(newAmt, row.id);
        remaining -= take;
    }

    const stockAfter = db.prepare('SELECT sum(amount) as total FROM stock WHERE product_id = ?').get(productId);
    console.log(`   Stock total after consume: ${stockAfter.total} containers`);
    // Should be 0.5
    if (Math.abs((stockAfter.total || 0) - 0.5) > 0.001) throw new Error(`Stock mismatch after consume: expected 0.5, got ${stockAfter.total}`);

    // 4. Create Recipe
    console.log('4. Creating Recipe...');
    const rInfo = db.prepare('INSERT INTO recipes (name, base_servings) VALUES (?, ?)').run('Test Recipe', 1);
    const recipeId = rInfo.lastInsertRowid;

    // Add ingredient (0.2 container = 1 serving)
    // We need to specify a unit that implies "Container" (e.g. Pack) to test the conversion logic.
    const packUnit = db.prepare('SELECT id FROM quantity_units WHERE name = ?').get('Pack');
    const unitId = packUnit ? packUnit.id : null;
    db.prepare('INSERT INTO recipe_ingredients (recipe_id, product_id, amount, qu_id) VALUES (?, ?, ?, ?)').run(recipeId, productId, 0.2, unitId);

    // 5. Run Automation
    console.log('5. Running Automation...');
    updateAllRecipeMacros();

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId);
    console.log('   Recipe Macros:', recipe);

    // Expected: 0.2 container * 5 servings/container * 100 cal/serving = 100 cal
    if (Math.abs(recipe.calories - 100) > 0.1) throw new Error(`Recipe calories mismatch: expected 100, got ${recipe.calories}`);

    // 6. Sync Meal Products
    console.log('6. Syncing Meal Products...');
    syncMealProducts();
    const mealProduct = db.prepare('SELECT * FROM products WHERE name = ?').get(`[MEAL] Test Recipe`);
    if (!mealProduct) throw new Error('Meal product not created');
    console.log('   Meal Product created:', mealProduct.name);

    // Cleanup
    console.log('Cleaning up...');
    db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(recipeId);
    db.prepare('DELETE FROM recipes WHERE id = ?').run(recipeId);
    db.prepare('DELETE FROM stock WHERE product_id = ?').run(productId);
    db.prepare('DELETE FROM products WHERE id = ?').run(productId);
    db.prepare('DELETE FROM products WHERE id = ?').run(mealProduct.id);

    console.log('VERIFICATION SUCCESSFUL!');
} catch (e) {
    console.error('VERIFICATION FAILED:', e);
    require('fs').writeFileSync('error.txt', e.toString() + '\n' + (e.stack || ''));
    process.exit(1);
}
