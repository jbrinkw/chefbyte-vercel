/**
 * Automation Logic (TypeScript)
 * Replaces Python scripts for maintaining data consistency.
 */

import { db } from './db';

interface Recipe {
    id: number;
    base_servings: number | null;
    product_id: number | null;
    name: string;
    calories: number | null;
    carbs: number | null;
    protein: number | null;
    fat: number | null;
}

interface Ingredient {
    amount: number;
    calories_per_serving: number | null;
    carbs_per_serving: number | null;
    protein_per_serving: number | null;
    fat_per_serving: number | null;
    num_servings: number | null;
    unit: string | null;
}

/**
 * Updates cached macro totals for all recipes based on their ingredients.
 * Replaces update_recipe_macros.py
 */
export async function updateAllRecipeMacros(): Promise<void> {
    console.log('[ Automation] Updating recipe macros...');
    const recipes = await db.all('SELECT id, base_servings FROM recipes') as Recipe[];
    let updated = 0;

    for (const recipe of recipes) {
        const ingredients = await db.all(`
      SELECT ri.amount, p.calories_per_serving, p.carbs_per_serving, p.protein_per_serving, p.fat_per_serving, p.num_servings, qu.name as unit
      FROM recipe_ingredients ri
      JOIN products p ON ri.product_id = p.id
      LEFT JOIN quantity_units qu ON ri.qu_id = qu.id
      WHERE ri.recipe_id = $1
    `, [recipe.id]) as Ingredient[];

        let totalCal = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;

        for (const ing of ingredients) {
            // Logic to convert amount to servings
            // Simplified: Assume amount is in "Servings" or "Pieces" which match product stats
            // If unit is "Container" or similar, we might need conversion.
            // For now, assume 1 unit of ingredient = 1 serving of product unless specified.
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

        await db.query(`
            UPDATE recipes 
            SET calories = $1, carbs = $2, protein = $3, fat = $4 
            WHERE id = $5
        `, [perServing.cal, perServing.carbs, perServing.protein, perServing.fat, recipe.id]);
        updated++;
    }
    console.log(`[Automation] Updated macros for ${updated} recipes.`);
}

/**
 * Creates [MEAL] products for recipes.
 * Replaces create_meal_products.py
 */
export async function syncMealProducts(): Promise<void> {
    console.log('[Automation] Syncing meal products...');
    const recipes = await db.all('SELECT * FROM recipes') as Recipe[];
    let created = 0;

    for (const recipe of recipes) {
        // Check if product exists
        if (recipe.product_id) {
            const exists = await db.get('SELECT id FROM products WHERE id = $1', [recipe.product_id]);
            if (exists) continue; // Already linked
        }

        // Create product
        const name = `[MEAL] ${recipe.name}`;
        const result = await db.query(`
            INSERT INTO products (name, description, is_meal_product, calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving, location_id, qu_id_stock)
            VALUES ($1, $2, TRUE, $3, $4, $5, $6, 1, 1)
            RETURNING id
        `, [
            name,
            `Auto-generated for recipe: ${recipe.name}`,
            recipe.calories || 0,
            recipe.carbs || 0,
            recipe.protein || 0,
            recipe.fat || 0
        ]);

        const newProductId = result.rows[0].id;

        // Link back
        await db.query('UPDATE recipes SET product_id = $1 WHERE id = $2', [newProductId, recipe.id]);
        created++;
    }
    console.log(`[Automation] Created ${created} meal products.`);
}
