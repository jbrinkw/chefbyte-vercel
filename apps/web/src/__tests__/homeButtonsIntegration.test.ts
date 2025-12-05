
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try to load .env from CWD (apps/web)
config({ path: path.resolve(process.cwd(), '.env') });

// Unmock supabase for integration test
vi.unmock('../lib/supabase');

import { apiSupabase } from '../lib/api-supabase';
import { supabase } from '../lib/supabase';

// Try to load .env from CWD (apps/web)
config({ path: path.resolve(process.cwd(), '.env') });

// Skip if not running against local backend
const isLocal = true; // Assume local for now

describe.skipIf(!isLocal)('Home Page Buttons Integration', () => {
    let userId: string;
    const timestamp = Date.now();
    const email = `test_buttons_${timestamp}@example.com`;
    const password = 'password123';

    const productIds: number[] = [];
    let recipeId: number;
    let _mealPlanId: number;

    beforeAll(async () => {
        console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
        try {
            // 1. Sign up/Sign in
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) {
                fs.writeFileSync('test_error.log', `SignUp Error: ${JSON.stringify(error)}`);
                throw error;
            }
            if (!data.user) throw new Error('No user created');
            userId = data.user.id;
        } catch (e: any) {
            fs.writeFileSync('test_error.log', `Setup failed: ${e.message}\nStack: ${e.stack}`);
            throw e;
        }
    });

    afterAll(async () => {
        // Cleanup
        if (userId) {
            // Optional cleanup
        }
    });

    it('Full Flow: Create Data -> Sync Cart -> Get Links -> Import', async () => {
        // 1. Create Products with Walmart Links
        const products = [
            {
                name: `Test Eggs ${timestamp}`,
                walmart_link: 'https://www.walmart.com/ip/Great-Value-Large-White-Eggs-12-Count/145051970',
                is_placeholder: false,
                num_servings: 12,
                calories_per_serving: 70
            },
            {
                name: `Test Milk ${timestamp}`,
                walmart_link: 'https://www.walmart.com/ip/Great-Value-Whole-Vitamin-D-Milk-Gallon-Plastic-Jug-128-fl-oz/351865186',
                is_placeholder: false,
                num_servings: 16,
                calories_per_serving: 150
            },
            {
                name: `Test Bread ${timestamp}`,
                walmart_link: 'https://www.walmart.com/ip/Great-Value-White-Sandwich-Bread-20-oz/10315447',
                is_placeholder: false,
                num_servings: 20,
                calories_per_serving: 80
            }
        ];

        for (const p of products) {
            const res = await apiSupabase.createProduct(p);
            expect(res).toBeDefined();
            productIds.push(res.id);
        }

        // 2. Create Recipe
        const recipeRes = await supabase.from('recipes').insert({
            user_id: userId,
            name: `French Toast ${timestamp}`,
            base_servings: 4
        }).select().single();
        if (recipeRes.error) throw recipeRes.error;
        recipeId = recipeRes.data.id;

        // Add ingredients
        await supabase.from('recipe_ingredients').insert([
            { user_id: userId, recipe_id: recipeId, product_id: productIds[0], amount: 4 }, // 4 eggs
            { user_id: userId, recipe_id: recipeId, product_id: productIds[1], amount: 2 }, // 2 cups milk (approx)
            { user_id: userId, recipe_id: recipeId, product_id: productIds[2], amount: 8 }  // 8 slices bread
        ]);

        // 3. Add to Meal Plan (Tomorrow)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayStr = tomorrow.toISOString().split('T')[0];

        const mpRes = await supabase.from('meal_plan').insert({
            user_id: userId,
            day: dayStr,
            type: 'recipe',
            recipe_id: recipeId,
            amount: 4, // 4 servings (1 batch)
            done: false
        }).select().single();
        if (mpRes.error) throw mpRes.error;
        mealPlanId = mpRes.data.id;

        // 4. Test syncMealPlanToCart
        // Ensure stock is 0 (new user, so yes)
        const syncRes = await apiSupabase.syncMealPlanToCart(7);
        expect(syncRes.added).toBeGreaterThan(0);

        // Verify Shopping List
        const { data: cartItems } = await supabase.from('shopping_list').select('*').eq('done', false);
        expect(cartItems).toBeDefined();
        expect(cartItems?.length).toBe(3); // Eggs, Milk, Bread

        // 5. Test getShoppingListForCart
        const links = await apiSupabase.getShoppingListForCart();
        expect(links).toBeDefined();
        expect(links?.length).toBe(3);
        const eggItem = links?.find(i => i.products?.name.includes('Eggs'));
        expect(eggItem?.products?.walmart_link).toContain('145051970');

        // 6. Test importShoppingList
        const importRes = await apiSupabase.importShoppingList();
        expect(importRes.imported).toBe(3);

        // Verify Stock
        const { data: stock } = await supabase.from('stock').select('*');
        expect(stock?.length).toBe(3);

        // Verify Shopping List Empty
        const { data: remainingCart } = await supabase.from('shopping_list').select('*').eq('done', false);
        expect(remainingCart?.length).toBe(0);
    });
});
