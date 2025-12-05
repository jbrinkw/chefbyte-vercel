/**
 * Recipe Macros Utilities
 * Automatically recalculates recipe nutrition totals from ingredients
 */

import { db } from './db';

interface RecipeMacros {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
}

/**
 * Recalculate recipe macros from ingredients
 * @param recipeId - ID of the recipe to recalculate
 * @returns Updated macros or null if error
 */
export async function recalculateRecipeMacros(recipeId: number): Promise<RecipeMacros | null> {
    try {
        // Get recipe details
        const recipe = await db.get('SELECT id, name, base_servings FROM recipes WHERE id = $1', [recipeId]) as any;
        if (!recipe || !recipe.base_servings || recipe.base_servings <= 0) {
            console.warn(`Recipe ${recipeId}: Invalid or missing base_servings`);
            return null;
        }

        // Get ingredients
        const ingredients = await db.all(`
            SELECT 
                ri.product_id,
                ri.amount,
                ri.qu_id,
                p.calories_per_serving,
                p.carbs_per_serving,
                p.protein_per_serving,
                p.fat_per_serving,
                p.num_servings,
                qu.name as unit_name
            FROM recipe_ingredients ri
            LEFT JOIN products p ON ri.product_id = p.id
            LEFT JOIN quantity_units qu ON ri.qu_id = qu.id
            WHERE ri.recipe_id = $1
        `, [recipeId]) as any[];

        let totalCalories = 0;
        let totalCarbs = 0;
        let totalProtein = 0;
        let totalFat = 0;

        // Calculate totals from ingredients
        for (const ing of ingredients) {
            const amount = parseFloat(ing.amount) || 0;
            const caloriesPerServing = parseFloat(ing.calories_per_serving) || 0;
            const carbsPerServing = parseFloat(ing.carbs_per_serving) || 0;
            const proteinPerServing = parseFloat(ing.protein_per_serving) || 0;
            const fatPerServing = parseFloat(ing.fat_per_serving) || 0;
            const numServings = parseFloat(ing.num_servings) || 1;

            if (amount <= 0) continue;

            // Determine multiplier based on unit
            const unitName = (ing.unit_name || '').toLowerCase();
            let servingsMultiplier = amount;

            if (unitName.includes('container') || unitName.includes('pack')) {
                // Container unit: multiply by num_servings
                servingsMultiplier = amount * numServings;
            }
            // else: Serving unit, use amount directly

            totalCalories += caloriesPerServing * servingsMultiplier;
            totalCarbs += carbsPerServing * servingsMultiplier;
            totalProtein += proteinPerServing * servingsMultiplier;
            totalFat += fatPerServing * servingsMultiplier;
        }

        // Divide by base_servings to get per-serving values
        const baseServings = parseFloat(recipe.base_servings);
        const perServingMacros: RecipeMacros = {
            calories: Math.round(totalCalories / baseServings),
            carbs: Math.round((totalCarbs / baseServings) * 100) / 100,
            protein: Math.round((totalProtein / baseServings) * 100) / 100,
            fat: Math.round((totalFat / baseServings) * 100) / 100
        };

        // Update recipe
        await db.query(`
            UPDATE recipes 
            SET calories = $1, carbs = $2, protein = $3, fat = $4
            WHERE id = $5
        `, [
            perServingMacros.calories,
            perServingMacros.carbs,
            perServingMacros.protein,
            perServingMacros.fat,
            recipeId
        ]);

        console.log(`Recipe ${recipeId} (${recipe.name}): Updated macros -`, perServingMacros);
        return perServingMacros;
    } catch (error) {
        console.error(`Error recalculating macros for recipe ${recipeId}:`, error);
        return null;
    }
}

/**
 * Recalculate recipe macros and sync meal products
 * @param recipeId - ID of the recipe
 */
export async function updateRecipeWithMacros(recipeId: number): Promise<void> {
    const macros = await recalculateRecipeMacros(recipeId);
    if (macros) {
        // Also import and sync meal products
        const { syncMealProducts } = await import('./mealProducts');
        await syncMealProducts(recipeId);
    }
}
