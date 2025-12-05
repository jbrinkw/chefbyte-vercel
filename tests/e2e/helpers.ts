import { Page, APIRequestContext, expect } from '@playwright/test';

export interface SeedData {
    products: any[];
    recipes: any[];
    stock: any[];
}

const SUPABASE_URL =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    'http://localhost:54321';

const SUPABASE_ANON_KEY =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

function requireSupabaseConfig() {
    if (!SUPABASE_URL) {
        throw new Error('SUPABASE_URL / VITE_SUPABASE_URL is not set for tests');
    }
    if (!SUPABASE_ANON_KEY) {
        throw new Error('SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY is not set for tests');
    }
}

export async function getAuthHeaders(page: Page) {
    requireSupabaseConfig();

    // Get the session from local storage
    const localStorage = await page.evaluate(() => window.localStorage);

    // Find the supabase auth key
    const authKey = Object.keys(localStorage).find(key => key.includes('auth-token'));

    if (!authKey) {
        throw new Error('No Supabase auth token found in local storage');
    }

    const session = JSON.parse(localStorage[authKey]);
    const token = session.access_token;

    // We also need the URL and Anon Key. 
    // Since we are running in the browser context, we might not have access to process.env directly if not configured.
    // But we can extract them from the app if they are globally available, or we can assume standard Vite env vars are loaded in the test runner.
    // For now, let's try to get them from the browser if possible, or fall back to process.env.

    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        userId: session.user.id
    };
}

export async function seedTestAccount(page: Page, request: APIRequestContext) {
    requireSupabaseConfig();
    const { headers: authHeaders, userId } = await getAuthHeaders(page);
    console.log('DEBUG: seedTestAccount URL:', SUPABASE_URL);

    const requestHeaders = {
        ...authHeaders,
        apikey: SUPABASE_ANON_KEY,
    };

    // 0. Get Quantity Units
    const quRes = await request.get(`${SUPABASE_URL}/rest/v1/quantity_units?select=*`, {
        headers: requestHeaders
    });
    const quantityUnits = await quRes.json();
    const getQuId = (name: string) => quantityUnits.find((q: any) => q.name === name || q.name_plural === name)?.id;

    // 1. Create Products
    const products = [
        { name: 'Milk', min_stock_amount: 1, num_servings: 4, unit: 'carton', barcode: '111111' },
        { name: 'Eggs', min_stock_amount: 1, num_servings: 12, unit: 'carton', barcode: '222222' },
        { name: 'Bread', min_stock_amount: 1, num_servings: 20, unit: 'loaf', barcode: '333333' },
        { name: 'Cheese', min_stock_amount: 1, num_servings: 10, unit: 'block', barcode: '444444' },
        { name: 'Butter', min_stock_amount: 1, num_servings: 30, unit: 'stick', barcode: '555555' }
    ];

    const createdProducts: any[] = [];

    for (const p of products) {
        const quId = getQuId(p.unit);
        const productData = {
            user_id: userId,
            name: p.name,
            barcode: p.barcode,
            min_stock_amount: p.min_stock_amount,
            num_servings: p.num_servings,
            qu_id_stock: quId,
            qu_id_purchase: quId,
            qu_id_consume: quId
        };

        const res = await request.post(`${SUPABASE_URL}/rest/v1/products`, {
            headers: requestHeaders,
            data: productData
        });

        if (!res.ok()) {
            console.log(`Failed to create product ${p.name}:`, res.status(), res.statusText());
            console.log('Response:', await res.text());
        }

        if (res.ok()) {
            const [data] = await res.json();
            createdProducts.push(data);
        } else {
            // Try to fetch existing
            const existing = await request.get(`${SUPABASE_URL}/rest/v1/products?barcode=eq.${p.barcode}&select=*`, {
                headers: requestHeaders
            });
            if (existing.ok()) {
                const json = await existing.json();
                if (json.length > 0) {
                    console.log(`Product ${p.name} already exists, using existing.`);
                    createdProducts.push(json[0]);
                }
            }
        }
    }

    const [milk, eggs, bread, cheese, butter] = createdProducts;

    // 2. Create Recipe: Grilled Cheese
    const recipeData = {
        user_id: userId,
        name: 'Grilled Cheese',
        base_servings: 1,
        active_time: 10,
        total_time: 15
    };

    const recipeRes = await request.post(`${supabaseUrl}/rest/v1/recipes`, {
        headers: requestHeaders,
        data: recipeData
    });
    expect(recipeRes.ok()).toBeTruthy();
    const [recipe] = await recipeRes.json();

    // 3. Add Ingredients to Recipe
    const ingredients = [
        { recipe_id: recipe.id, product_id: bread.id, amount: 2, unit: 'slice' },
        { recipe_id: recipe.id, product_id: cheese.id, amount: 2, unit: 'slice' },
        { recipe_id: recipe.id, product_id: butter.id, amount: 1, unit: 'tbsp' }
    ];

    const ingredientsWithIds = ingredients.map(ing => ({
        user_id: userId,
        recipe_id: ing.recipe_id,
        product_id: ing.product_id,
        amount: ing.amount,
        qu_id: getQuId(ing.unit)
    }));

    const ingRes = await request.post(`${supabaseUrl}/rest/v1/recipe_ingredients`, {
        headers: requestHeaders,
        data: ingredientsWithIds
    });
    expect(ingRes.ok()).toBeTruthy();

    // 4. Add Stock (Only Milk has stock)
    const stockData = {
        user_id: userId,
        product_id: milk.id,
        amount: 1,
        best_before_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
    };

    const stockRes = await request.post(`${supabaseUrl}/rest/v1/stock`, {
        headers: requestHeaders,
        data: stockData
    });
    expect(stockRes.ok()).toBeTruthy();

    return {
        products: createdProducts,
        recipe,
        stock: [stockData]
    };
}
