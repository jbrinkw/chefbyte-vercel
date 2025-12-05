/**
 * Automation Logic
 * Replaces Python scripts for maintaining data consistency.
 */

const { db } = require('./db');

/**
 * Updates cached macro totals for all recipes based on their ingredients.
 * Replaces update_recipe_macros.py
 */
function updateAllRecipeMacros() {
    console.log('[Automation] Updating recipe macros...');
    const recipes = db.prepare('SELECT id, base_servings FROM recipes').all();
    let updated = 0;

    const updateStmt = db.prepare(`
    UPDATE recipes 
    SET calories = ?, carbs = ?, protein = ?, fat = ? 
    WHERE id = ?
  `);

    for (const recipe of recipes) {
        const ingredients = db.prepare(`
      SELECT ri.amount, p.calories_per_serving, p.carbs_per_serving, p.protein_per_serving, p.fat_per_serving, p.num_servings, qu.name as unit
      FROM recipe_ingredients ri
      JOIN products p ON ri.product_id = p.id
      LEFT JOIN quantity_units qu ON ri.qu_id = qu.id
      WHERE ri.recipe_id = ?
    `).all(recipe.id);

        let totalCal = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;

        for (const ing of ingredients) {
            // Logic to convert amount to servings
            // Simplified: Assume amount is in "Servings" or "Pieces" which match product stats
            // If unit is "Container" or similar, we might need conversion.
            // For now, assume 1 unit of ingredient = 1 serving of product unless specified.
            // The Python script had complex logic. Here we'll simplify:
            // If unit is 'Serving', multiplier = amount.
            // If unit is 'Container' (or default), multiplier = amount * num_servings.

            let multiplier = ing.amount;
            if (ing.unit && !ing.unit.toLowerCase().includes('serving')) {
                multiplier = ing.amount * (ing.num_servings || 1);
            }

            totalCal += (ing.calories_per_serving || 0) * multiplier;
            totalCarbs += (ing.carbs_per_serving || 0) * multiplier;
            totalProtein += (ing.protein_per_serving || 0) * multiplier;
            totalFat += (ing.fat_per_serving || 0) * multiplier;
        }

        // Per serving for the recipe
        const base = recipe.base_servings || 1;
        const perServing = {
            cal: totalCal / base,
            carbs: totalCarbs / base,
            protein: totalProtein / base,
            fat: totalFat / base
        };

        updateStmt.run(perServing.cal, perServing.carbs, perServing.protein, perServing.fat, recipe.id);
        updated++;
    }
    console.log(`[Automation] Updated macros for ${updated} recipes.`);
}

/**
 * Creates [MEAL] products for recipes.
 * Replaces create_meal_products.py
 */
function syncMealProducts() {
    console.log('[Automation] Syncing meal products...');
    const recipes = db.prepare('SELECT * FROM recipes').all();
    let created = 0;

    const insertProduct = db.prepare(`
    INSERT INTO products (name, description, is_meal_product, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, location_id, qu_id_stock)
    VALUES (?, ?, 1, ?, ?, ?, ?, 1, 1)
  `);

    const updateRecipe = db.prepare('UPDATE recipes SET product_id = ? WHERE id = ?');

    for (const recipe of recipes) {
        // Check if product exists
        if (recipe.product_id) {
            const exists = db.prepare('SELECT id FROM products WHERE id = ?').get(recipe.product_id);
            if (exists) continue; // Already linked
        }

        // Create product
        const name = `[MEAL] ${recipe.name}`;
        const info = insertProduct.run(
            name,
            `Auto-generated for recipe: ${recipe.name}`,
            recipe.calories || 0,
            recipe.carbs || 0,
            recipe.protein || 0,
            recipe.fat || 0
        );

        // Link back
        updateRecipe.run(info.lastInsertRowid, recipe.id);
        created++;
    }
    console.log(`[Automation] Created ${created} meal products.`);
}

module.exports = {
    updateAllRecipeMacros,
    syncMealProducts
};
