
import fs from 'fs';
import path from 'path';

const SEED_DIR = path.join(__dirname, '../seed');
const MASTER_DATA_PATH = path.join(SEED_DIR, 'master_data.json');
const OUTPUT_PATH = path.join(SEED_DIR, 'demo_data.json');

console.log(`Reading master data from ${MASTER_DATA_PATH}...`);
const rawData = fs.readFileSync(MASTER_DATA_PATH, 'utf-8');
const data = JSON.parse(rawData);

// 1. Locations
console.log('Processing Locations...');
const locations = data.locations.map((loc: any) => ({
    legacy_id: loc.id,
    name: loc.name,
    is_freezer: loc.is_freezer === 1
}));

// 2. Quantity Units
console.log('Processing Quantity Units...');
const units = data.quantity_units.map((qu: any) => ({
    legacy_id: qu.id,
    name: qu.name,
    name_plural: qu.name_plural
}));

// 3. Products
console.log('Processing Products...');
const products = data.products.map((prod: any) => {
    const userfields = data.products_userfield_values[prod.id] || {};

    return {
        legacy_id: prod.id,
        name: prod.name,
        description: prod.description,
        location_id: prod.location_id, // Legacy ID, needs mapping
        qu_id_stock: prod.qu_id_stock, // Legacy ID, needs mapping
        qu_id_purchase: prod.qu_id_purchase,
        qu_id_consume: prod.qu_id_consume,
        qu_id_price: prod.qu_id_price,
        min_stock_amount: prod.min_stock_amount,
        default_best_before_days: prod.default_best_before_days,
        calories_per_serving: parseFloat(userfields.Calories_Per_Serving || '0'),
        carbs_per_serving: parseFloat(userfields.Carbs || '0'),
        protein_per_serving: parseFloat(userfields.Protein || '0'),
        fat_per_serving: parseFloat(userfields.Fats || '0'),
        num_servings: parseFloat(userfields.num_servings || '1'),
        walmart_link: userfields.walmart_link || null,
        is_walmart: userfields.not_walmart !== '1', // "1" means NOT walmart, so !== '1' means IS walmart (or null means walmart default?) - Logic check: if not_walmart is '1', then is_walmart is false.
        is_placeholder: userfields.placeholder === '1',
        price: prod.price || parseFloat(userfields.price || '0')
    };
});

// 4. Recipes
console.log('Processing Recipes...');
const recipes = data.recipes.map((rec: any) => {
    const userfields = rec.userfields || {};
    return {
        legacy_id: rec.id,
        name: rec.name,
        description: rec.description,
        base_servings: rec.base_servings,
        total_time: parseFloat(userfields.recipe_total_time || '0'),
        active_time: parseFloat(userfields.recipe_active_time || '0'),
        calories: parseFloat(userfields.recipe_calories || '0'),
        carbs: parseFloat(userfields.recipe_carbs || '0'),
        protein: parseFloat(userfields.recipe_proteins || '0'),
        fat: parseFloat(userfields.recipe_fats || '0')
    };
});

// 5. Ingredients
console.log('Processing Ingredients...');
const validRecipeIds = new Set(recipes.map((r: any) => r.legacy_id));
const validProductIds = new Set(products.map((p: any) => p.legacy_id));

const ingredients = data.recipes_pos
    .filter((ing: any) => validRecipeIds.has(ing.recipe_id) && validProductIds.has(ing.product_id))
    .map((ing: any) => ({
        legacy_recipe_id: ing.recipe_id,
        legacy_product_id: ing.product_id,
        amount: ing.amount,
        qu_id: ing.qu_id, // Legacy ID
        note: ing.note
    }));

console.log(`Filtered ingredients from ${data.recipes_pos.length} to ${ingredients.length}`);

const demoData = {
    locations,
    units,
    products,
    recipes,
    ingredients
};

console.log(`Writing demo data to ${OUTPUT_PATH}...`);
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(demoData, null, 2));
console.log('Done!');
