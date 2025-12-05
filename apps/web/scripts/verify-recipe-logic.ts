
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const email = `test_recipe_${Date.now()}@chefbyte.com`;
    const password = 'password123';

    console.log(`Creating user: ${email}`);

    // 1. Sign Up
    const { data: auth, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        console.error('Signup failed:', authError);
        process.exit(1);
    }

    const userId = auth.user?.id;
    if (!userId) {
        console.error('No user ID returned');
        process.exit(1);
    }
    console.log(`User created: ${userId}`);

    // 2. Create Products
    // P1: Full Stock (Needs 1, Has 10) -> Should NOT buy
    // P2: Partial Stock (Needs 0.2, Has 0.5) -> Should NOT buy
    // P3: Empty Stock (Needs 1, Has 0) -> Should BUY

    const products = [
        { name: 'P_Full', num_servings: 10 },
        { name: 'P_Partial', num_servings: 10 },
        { name: 'P_Empty', num_servings: 10 }
    ];

    const createdProducts: any[] = [];

    for (const p of products) {
        const { data, error } = await supabase.from('products').insert({
            user_id: userId,
            name: p.name,
            num_servings: p.num_servings,
            is_placeholder: false
        }).select().single();

        if (error) throw error;
        createdProducts.push(data);
    }

    const [pFull, pPartial, pEmpty] = createdProducts;
    console.log('Products created');

    // 3. Add Stock
    // P_Full: 10 units
    await supabase.from('stock').insert({
        user_id: userId,
        product_id: pFull.id,
        amount: 10
    });

    // P_Partial: 0.5 units
    await supabase.from('stock').insert({
        user_id: userId,
        product_id: pPartial.id,
        amount: 0.5
    });

    // P_Empty: 0 units (no entry)

    console.log('Stock added');

    // 4. Create Recipe
    const { data: recipe, error: recipeError } = await supabase.from('recipes').insert({
        user_id: userId,
        name: 'Mixed Stock Recipe',
        base_servings: 1
    }).select().single();

    if (recipeError) throw recipeError;

    // 5. Add Ingredients to Recipe
    // P_Full: 1 serving (0.1 units if num_servings is 10? No, recipe ingredients are usually in absolute units or scaled?)
    // Let's check api-supabase.ts logic.
    // Logic: requirements[pid] += (ing.amount * scale)
    // ing.amount is usually in "units" (containers) if not specified otherwise? 
    // Wait, usually recipes are in grams/oz etc. But here we are simplifying.
    // If I put amount=1 in recipe_ingredients, and syncMealPlanToCart compares it to stock.amount.
    // stock.amount is usually containers.

    // Let's assume for this test:
    // P_Full: Recipe needs 1 unit. Stock has 10. -> OK.
    // P_Partial: Recipe needs 0.2 units. Stock has 0.5. -> OK.
    // P_Empty: Recipe needs 1 unit. Stock has 0. -> BUY.

    const ingredients = [
        { recipe_id: recipe.id, product_id: pFull.id, amount: 1 },
        { recipe_id: recipe.id, product_id: pPartial.id, amount: 0.2 },
        { recipe_id: recipe.id, product_id: pEmpty.id, amount: 1 }
    ];

    for (const ing of ingredients) {
        await supabase.from('recipe_ingredients').insert({
            user_id: userId,
            ...ing
        });
    }
    console.log('Recipe created');

    // 6. Add to Meal Plan
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('meal_plan').insert({
        user_id: userId,
        day: today,
        type: 'recipe',
        recipe_id: recipe.id,
        amount: 1 // 1 serving of the recipe
    });
    console.log('Added to Meal Plan');

    // 7. Run syncMealPlanToCart logic (Re-implementing locally to verify logic or calling API?)
    // Since we can't easily call the browser-side API code from node without mocking everything,
    // I will copy the logic from api-supabase.ts `syncMealPlanToCart` here to verify it works AS WRITTEN.
    // This confirms the LOGIC is correct.

    console.log('Running Sync Logic...');

    // --- LOGIC START ---
    const { data: mealPlan } = await supabase
        .from('meal_plan')
        .select('*, products(*), recipes(*, recipe_ingredients(*, products(*)))')
        .eq('user_id', userId)
        .eq('day', today);

    const requirements: Record<number, number> = {};

    for (const entry of mealPlan || []) {
        if (entry.done) continue;
        if (entry.is_meal_prep) continue;

        if (entry.type === 'recipe' && entry.recipes) {
            const recipe = entry.recipes;
            const scale = (entry.amount || 1) / (recipe.base_servings || 1);

            for (const ing of recipe.recipe_ingredients || []) {
                if (ing.product_id) {
                    requirements[ing.product_id] = (requirements[ing.product_id] || 0) + (ing.amount * scale);
                }
            }
        }
    }

    console.log('Requirements:', requirements);

    const shoppingList: any[] = [];

    for (const [pidStr, needed] of Object.entries(requirements)) {
        const pid = parseInt(pidStr);

        const { data: stock } = await supabase
            .from('stock')
            .select('amount')
            .eq('product_id', pid)
            .single(); // Note: The original code uses .single(), which might fail for empty stock! 
        // Wait, my fix for importShoppingList was .limit(1). 
        // syncMealPlanToCart might ALSO need that fix if it uses .single().
        // Let's see if it fails here.

        const currentStock = stock?.amount || 0;

        // Check cart
        const { data: cart } = await supabase
            .from('shopping_list')
            .select('amount')
            .eq('product_id', pid)
            .eq('done', false);

        const currentCart = cart?.reduce((sum, item) => sum + item.amount, 0) || 0;

        const shortfall = Math.max(0, needed - currentStock);

        console.log(`Product ${pid}: Needed=${needed}, Stock=${currentStock}, Cart=${currentCart}, Shortfall=${shortfall}`);

        if (shortfall > 0) {
            const targetCart = Math.ceil(shortfall);
            const toAdd = Math.max(0, targetCart - currentCart);
            if (toAdd > 0) {
                shoppingList.push({ product_id: pid, amount: toAdd });
            }
        }
    }
    // --- LOGIC END ---

    console.log('Shopping List to Add:', shoppingList);

    // 8. Assertions
    const addedIds = shoppingList.map(i => i.product_id);

    // P_Full (10 > 1) -> Should NOT be in list
    if (addedIds.includes(pFull.id)) {
        console.error('FAIL: P_Full was added to list but should not be.');
    } else {
        console.log('PASS: P_Full correctly ignored.');
    }

    // P_Partial (0.5 > 0.2) -> Should NOT be in list
    if (addedIds.includes(pPartial.id)) {
        console.error('FAIL: P_Partial was added to list but should not be.');
    } else {
        console.log('PASS: P_Partial correctly ignored.');
    }

    // P_Empty (0 < 1) -> Should be in list
    if (addedIds.includes(pEmpty.id)) {
        console.log('PASS: P_Empty correctly added.');
    } else {
        console.error('FAIL: P_Empty was NOT added to list.');
    }

    // Cleanup
    // await supabase.auth.admin.deleteUser(userId); // Requires service role key usually
}

main().catch(console.error);
