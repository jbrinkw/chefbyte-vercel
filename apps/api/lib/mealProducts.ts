/**
 * Meal Products Utilities
 * Automatically creates/updates [MEAL] products from recipes
 */

import { db } from './db';

interface MealProductResult {
    created: number;
    updated: number;
    productIds: number[];
}

/**
 * Sync meal products for a recipe
 * Creates [MEAL] products for each serving of a recipe
 * @param recipeId - ID of the recipe
 * @param userId - User ID for the products
 * @returns Result with counts and product IDs
 */
export async function syncMealProducts(recipeId: number, userId?: number): Promise<MealProductResult | null> {
    try {
        // Get recipe details (including user_id)
        const recipe = await db.get(`
            SELECT id, user_id, name, base_servings, calories, carbs, protein, fat
            FROM recipes
            WHERE id = $1
        `, [recipeId]) as any;

        if (!recipe) {
            console.warn(`Recipe ${recipeId}: Not found`);
            return null;
        }

        // Skip if no macro data
        if (!recipe.calories && !recipe.carbs && !recipe.protein && !recipe.fat) {
            console.log(`Recipe ${recipeId}: No macro data, skipping meal product creation`);
            return null;
        }

        const baseServings = parseInt(recipe.base_servings) || 1;
        const recipeName = recipe.name;
        let effectiveUserId = userId || recipe.user_id;

        // Fallback: get first user if no user_id available
        if (!effectiveUserId) {
            const firstUser = await db.get('SELECT id FROM users LIMIT 1') as any;
            effectiveUserId = firstUser?.id || 1;
        }

        // Calculate per-serving macros
        const caloriesPerServing = Math.round((recipe.calories || 0) / baseServings);
        const carbsPerServing = Math.round(((recipe.carbs || 0) / baseServings) * 100) / 100;
        const proteinPerServing = Math.round(((recipe.protein || 0) / baseServings) * 100) / 100;
        const fatPerServing = Math.round(((recipe.fat || 0) / baseServings) * 100) / 100;

        // Get default location and serving unit
        const defaultLocation = await db.get('SELECT id FROM locations WHERE name ILIKE $1 LIMIT 1', ['%fridge%']) as any;
        const locationId = defaultLocation?.id || 1;

        const servingUnit = await db.get('SELECT id FROM quantity_units WHERE name ILIKE $1 LIMIT 1', ['%serving%']) as any;
        const servingQuId = servingUnit?.id || 1;

        let created = 0;
        let updated = 0;
        const productIds: number[] = [];

        // Create/update meal products
        for (let i = 1; i <= baseServings; i++) {
            const productName = baseServings === 1
                ? `[MEAL] ${recipeName}`
                : `[MEAL] ${recipeName} (${i})`;

            // Check if product exists
            const existing = await db.get('SELECT id FROM products WHERE name = $1', [productName]) as any;

            let productId: number;

            if (existing) {
                // Update existing product
                productId = existing.id;
                await db.query(`
                    UPDATE products 
                    SET calories_per_serving = $1, 
                        carbs_per_serving = $2, 
                        protein_per_serving = $3, 
                        fat_per_serving = $4,
                        num_servings = 1,
                        is_meal_product = TRUE,
                        location_id = $5,
                        qu_id_stock = $6,
                        qu_id_purchase = $7,
                        qu_id_consume = $8
                    WHERE id = $9
                `, [
                    caloriesPerServing,
                    carbsPerServing,
                    proteinPerServing,
                    fatPerServing,
                    locationId,
                    servingQuId,
                    servingQuId,
                    servingQuId,
                    productId
                ]);
                updated++;
            } else {
                // Create new product
                const result = await db.query(`
                    INSERT INTO products (
                        user_id, name, description, location_id,
                        qu_id_stock, qu_id_purchase, qu_id_consume,
                        calories_per_serving, carbs_per_serving, protein_per_serving, fat_per_serving,
                        num_servings, is_meal_product, default_best_before_days
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    RETURNING id
                `, [
                    effectiveUserId,
                    productName,
                    `Meal product auto-generated from recipe: ${recipeName}`,
                    locationId,
                    servingQuId,
                    servingQuId,
                    servingQuId,
                    caloriesPerServing,
                    carbsPerServing,
                    proteinPerServing,
                    fatPerServing,
                    1, // num_servings always 1 for meal products
                    true, // is_meal_product
                    7  // default_best_before_days
                ]);
                productId = result.rows[0].id;
                created++;
            }

            productIds.push(productId);
        }

        // Link recipe to first meal product
        if (productIds.length > 0) {
            await db.query('UPDATE recipes SET product_id = $1 WHERE id = $2', [productIds[0], recipeId]);
        }

        console.log(`Recipe ${recipeId} (${recipeName}): Synced ${baseServings} meal product(s) - ${created} created, ${updated} updated`);

        return { created, updated, productIds };
    } catch (error) {
        console.error(`Error syncing meal products for recipe ${recipeId}:`, error);
        return null;
    }
}
