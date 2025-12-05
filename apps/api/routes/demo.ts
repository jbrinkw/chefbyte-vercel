
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Path to demo seed data
const SEED_FILE = path.join(__dirname, '..', 'seed', 'demo_data.json');

// Create authenticated supabase client from request
function getAuthenticatedClient(req: express.Request) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const token = req.headers.authorization?.split(' ')[1];

    return createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
    });
}

router.post('/reset', async (req, res): Promise<void> => {
    try {
        const userId = (req as any).userId;
        if (!userId) {
            console.error('[Demo] No userId found in request');
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        // Create authenticated client for this request
        const supabase = getAuthenticatedClient(req);

        console.log(`[Demo] Resetting data for user ${userId}...`);

        // 1. Clear existing data
        await supabase.from('stock').delete().eq('user_id', userId);
        await supabase.from('meal_plan').delete().eq('user_id', userId);
        await supabase.from('shopping_list').delete().eq('user_id', userId);
        await supabase.from('recipe_ingredients').delete().eq('user_id', userId);
        await supabase.from('recipes').delete().eq('user_id', userId);
        await supabase.from('products').delete().eq('user_id', userId);
        await supabase.from('locations').delete().eq('user_id', userId);
        await supabase.from('quantity_units').delete().eq('user_id', userId);

        // 2. Load Seed Data
        if (!fs.existsSync(SEED_FILE)) {
            console.error('[Demo] Seed file not found:', SEED_FILE);
            res.status(500).json({ error: 'Seed data missing' });
            return;
        }
        const demoData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
        console.log(`[Demo] Loaded ${demoData.products.length} products, ${demoData.recipes.length} recipes`);

        // 3. Insert Locations
        const locMap = new Map<number, number>();
        for (const loc of demoData.locations) {
            const { data, error } = await supabase.from('locations').insert({
                user_id: userId,
                name: loc.name
            }).select('id').single();

            if (error) throw new Error(`Failed to insert location ${loc.name}: ${error.message}`);
            locMap.set(loc.legacy_id, data.id);
        }

        // 4. Insert Units
        const quMap = new Map<number, number>();
        for (const qu of demoData.units) {
            const { data, error } = await supabase.from('quantity_units').insert({
                user_id: userId,
                name: qu.name,
                name_plural: qu.name_plural
            }).select('id').single();

            if (error) throw new Error(`Failed to insert unit ${qu.name}: ${error.message}`);
            quMap.set(qu.legacy_id, data.id);
        }

        // 5. Insert Products
        const prodMap = new Map<number, number>();
        const newProducts: any[] = [];
        for (const prod of demoData.products) {
            const { data, error } = await supabase.from('products').insert({
                user_id: userId,
                name: prod.name,
                description: prod.description,
                location_id: locMap.get(prod.location_id) || null,
                qu_id_stock: quMap.get(prod.qu_id_stock) || null,
                qu_id_purchase: quMap.get(prod.qu_id_purchase) || null,
                qu_id_consume: quMap.get(prod.qu_id_consume) || null,
                qu_id_price: quMap.get(prod.qu_id_price) || null,
                min_stock_amount: prod.min_stock_amount,
                default_best_before_days: prod.default_best_before_days,
                calories_per_serving: prod.calories_per_serving,
                carbs_per_serving: prod.carbs_per_serving,
                protein_per_serving: prod.protein_per_serving,
                fat_per_serving: prod.fat_per_serving,
                num_servings: prod.num_servings,
                walmart_link: prod.walmart_link,
                is_walmart: prod.is_walmart,
                is_placeholder: prod.is_placeholder,
                price: prod.price
            }).select('id').single();

            if (error) {
                console.error(`Failed to insert product ${prod.name}:`, error.message);
                continue;
            }
            prodMap.set(prod.legacy_id, data.id);
            newProducts.push({ ...prod, id: data.id });
        }

        // 6. Insert Recipes
        const recipeMap = new Map<number, number>();
        const newRecipes: any[] = [];
        for (const rec of demoData.recipes) {
            const { data, error } = await supabase.from('recipes').insert({
                user_id: userId,
                name: rec.name,
                description: rec.description,
                base_servings: rec.base_servings,
                total_time: rec.total_time,
                active_time: rec.active_time,
                calories: rec.calories,
                carbs: rec.carbs,
                protein: rec.protein,
                fat: rec.fat
            }).select('id').single();

            if (error) {
                console.error(`Failed to insert recipe ${rec.name}:`, error.message);
                continue;
            }
            recipeMap.set(rec.legacy_id, data.id);
            newRecipes.push({ ...rec, id: data.id });
        }

        // 7. Insert Ingredients
        const ingredientsToInsert = [];
        for (const ing of demoData.ingredients) {
            const newRecipeId = recipeMap.get(ing.legacy_recipe_id);
            const newProductId = prodMap.get(ing.legacy_product_id);
            const newQuId = quMap.get(ing.qu_id);

            if (newRecipeId && newProductId) {
                ingredientsToInsert.push({
                    user_id: userId,
                    recipe_id: newRecipeId,
                    product_id: newProductId,
                    amount: ing.amount,
                    qu_id: newQuId || null,
                    note: ing.note
                });
            }
        }
        if (ingredientsToInsert.length > 0) {
            const { error } = await supabase.from('recipe_ingredients').insert(ingredientsToInsert);
            if (error) console.error('Failed to insert ingredients:', error.message);
        }

        // 8. Generate Stock
        const stockToInsert = [];
        for (const prod of newProducts) {
            if (prod.min_stock_amount > 0 || Math.random() < 0.3) {
                const amount = Math.floor(Math.random() * 5) + 1;
                stockToInsert.push({
                    user_id: userId,
                    product_id: prod.id,
                    amount: amount,
                    location_id: locMap.get(prod.location_id) || null
                });
            }
        }
        if (stockToInsert.length > 0) {
            const { error } = await supabase.from('stock').insert(stockToInsert);
            if (error) console.error('Failed to insert stock:', error.message);
        }

        // 9. Generate Meal Plan
        const mealPlanToInsert = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayStr = date.toISOString().split('T')[0];

            for (let j = 0; j < 3; j++) {
                if (newRecipes.length > 0) {
                    const randomRecipe = newRecipes[Math.floor(Math.random() * newRecipes.length)];
                    mealPlanToInsert.push({
                        user_id: userId,
                        day: dayStr,
                        type: 'recipe',
                        recipe_id: randomRecipe.id,
                        amount: 1,
                        done: false,
                        is_meal_prep: false
                    });
                }
            }
        }
        if (mealPlanToInsert.length > 0) {
            const { error } = await supabase.from('meal_plan').insert(mealPlanToInsert);
            if (error) console.error('Failed to insert meal plan:', error.message);
        }

        console.log('[Demo] Reset complete!');
        res.json({ success: true });

    } catch (error: any) {
        console.error('[Demo] Reset failed:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
